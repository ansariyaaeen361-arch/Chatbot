const Business = require('../models/Business');
const Lead = require('../models/Lead');
const User = require('../models/User');
const sendEmail = require('../utils/mailer');

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

// Public config — no auth, widget calls this directly from client's website
exports.getPublicConfig = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId)
      .select('name logoUrl brandColor ctaLinks launcherType launcherMediaUrl welcomeMessage launcherPosition hideBranding faqs');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, email, phone } = req.body;

    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and email or phone required' });
    }

    const lead = await Lead.create({ businessId, name, email, phone });
    res.json({ success: true, leadId: lead._id });

    notifyOwnerOfLead(businessId, { name, email, phone }).catch((e) =>
      console.log('Lead notification email failed:', e.message)
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};