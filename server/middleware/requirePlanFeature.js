const Business = require('../models/Business');
const { hasFeature } = require('../utils/planConfig');

module.exports = function requirePlanFeature(feature) {
  return async function (req, res, next) {
    const business = await Business.findById(req.user.businessId).select('plan');
    if (!business || !hasFeature(business, feature)) {
      return res.status(403).json({ error: 'This feature is not available on your current plan. Please upgrade.' });
    }
    next();
  };
};
