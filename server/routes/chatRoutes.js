const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimiter');
const checkOrigin = require('../middleware/checkOrigin');

router.post('/:businessId', checkOrigin, chatLimiter, chat);

module.exports = router;