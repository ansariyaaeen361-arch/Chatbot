const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authLimiter, signupLimiter } = require('../middleware/rateLimiter');
const { signup, login, verifyEmail, resendVerification } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');

router.post('/signup', authLimiter, signupLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', auth, authLimiter, resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;