const Business = require('../models/Business');

// Blocks a request only when we can actively see it came from a domain other
// than the one the business registered. A spoofed/scripted request can always
// fake Origin/Referer to whatever it wants anyway — this was never a hard
// barrier against a determined non-browser abuser (the real backstops for
// that are the per-business monthly spend cap and rate limiting). What this
// *does* still stop is the common case of someone copy-pasting a business's
// embed snippet onto an unrelated site's real, browser-rendered page.
//
// Origin/Referer can legitimately be missing even for genuine visitors — some
// proxies strip Origin, and some sites/browsers withhold Referer by policy —
// so treat "we can't tell" as "let it through" rather than "reject it".
module.exports = async function checkOrigin(req, res, next) {
  try {
    const businessId = req.params.businessId;
    const origin = req.headers.origin || req.headers.referer || '';

    if (!businessId) return next();

    const business = await Business.findById(businessId).select('website');
    if (!business) return res.status(404).json({ error: 'Business not found' });

    // If the business hasn't set a website yet, allow (so they can test before saving)
    if (!business.website) return next();

    // No Origin/Referer to check against — can't confirm OR deny, so don't
    // penalize a real visitor for something outside their control.
    if (!origin) return next();

    let originHost;
    try {
      originHost = new URL(origin).hostname.replace(/^www\./, '');
    } catch (e) {
      // Present but unparseable — same reasoning as missing: let it through.
      return next();
    }

    const allowedHost = new URL(business.website).hostname.replace(/^www\./, '');
    if (allowedHost !== originHost) {
      return res.status(403).json({ error: 'This widget is not authorized for this domain.' });
    }

    next();
  } catch (err) {
    next();
  }
};
