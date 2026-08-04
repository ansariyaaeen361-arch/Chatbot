const Business = require('../models/Business');

// Zeroes out monthly usage counters when the calendar month has rolled over.
// Persists the reset immediately (not just in-memory) so a later atomic $inc
// on monthlySpendUsed/monthlyConversationsUsed always starts from a correct
// baseline, even on request paths that don't otherwise save the business.
async function resetIfNewMonth(business) {
  const now = new Date();
  const reset = new Date(business.spendResetAt);
  if (now.getMonth() !== reset.getMonth() || now.getFullYear() !== reset.getFullYear()) {
    business.monthlySpendUsed = 0;
    business.monthlyConversationsUsed = 0;
    business.spendResetAt = now;
    await Business.updateOne(
      { _id: business._id },
      { monthlySpendUsed: 0, monthlyConversationsUsed: 0, spendResetAt: now }
    );
  }
}

module.exports = { resetIfNewMonth };
