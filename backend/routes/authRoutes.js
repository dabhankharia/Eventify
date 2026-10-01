const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verifyRegistration);
router.post('/verify', authController.verifyRegistration);
router.post('/resend-verification', authController.resendVerification);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
