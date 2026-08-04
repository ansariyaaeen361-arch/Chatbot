const User = require('../models/User');
const Business = require('../models/Business');
const { getPlanConfig } = require('../utils/planConfig');

// Must run after `auth`. Seat limits are otherwise only checked when
// inviting a NEW member — if a business downgrades to a plan with fewer
// seats, everyone already on the team keeps full access forever. This
// blocks non-owner members from the dashboard once the business is over
// its current plan's seat limit; the owner is always let through so they
// can resolve it (remove members or upgrade).
module.exports = async function requireSeatCompliance(req, res, next) {
  if (req.user.role === 'owner') return next();

  const business = await Business.findById(req.user.businessId).select('plan');
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const seatLimit = getPlanConfig(business.plan).seatLimit;
  const seatsUsed = await User.countDocuments({ businessId: req.user.businessId });

  if (seatsUsed > seatLimit) {
    return res.status(403).json({ error: 'This business has more team members than its plan allows. Please ask the account owner to upgrade the plan or remove members.' });
  }
  next();
};
