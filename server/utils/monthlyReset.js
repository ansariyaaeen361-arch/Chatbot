const Business = require('../models/Business');
const { getPlanConfig } = require('./planConfig');

// Zeroes out monthly usage counters when the calendar month has rolled over.
// Persists the reset immediately (not just in-memory) so a later atomic $inc
// on monthlySpendUsed/monthlyConversationsUsed always starts from a correct
// baseline, even on request paths that don't otherwise save the business.
// Also re-syncs monthlySpendCap to the plan's current configured cap, so a
// later change to plan pricing/caps picks up existing businesses automatically
// at their next monthly reset instead of needing a one-off manual migration.
async function resetIfNewMonth(business) {
  const now = new Date();
  const reset = new Date(business.spendResetAt);
  if (now.getMonth() !== reset.getMonth() || now.getFullYear() !== reset.getFullYear()) {
    const cap = getPlanConfig(business.plan).spendCap;
    business.monthlySpendUsed = 0;
    business.monthlyConversationsUsed = 0;
    business.spendResetAt = now;
    business.spendWarningSent = false;
    business.monthlySpendCap = cap;
    await Business.updateOne(
      { _id: business._id },
      { monthlySpendUsed: 0, monthlyConversationsUsed: 0, spendResetAt: now, spendWarningSent: false, monthlySpendCap: cap }
    );
  }
}

module.exports = { resetIfNewMonth };
