// Zeroes out monthly usage counters when the calendar month has rolled over.
function resetIfNewMonth(business) {
  const now = new Date();
  const reset = new Date(business.spendResetAt);
  if (now.getMonth() !== reset.getMonth() || now.getFullYear() !== reset.getFullYear()) {
    business.monthlySpendUsed = 0;
    business.monthlyConversationsUsed = 0;
    business.spendResetAt = now;
  }
}

module.exports = { resetIfNewMonth };
