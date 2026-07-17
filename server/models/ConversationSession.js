const mongoose = require('mongoose');

const conversationSessionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

conversationSessionSchema.index({ businessId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationSession', conversationSessionSchema);
