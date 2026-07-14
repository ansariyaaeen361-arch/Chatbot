const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userMessage: { type: String, required: true },
  source: { type: String, enum: ['faq', 'ai', 'limit_reached'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', chatLogSchema);