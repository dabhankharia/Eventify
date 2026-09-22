const { events } = require('./eventController');

// In-memory Bookings Data Store
const bookings = [];

// POST /api/bookings (Protected - Authenticated Users Only)
function createBooking(req, res) {
    const { eventId, ticketTier, quantity, paymentMethod, paymentId } = req.body;

    if (!eventId || !quantity || quantity < 1) {
        return res.status(400).json({
            success: false,
            message: 'Event ID and valid ticket quantity are required.'
        });
    }

    const event = events.find(e => e.id === eventId);
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
            message: `Only ${event.availableSeats} seats available for this event.`
        });
    }

    // Deduct seats
    event.availableSeats -= qty;

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
        userName: req.user.fullName,
        userEmail: req.user.email,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        ticketTier: ticketTier || 'General Admission',
        quantity: qty,
        pricePerTicket,
        totalPrice,
        paymentMethod: isFreeDemo ? 'Presentation Mode (Free Demo)' : 'Razorpay Gateway',
        paymentId: finalPaymentId,
        bookedAt: new Date().toISOString(),
        status: 'CONFIRMED'
    };

    bookings.unshift(newBooking);

    return res.status(201).json({
        success: true,
        message: 'Ticket successfully booked on Eventify!',
        booking: newBooking
    });
}

// GET /api/bookings/my (Protected)
function getUserBookings(req, res) {
    const userBookings = bookings.filter(b => b.userId === req.user.id);
    return res.json({
        success: true,
        count: userBookings.length,
        bookings: userBookings
    });
}

// DELETE /api/bookings/:id (Protected)
function cancelBooking(req, res) {
    const bookingIndex = bookings.findIndex(b => b.id === req.params.id && b.userId === req.user.id);

    if (bookingIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Booking record not found or unauthorized.'
        });
    }

    const booking = bookings[bookingIndex];

    // Restore available seats
    const event = events.find(e => e.id === booking.eventId);
    if (event) {
        event.availableSeats += booking.quantity;
    }

    bookings.splice(bookingIndex, 1);

    return res.json({
        success: true,
        message: 'Booking cancelled and seats restored.'
    });
}

module.exports = {
    bookings,
    createBooking,
    getUserBookings,
    cancelBooking
};
