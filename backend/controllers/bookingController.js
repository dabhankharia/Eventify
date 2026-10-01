const { eq, desc, and } = require('drizzle-orm');
const { db, schema, isDbConnected } = require('../db');
const { findEventById, updateEventSeats } = require('./eventController');
const { findUserById } = require('./authController');
const notificationService = require('../services/notificationService');
const { bookings, events } = schema;

// In-memory fallback bookings store
const memoryBookings = [];

// POST /api/bookings (Protected - Authenticated Users Only)
async function createBooking(req, res) {
    try {
        const { eventId, ticketTier, quantity, paymentMethod, paymentId } = req.body;

        if (!eventId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Event ID and a valid ticket quantity are required.'
            });
        }

        const event = await findEventById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Target event does not exist.'
            });
        }

        const qty = parseInt(quantity, 10);
        if (event.availableSeats < qty) {
            return res.status(400).json({
                success: false,
                message: `Only ${event.availableSeats} seats remaining for this event.`
            });
        }

        // Deduct seats
        const newAvailableSeats = event.availableSeats - qty;
        await updateEventSeats(event.id, newAvailableSeats);

        // Price Multipliers
        let multiplier = 1.0;
        if (ticketTier === 'VIP Pass') multiplier = 1.6;
        if (ticketTier === 'Early Bird') multiplier = 0.85;

        const pricePerTicket = Math.round(event.price * multiplier);
        const totalPrice = pricePerTicket * qty;

        const isFreeDemo = paymentMethod === 'Free Presentation Demo';
        const finalPaymentId = paymentId || (isFreeDemo ? 'pay_demo_pres_' + Math.floor(100000 + Math.random() * 900000) : 'pay_rzp_' + Math.floor(100000 + Math.random() * 900000));

        const newBooking = {
            id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            ticketCode: 'EVENTIFY-' + Math.floor(100000 + Math.random() * 900000),
            userId: req.user.id,
            eventId: event.id,
            ticketTier: ticketTier || 'General Admission',
            quantity: qty,
            pricePerTicket,
            totalPrice,
            paymentMethod: isFreeDemo ? 'Presentation Mode (Free Demo)' : (paymentMethod || 'Razorpay Gateway'),
            paymentId: finalPaymentId,
            status: 'CONFIRMED',
            bookedAt: new Date()
        };

        if (isDbConnected()) {
            try {
                await db.insert(bookings).values(newBooking);
            } catch (dbErr) {
                console.warn('Could not insert booking to PostgreSQL, caching in memory:', dbErr.message);
                memoryBookings.unshift({
                    ...newBooking,
                    userName: req.user.fullName,
                    userEmail: req.user.email,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventTime: event.time,
                    eventLocation: event.location
                });
            }
        } else {
            memoryBookings.unshift({
                ...newBooking,
                userName: req.user.fullName,
                userEmail: req.user.email,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location
            });
        }

        // Return combined details for immediate frontend rendering (including QR code payload)
        const responseBooking = {
            ...newBooking,
            userName: req.user.fullName,
            userEmail: req.user.email,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location
        };

        // Asynchronously dispatch Email notification
        findUserById(req.user.id).then(userRecord => {
            const recipient = {
                fullName: userRecord?.fullName || req.user.fullName,
                email: userRecord?.email || req.user.email
            };
            return notificationService.sendBookingNotification({
                recipient,
                booking: responseBooking,
                event
            });
        }).catch(notifErr => {
            console.warn('Could not dispatch booking confirmation notification:', notifErr.message);
        });

        return res.status(201).json({
            success: true,
            message: 'Ticket successfully booked on Eventify! Confirmation email sent.',
            booking: responseBooking
        });
    } catch (err) {
        console.error('createBooking error:', err);
        return res.status(500).json({ success: false, message: 'Server error during booking.' });
    }
}

// GET /api/bookings/my (Protected)
async function getUserBookings(req, res) {
    try {
        const userId = req.user.id;

        if (isDbConnected()) {
            try {
                const results = await db.select({
                    id: bookings.id,
                    ticketCode: bookings.ticketCode,
                    userId: bookings.userId,
                    eventId: bookings.eventId,
                    ticketTier: bookings.ticketTier,
                    quantity: bookings.quantity,
                    pricePerTicket: bookings.pricePerTicket,
                    totalPrice: bookings.totalPrice,
                    paymentMethod: bookings.paymentMethod,
                    paymentId: bookings.paymentId,
                    status: bookings.status,
                    bookedAt: bookings.bookedAt,
                    eventTitle: events.title,
                    eventDate: events.date,
                    eventTime: events.time,
                    eventLocation: events.location
                })
                .from(bookings)
                .leftJoin(events, eq(bookings.eventId, events.id))
                .where(eq(bookings.userId, userId))
                .orderBy(desc(bookings.bookedAt));

                const formatted = results.map(b => ({
                    ...b,
                    userName: req.user.fullName,
                    userEmail: req.user.email
                }));

                return res.json({
                    success: true,
                    count: formatted.length,
                    bookings: formatted
                });
            } catch (dbErr) {
                console.warn('DB error in getUserBookings, using cache:', dbErr.message);
            }
        }

        const userBookings = memoryBookings.filter(b => b.userId === userId);
        return res.json({
            success: true,
            count: userBookings.length,
            bookings: userBookings
        });
    } catch (err) {
        console.error('getUserBookings error:', err);
        return res.status(500).json({ success: false, message: 'Error retrieving your bookings.' });
    }
}

// DELETE /api/bookings/:id (Protected)
async function cancelBooking(req, res) {
    try {
        const bookingId = req.params.id;
        const userId = req.user.id;

        let targetBooking = null;

        if (isDbConnected()) {
            try {
                const results = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId))).limit(1);
                if (results.length > 0) {
                    targetBooking = results[0];
                    await db.delete(bookings).where(eq(bookings.id, bookingId));
                }
            } catch (dbErr) {
                console.warn('DB cancelBooking error:', dbErr.message);
            }
        }

        if (!targetBooking) {
            const memIndex = memoryBookings.findIndex(b => b.id === bookingId && b.userId === userId);
            if (memIndex !== -1) {
                targetBooking = memoryBookings.splice(memIndex, 1)[0];
            }
        }

        if (!targetBooking) {
            return res.status(404).json({
                success: false,
                message: 'Booking record not found or you are not authorized to cancel it.'
            });
        }

        // Restore available seats on the event
        const event = await findEventById(targetBooking.eventId);
        if (event) {
            await updateEventSeats(event.id, event.availableSeats + targetBooking.quantity);
        }

        // Asynchronously dispatch Email cancellation notification
        findUserById(req.user.id).then(userRecord => {
            const recipient = {
                fullName: userRecord?.fullName || req.user.fullName,
                email: userRecord?.email || req.user.email
            };
            return notificationService.sendCancellationNotification({
                recipient,
                booking: targetBooking,
                event
            });
        }).catch(notifErr => {
            console.warn('Could not dispatch cancellation notification:', notifErr.message);
        });

        return res.json({
            success: true,
            message: 'Booking cancelled and seats restored to event inventory. Cancellation email sent.'
        });
    } catch (err) {
        console.error('cancelBooking error:', err);
        return res.status(500).json({ success: false, message: 'Error cancelling booking.' });
    }
}

module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking
};
