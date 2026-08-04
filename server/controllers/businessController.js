const Business = require('../models/Business');
const scrapeWebsite = require('../utils/websiteScraper');
const { getPlanConfig, hasFeature } = require('../utils/planConfig');

const MAX_KNOWLEDGE_ENTRIES = 15;
const MAX_ENTRY_LENGTH = 6000;

exports.getProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'website', 'description', 'services', 'targetCustomer', 'tone', 'brandColor', 'ctaLinks', 'welcomeMessage', 'launcherPosition', 'hideBranding'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.hideBranding === true) {
      const currentBusiness = await Business.findById(req.user.businessId).select('plan');
      if (!hasFeature(currentBusiness, 'removeBranding')) {
        return res.status(403).json({ error: 'Removing the "Powered by" badge is available on Growth and Pro plans. Please upgrade.' });
      }
    }

    const business = await Business.findByIdAndUpdate(req.user.businessId, updates, { new: true });
    res.json(business);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getTeam = async (req, res) => {
  try {
    const User = require('../models/User');
    const isAdmin = req.user.role === 'owner' || req.user.role === 'admin';
    // Agents only need name/role to pick a chat-transfer target — no need to expose coworker emails to them
    const team = await User.find({ businessId: req.user.businessId }).select(isAdmin ? 'name email role' : 'name role');
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot remove your own account.' });
    }
    const member = await User.findOne({ _id: userId, businessId: req.user.businessId });
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    await User.deleteOne({ _id: userId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.inviteTeamMember = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');
    const currentBusiness = await Business.findById(req.user.businessId);
    const seatLimit = getPlanConfig(currentBusiness.plan).seatLimit;
    const seatsUsed = await User.countDocuments({ businessId: req.user.businessId });
    if (seatsUsed >= seatLimit) {
      return res.status(403).json({
        error: currentBusiness.plan === 'trial'
          ? 'Team members are available on paid plans. Please upgrade to add your team.'
          : `Your plan is limited to ${seatLimit} seat${seatLimit === 1 ? '' : 's'}. Please upgrade to add more team members.`
      });
    }
    const { name, email, password, role } = req.body;
    if (!['admin', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or agent' });
    }
    if (role === 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only the business owner can add new admins.' });
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
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// ---------- Knowledge base ----------

exports.addKnowledgeEntry = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const { title, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (business.knowledgeBase.length >= MAX_KNOWLEDGE_ENTRIES) {
      return res.status(400).json({ error: `You can add up to ${MAX_KNOWLEDGE_ENTRIES} knowledge entries.` });
    }
    business.knowledgeBase.push({
      title: (title || '').trim().slice(0, 120) || 'Untitled',
      content: content.trim().slice(0, MAX_ENTRY_LENGTH),
      source: 'manual'
    });
    await business.save();
    res.json({ knowledgeBase: business.knowledgeBase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.addKnowledgeFromUrl = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (business.plan === 'trial') {
      return res.status(403).json({ error: 'The knowledge base is available on Basic and Pro plans. Please upgrade to add entries.' });
    }
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (business.knowledgeBase.length >= MAX_KNOWLEDGE_ENTRIES) {
      return res.status(400).json({ error: `You can add up to ${MAX_KNOWLEDGE_ENTRIES} knowledge entries.` });
    }
    const scraped = await scrapeWebsite(url);
    business.knowledgeBase.push({
      title: scraped.title || url,
      content: scraped.bodyText.slice(0, MAX_ENTRY_LENGTH),
      source: 'scraped'
    });
    await business.save();
    res.json({ knowledgeBase: business.knowledgeBase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch that page. Please check the URL and try again.' });
  }
};

exports.removeKnowledgeEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    business.knowledgeBase = business.knowledgeBase.filter(
      (entry) => entry._id.toString() !== entryId
    );
    await business.save();
    res.json({ knowledgeBase: business.knowledgeBase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
exports.uploadLauncherMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const isVideo = /\.(mp4|webm|mov)$/i.test(req.file.filename);
    const launcherMediaUrl = `/uploads/${req.file.filename}`;
    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { launcherType: isVideo ? 'video' : 'image', launcherMediaUrl },
      { new: true }
    );
    res.json({ launcherType: business.launcherType, launcherMediaUrl: business.launcherMediaUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.removeLauncherMedia = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { launcherType: 'default', launcherMediaUrl: '' },
      { new: true }
    );
    res.json({ launcherType: business.launcherType, launcherMediaUrl: business.launcherMediaUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};