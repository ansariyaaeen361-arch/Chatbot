const cron = require('node-cron');
const { paypalFetch } = require('./paypalClient');
const Business = require('../models/Business');

async function checkExpiredPlans() {
  try {
    const businesses = await Business.find({
      plan: { $ne: 'trial' },
      paypalSubscriptionId: { $ne: null }
    });

    console.log(`[Plan check] Verifying ${businesses.length} active subscriptions...`);

    for (const business of businesses) {
      try {
        const sub = await paypalFetch(`/v1/billing/subscriptions/${business.paypalSubscriptionId}`);

        const stillActive = sub.status === 'ACTIVE';

        if (!stillActive && business.planStatus === 'active') {
          business.planStatus = sub.status.toLowerCase();
          if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED' || sub.status === 'SUSPENDED') {
            business.plan = 'trial';
            business.monthlySpendCap = 10;
          }
          await business.save();
          console.log(`[Plan check] Downgraded ${business.name} — PayPal status: ${sub.status}`);
        }
      } catch (err) {
        console.log(`[Plan check] Could not verify ${business.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Plan check] Failed:', err.message);
  }
}

function startPlanExpiryCron() {
  // Runs once every day at 3:00 AM server time
  cron.schedule('0 3 * * *', checkExpiredPlans);
  console.log('Plan expiry cron scheduled (daily at 3 AM)');
}

module.exports = startPlanExpiryCron;