const crypto = require('crypto');
const Razorpay = require('razorpay');
const { eq, desc, and } = require('drizzle-orm');
const { db, schema, isDbConnected } = require('../db');
const { findEventById, updateEventSeats } = require('./eventController');
const { findUserById } = require('./authController');
const notificationService = require('../services/notificationService');
const { bookings, events } = schema;

// In-memory fallback bookings store
const memoryBookings = [];

// Initialize Razorpay SDK instance
function getRazorpayInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && !keyId.includes('your_')) {
        return new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });
    }
    return null;
}

// POST /api/bookings/create-order (Protected)
// Creates a real Razorpay Order via SDK
async function createRazorpayOrder(req, res) {
    try {
        const { eventId, ticketTier, quantity } = req.body;

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

        // Price Multipliers
        let multiplier = 1.0;
        if (ticketTier === 'VIP Pass') multiplier = 1.6;
        if (ticketTier === 'Early Bird') multiplier = 0.85;

        const pricePerTicket = Math.round(event.price * multiplier);
        const totalPrice = pricePerTicket * qty;
        const amountInPaise = totalPrice * 100; // Razorpay requires amount in paise (1 INR = 100 paise)

        const rzp = getRazorpayInstance();

        if (rzp) {
            const receiptId = 'rcpt_' + Date.now().toString(36);
            const order = await rzp.orders.create({
                amount: amountInPaise,
                currency: 'INR',
                receipt: receiptId,
                notes: {
                    eventId: event.id,
                    eventTitle: event.title,
                    userId: req.user.id,
                    ticketTier: ticketTier || 'General Admission',
                    quantity: qty
                }
            });

            return res.json({
                success: true,
                isLiveSdk: true,
                keyId: process.env.RAZORPAY_KEY_ID,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                event: {
                    id: event.id,
                    title: event.title,
                    price: pricePerTicket,
                    totalPrice
                },
                user: {
                    name: req.user.fullName,
                    email: req.user.email
                }
            });
        } else {
            // Fallback simulated order when Razorpay test keys are not yet configured in .env
            const mockOrderId = 'order_sim_' + Math.floor(100000 + Math.random() * 900000);
            return res.json({
                success: true,
                isLiveSdk: false,
                keyId: 'rzp_test_simulated_key',
                orderId: mockOrderId,
                amount: amountInPaise,
                currency: 'INR',
                event: {
                    id: event.id,
                    title: event.title,
                    price: pricePerTicket,
                    totalPrice
                },
                user: {
                    name: req.user.fullName,
                    email: req.user.email
                }
            });
        }
    } catch (err) {
        console.error('createRazorpayOrder error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create payment order. ' + (err.error?.description || err.message)
        });
    }
}

// POST /api/bookings/verify-payment (Protected)
// Verifies HMAC SHA-256 signature and confirms ticket booking
async function verifyRazorpayPayment(req, res) {
    try {
        const {
            eventId,
            ticketTier,
            quantity,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentMethod = 'Razorpay Gateway'
        } = req.body;

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        // Verify cryptographic signature if live Razorpay keys are set
        if (keySecret && !keySecret.includes('your_') && razorpay_signature) {
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(body.toString())
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment verification failed. Invalid cryptographic signature.'
                });
            }
        }

        const event = await findEventById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        const qty = parseInt(quantity, 10);
        if (event.availableSeats < qty) {
            return res.status(400).json({
                success: false,
                message: `Seats no longer available (only ${event.availableSeats} remaining).`
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

        const newBooking = {
            id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            ticketCode: 'EVENTIFY-' + Math.floor(100000 + Math.random() * 900000),
            userId: req.user.id,
            eventId: event.id,
            ticketTier: ticketTier || 'General Admission',
            quantity: qty,
            pricePerTicket,
            totalPrice,
            paymentMethod: paymentMethod,
            paymentId: razorpay_payment_id || 'pay_rzp_' + Math.floor(100000 + Math.random() * 900000),
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

        const responseBooking = {
            ...newBooking,
            userName: req.user.fullName,
            userEmail: req.user.email,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location
        };

        // Asynchronously dispatch Email notification with embedded QR Code
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
            message: 'Payment verified and ticket booked successfully! Confirmation email with QR pass sent.',
            booking: responseBooking
        });
    } catch (err) {
        console.error('verifyRazorpayPayment error:', err);
        return res.status(500).json({ success: false, message: 'Payment verification failed.' });
    }
}

// POST /api/bookings (Protected - Direct Booking / Demo Mode)
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
    createRazorpayOrder,
    verifyRazorpayPayment,
    createBooking,
    getUserBookings,
    cancelBooking
};
