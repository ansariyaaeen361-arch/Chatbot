const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userMessage: { type: String, required: true },
  aiReply: { type: String, default: '' },
  source: { type: String, enum: ['faq', 'ai', 'greeting', 'limit_reached'], required: true },
  feedback: { type: String, enum: ['up', 'down', null], default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', chatLogSchema);