const rateLimit = require('express-rate-limit');

// For AI chat — moderate limit (visitors typing normally)
exports.chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many messages, please slow down.' }
});

// For lead capture / live chat creation — stricter (one-time actions)
exports.strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  message: { error: 'Too many requests, please try again shortly.' }
});