const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  createSubscription,
  cancelSubscription,
  getBillingStatus
} = require('../controllers/billingController');

router.get('/status', auth, getBillingStatus);
router.post('/subscribe', auth, requireRole('owner', 'admin'), createSubscription);
router.post('/cancel', auth, requireRole('owner', 'admin'), cancelSubscription);

module.exports = router;
