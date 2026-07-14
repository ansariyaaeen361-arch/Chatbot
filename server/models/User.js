const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'agent'], default: 'owner' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },

  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpiry: { type: Date, default: null },

  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);