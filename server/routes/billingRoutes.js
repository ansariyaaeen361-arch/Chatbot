const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const requireSeatCompliance = require('../middleware/requireSeatCompliance');
const requireRole = require('../middleware/requireRole');
const {
  createSubscription,
  cancelSubscription,
  getBillingStatus,
  redeemPromo,
  getPromoRedemptions
} = require('../controllers/billingController');

router.get('/status', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), getBillingStatus);
router.post('/subscribe', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), createSubscription);
router.post('/cancel', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), cancelSubscription);
router.post('/redeem-promo', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), redeemPromo);
router.get('/promo-redemptions', getPromoRedemptions);

module.exports = router;
