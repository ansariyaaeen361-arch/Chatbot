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

// For auth endpoints (login/signup/forgot-password/reset-password) — brute-force protection
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

// For signup specifically — slows down spinning up unlimited throwaway trial accounts from one IP
exports.signupLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many accounts created from this network today. Please try again tomorrow or contact us.' }
});