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
    const allowedFields = ['name', 'website', 'description', 'services', 'targetCustomer', 'tone', 'brandColor', 'ctaLinks', 'welcomeMessage', 'launcherPosition', 'hideBranding', 'crmWebhookUrl', 'businessHours', 'awayMessage', 'autoAssignChats'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.hideBranding === true || updates.crmWebhookUrl) {
      const currentBusiness = await Business.findById(req.user.businessId).select('plan');
      if (updates.hideBranding === true && !hasFeature(currentBusiness, 'removeBranding')) {
        return res.status(403).json({ error: 'Removing the "Powered by" badge is available on Growth and Pro plans. Please upgrade.' });
      }
      if (updates.crmWebhookUrl && !hasFeature(currentBusiness, 'crmIntegration')) {
        return res.status(403).json({ error: 'CRM integration is available on Growth and Pro plans. Please upgrade.' });
      }
    }

    if (updates.crmWebhookUrl) {
      try {
        const parsed = new URL(updates.crmWebhookUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
      } catch {
        return res.status(400).json({ error: 'CRM webhook URL must be a valid http(s) URL.' });
      }
    }

    const business = await Business.findByIdAndUpdate(req.user.businessId, updates, { new: true });
    res.json(business);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.testCrmWebhook = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId).select('name plan crmWebhookUrl');
    if (!hasFeature(business, 'crmIntegration')) {
      return res.status(403).json({ error: 'CRM integration is available on Growth and Pro plans. Please upgrade.' });
    }
    if (!business.crmWebhookUrl) {
      return res.status(400).json({ error: 'Save a CRM webhook URL first.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const result = await fetch(business.crmWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'mentalforge_chatbot',
          businessName: business.name,
          name: 'Test Lead',
          email: 'test@example.com',
          phone: '',
          createdAt: new Date().toISOString(),
          test: true,
        }),
        signal: controller.signal,
      });
      if (!result.ok) {
        return res.status(502).json({ error: `Webhook responded with status ${result.status}` });
      }
      res.json({ success: true });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    res.status(502).json({ error: err.name === 'AbortError' ? 'Webhook timed out' : 'Could not reach that URL' });
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

exports.removeLogo = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { logoUrl: '' },
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

// Promotes a "missed FAQ" analytics suggestion straight into the FAQ list, without
// requiring the caller to already have the full faqs array loaded (unlike updateFaqs).
exports.addFaqFromSuggestion = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });
    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { $push: { faqs: { question, answer } } },
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
// Uses AI to draft candidate FAQ pairs from one knowledge base entry (usually a
// scraped page). Returned as suggestions only — nothing is saved until the owner
// picks "Add as FAQ" on the ones they actually want (reuses addFaqFromSuggestion).
exports.suggestFaqsFromKnowledge = async (req, res) => {
  try {
    const { entryId } = req.params;
    const business = await Business.findById(req.user.businessId).select('knowledgeBase monthlySpendUsed monthlySpendCap');
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const entry = business.knowledgeBase.id(entryId);
    if (!entry) return res.status(404).json({ error: 'Knowledge entry not found' });

    if (business.monthlySpendUsed >= business.monthlySpendCap) {
      return res.status(403).json({ error: 'This month’s AI budget has been used up. Try again next month or upgrade your plan.' });
    }

    const prompt = `Here is a piece of content from a business's knowledge base, titled "${entry.title}":

${entry.content.slice(0, 4000)}

Based on this, suggest 2 to 5 frequently-asked-question pairs a customer might ask that this content directly answers. Respond with ONLY a JSON array (no markdown, no explanation) in this exact shape:
[{"question": "...", "answer": "..."}]

Write plainly, like a real person, not like an AI. No em dashes (—). Keep each answer to 1-2 sentences, using only facts actually present in the content above.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.log('Anthropic error:', detail);
      return res.status(502).json({ error: 'AI suggestion failed' });
    }

    const data = await aiRes.json();
    const rawText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

    const usage = data.usage || {};
    const cost = ((usage.input_tokens || 0) / 1e6) * 1 + ((usage.output_tokens || 0) / 1e6) * 5;
    await Business.updateOne({ _id: req.user.businessId }, { $inc: { monthlySpendUsed: cost } });

    let suggestions;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse AI response' });
    }

    if (!Array.isArray(suggestions)) suggestions = [];
    res.json({ suggestions: suggestions.slice(0, 5).filter(s => s && s.question && s.answer) });
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