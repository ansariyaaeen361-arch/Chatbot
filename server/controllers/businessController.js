const Business = require('../models/Business');

exports.getProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'website', 'description', 'services', 'targetCustomer', 'tone', 'brandColor', 'ctaLinks'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const business = await Business.findByIdAndUpdate(req.user.businessId, updates, { new: true });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const logoUrl = `/uploads/${req.file.filename}`;
    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { logoUrl },
      { new: true }
    );
    res.json({ logoUrl: business.logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFaqs = async (req, res) => {
  try {
    const { faqs } = req.body;
    if (!Array.isArray(faqs)) return res.status(400).json({ error: 'faqs must be an array' });

    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { faqs },
      { new: true }
    );
    res.json({ faqs: business.faqs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getTeam = async (req, res) => {
  try {
    const User = require('../models/User');
    const team = await User.find({ businessId: req.user.businessId }).select('name email role');
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.inviteTeamMember = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');
    const Business = require('../models/Business');
    const { name, email, password, role } = req.body;

    const currentBusiness = await Business.findById(req.user.businessId);

    if (currentBusiness.plan === 'trial') {
      return res.status(403).json({ error: 'Team members are available on paid plans. Please upgrade to add your team.' });
    }

    if (!['admin', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or agent' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashedPassword,
      role, businessId: req.user.businessId
    });

    res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};