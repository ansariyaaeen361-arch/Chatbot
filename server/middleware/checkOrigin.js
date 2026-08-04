const Business = require('../models/Business');

module.exports = async function checkOrigin(req, res, next) {
  try {
    const businessId = req.params.businessId;
    const origin = req.headers.origin || req.headers.referer || '';

    if (!businessId) return next();

    const business = await Business.findById(businessId).select('website');
    if (!business) return res.status(404).json({ error: 'Business not found' });

    // If the business hasn't set a website yet, allow (so they can test before saving)
    if (!business.website) return next();

    let allowedHost, originHost;
    try {
      allowedHost = new URL(business.website).hostname.replace(/^www\./, '');
      originHost = new URL(origin).hostname.replace(/^www\./, '');
    } catch (e) {
      // missing/unparseable Origin & Referer (e.g. a scripted request with no
      // browser-set headers) — reject rather than silently allowing through
      return res.status(403).json({ error: 'This widget is not authorized for this domain.' });
    }

    if (allowedHost !== originHost) {
      return res.status(403).json({ error: 'This widget is not authorized for this domain.' });
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'This widget is not authorized for this domain.' });
  }
};