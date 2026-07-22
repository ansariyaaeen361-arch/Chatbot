const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');
const crypto = require('crypto');
const sendEmail = require('../utils/mailer');

exports.signup = async (req, res) => {
  try {
    const { businessName, name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const business = await Business.create({ name: businessName });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashedPassword,
      role: 'owner', businessId: business._id
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}`;
    sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Hi ${user.name},</p><p>Welcome! Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours.</p>`
    }).catch((e) => console.log('Verification email failed during signup:', e.message));
    
    const token = jwt.sign(
      { userId: user._id, businessId: business._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }, businessId: business._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    // If user is not verified, auto-send or resend verification email upon login
    if (!user.isVerified) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}`;
      sendEmail({
        to: user.email,
        subject: 'Verify your email',
        html: `<p>Hi ${user.name},</p><p>You recently logged in. Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours.</p>`
      }).catch((e) => console.log('Verification email failed during login:', e.message));
    }

    const token = jwt.sign(
      { userId: user._id, businessId: user.businessId, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }, businessId: user.businessId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.json({ success: true, alreadyVerified: true });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Hi ${user.name},</p><p>Here's your new verification link:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours.</p>`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending resendVerification email:', err);
    res.status(500).json({ error: err.message || 'Something went wrong sending email' });
  }
};