const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email role isVerified');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: 'This email is already in use.' });
      user.email = email;
      user.isVerified = false; // re-verify if email changes
    }

    if (name) user.name = name;

    await user.save();
    res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.userId);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};