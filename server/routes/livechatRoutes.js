const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const requireSeatCompliance = require('../middleware/requireSeatCompliance');
const optionalAuth = require('../middleware/optionalAuth');
const { strictLimiter } = require('../middleware/rateLimiter');
const checkOrigin = require('../middleware/checkOrigin');
const {
  createChat, sendMessage, getMessages, getChat,
  listChats, acceptChat, transferChat, closeChat,
  leaveChat
} = require('../controllers/livechatController');

// Public (widget-facing) — rate limited
router.post('/create/:businessId', checkOrigin, strictLimiter, createChat);
router.post('/:chatId/message', optionalAuth, strictLimiter, sendMessage);
router.get('/:chatId/messages', auth, requireVerified, requireSeatCompliance, getMessages);
router.get('/:chatId/status', auth, requireVerified, requireSeatCompliance, getChat);

// Auth (dashboard-facing)
router.get('/business/:businessId', auth, requireVerified, requireSeatCompliance, listChats);
router.post('/:chatId/accept', auth, requireVerified, requireSeatCompliance, acceptChat);
router.post('/:chatId/transfer', auth, requireVerified, requireSeatCompliance, transferChat);
router.post('/:chatId/close', auth, requireVerified, requireSeatCompliance, closeChat);
router.post('/:chatId/leave', leaveChat);
module.exports = router;