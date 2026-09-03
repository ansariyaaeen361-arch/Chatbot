const Business = require('../models/Business');
const Lead = require('../models/Lead');
const User = require('../models/User');
const ChatLog = require('../models/ChatLog');
const sendEmail = require('../utils/mailer');
const { hasFeature } = require('../utils/planConfig');
const { isBusinessOpen } = require('../utils/businessHours');

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyOwnerOfLead(businessId, lead) {
  const [business, owner] = await Promise.all([
    Business.findById(businessId).select('name'),
    User.findOne({ businessId, role: 'owner' }).select('name email'),
  ]);
  if (!owner) return;

  const contactLines = [];
  if (lead.email) contactLines.push(`Email: ${escapeHtml(lead.email)}`);
  if (lead.phone) contactLines.push(`Phone: ${escapeHtml(lead.phone)}`);

  await sendEmail({
    to: owner.email,
    subject: `New lead from ${business ? business.name : 'your chatbot'}`,
    html: `<p>Hi ${escapeHtml(owner.name)},</p><p>You've got a new lead from your ${business ? escapeHtml(business.name) : ''} chatbot:</p><p><strong>Name:</strong> ${escapeHtml(lead.name)}<br>${contactLines.join('<br>')}</p>`
  });
}

// Fire-and-forget push of a new lead to the business's connected CRM (via a webhook
// URL — Zapier/Make/most CRMs' native "incoming webhook" step — so any CRM works
// without us building a per-provider OAuth integration). Never blocks or fails the
// widget's lead-capture response; errors are just logged.
async function pushLeadToCrm(businessId, lead) {
  const business = await Business.findById(businessId).select('name plan crmWebhookUrl');
  if (!business || !business.crmWebhookUrl || !hasFeature(business, 'crmIntegration')) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(business.crmWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'mentalforge_chatbot',
        businessName: business.name,
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        createdAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    if (!res.ok) console.log('CRM webhook returned non-OK status:', res.status);
  } finally {
    clearTimeout(timeout);
  }
}

// Public config — no auth, widget calls this directly from client's website
exports.getPublicConfig = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId)
      .select('name logoUrl brandColor ctaLinks launcherType launcherMediaUrl welcomeMessage launcherPosition hideBranding faqs businessHours awayMessage');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const data = business.toObject();
    data.isOpen = isBusinessOpen(business);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, email, phone, sessionId } = req.body;

    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and email or phone required' });
    }

    const lead = await Lead.create({ businessId, name, email, phone, sessionId: sessionId || '' });
    res.json({ success: true, leadId: lead._id });

    notifyOwnerOfLead(businessId, { name, email, phone }).catch((e) =>
      console.log('Lead notification email failed:', e.message)
    );
    pushLeadToCrm(businessId, { name, email, phone }).catch((e) =>
      console.log('CRM webhook push failed:', e.message)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// Public — visitor rates a specific AI reply. No auth; the chatLogId itself is the
// only thing needed, and it's not guessable/enumerable in any useful way (a random
// Mongo ObjectId), so this is safe to leave open like the rest of the widget API.
exports.submitFeedback = async (req, res) => {
  try {
    const { chatLogId } = req.params;
    const { rating } = req.body;
    if (!['up', 'down'].includes(rating)) {
      return res.status(400).json({ error: 'rating must be "up" or "down"' });
    }
    const log = await ChatLog.findOneAndUpdate(
      { _id: chatLogId, source: 'ai' },
      { feedback: rating },
      { new: true }
    ).select('_id feedback');
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public — emails the visitor a copy of their own conversation.
exports.emailTranscript = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { email, transcript } = req.body;
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!transcript || typeof transcript !== 'string') return res.status(400).json({ error: 'transcript is required' });

    const business = await Business.findById(businessId).select('name');
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const html = `<p>Here's a copy of your conversation with ${escapeHtml(business.name)}:</p>` +
      `<div style="white-space:pre-wrap;font-family:monospace;background:#f5f5f7;padding:14px;border-radius:8px;">${escapeHtml(transcript.slice(0, 8000))}</div>`;

    await sendEmail({ to: email, subject: `Your conversation with ${business.name}`, html });
    res.json({ success: true });
  } catch (err) {
    console.error('Transcript email failed:', err.message);
    res.status(500).json({ error: 'Could not send that email right now.' });
  }
};