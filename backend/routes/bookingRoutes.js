const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create-order', authenticateToken, bookingController.createRazorpayOrder);
router.post('/verify-payment', authenticateToken, bookingController.verifyRazorpayPayment);
router.post('/', authenticateToken, bookingController.createBooking);
router.get('/my', authenticateToken, bookingController.getUserBookings);
router.delete('/:id', authenticateToken, bookingController.cancelBooking);

module.exports = router;
