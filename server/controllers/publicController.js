const Business = require('../models/Business');
const Lead = require('../models/Lead');

// Public config — no auth, widget calls this directly from client's website
exports.getPublicConfig = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId)
      .select('name logoUrl brandColor ctaLinks launcherType launcherMediaUrl welcomeMessage launcherPosition');
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};