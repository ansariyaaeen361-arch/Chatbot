const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter'); 
const checkOrigin = require('../middleware/checkOrigin');
const {
  createChat, sendMessage, getMessages, getChat,
  listChats, acceptChat, transferChat, closeChat,
  leaveChat
} = require('../controllers/livechatController');

// Public (widget-facing) — rate limited
router.post('/create/:businessId', checkOrigin, strictLimiter, createChat);
router.post('/:chatId/message', strictLimiter, sendMessage);
router.get('/:chatId/messages', getMessages);
router.get('/:chatId/status', getChat);

// Auth (dashboard-facing)
router.get('/business/:businessId', auth, listChats);
router.post('/:chatId/accept', auth, acceptChat);
router.post('/:chatId/transfer', auth, transferChat);
router.post('/:chatId/close', auth, closeChat);
router.post('/:chatId/leave', leaveChat);
module.exports = router;