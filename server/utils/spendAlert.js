const Business = require('../models/Business');
const User = require('../models/User');
const sendEmail = require('./mailer');

const WARNING_THRESHOLD = 0.8;

// Fire-and-forget: emails the owner once per billing cycle when AI spend crosses 80%
// of the monthly cap, so they're not surprised when it later hits 100% and the bot
// starts falling back to the "high demand" message.
async function checkSpendWarning(businessId) {
  const business = await Business.findById(businessId).select('name monthlySpendUsed monthlySpendCap spendWarningSent');
  if (!business || business.spendWarningSent) return;
  if (!business.monthlySpendCap || business.monthlySpendUsed < business.monthlySpendCap * WARNING_THRESHOLD) return;

  // Atomic claim — if two requests cross the threshold at the same moment, only one wins this.
  const claimed = await Business.findOneAndUpdate(
    { _id: businessId, spendWarningSent: false },
    { spendWarningSent: true }
  );
  if (!claimed) return;

  const owner = await User.findOne({ businessId, role: 'owner' }).select('name email');
  if (!owner) return;

  const pct = Math.round((business.monthlySpendUsed / business.monthlySpendCap) * 100);
  await sendEmail({
    to: owner.email,
    subject: `Heads up: ${business.name}'s chatbot has used ${pct}% of its monthly AI budget`,
    html: `<p>Hi ${owner.name},</p>` +
      `<p>Your chatbot for <strong>${business.name}</strong> has used $${business.monthlySpendUsed.toFixed(2)} of its $${business.monthlySpendCap} monthly AI budget (${pct}%).</p>` +
      `<p>Once it reaches 100%, new visitor questions will get a generic "please contact us" reply instead of an AI answer until the budget resets next month, or until you upgrade your plan.</p>`
  });
}

module.exports = { checkSpendWarning };
