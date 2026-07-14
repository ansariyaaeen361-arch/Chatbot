const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { signup, login, verifyEmail, resendVerification } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', auth, resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;