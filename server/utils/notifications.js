const { getPlanConfig } = require('./planConfig');

const WARNING_THRESHOLD = 0.8;

// Computes the business's current usage-limit notifications (AI spend + monthly
// conversations), each pair getting its own id at 80% ("warning") and 100%
// ("full") so dismissing the warning doesn't also silence the later, more
// urgent "full" notification — they're treated as distinct alerts.
function getBusinessNotifications(business) {
  const notifications = [];
  const dismissed = business.dismissedNotifications || [];

  const spendCap = business.monthlySpendCap || 0;
  const spendPct = spendCap > 0 ? business.monthlySpendUsed / spendCap : 0;
  if (spendPct >= 1) {
    notifications.push({
      id: 'spend_full',
      level: 'critical',
      title: 'AI budget fully used',
      message: `Your $${spendCap} monthly AI budget is used up. New visitor questions are getting a generic reply until next month, or until you upgrade your plan.`,
    });
  } else if (spendPct >= WARNING_THRESHOLD) {
    notifications.push({
      id: 'spend_warning',
      level: 'warning',
      title: 'AI budget almost used up',
      message: `You've used ${Math.round(spendPct * 100)}% of your $${spendCap} monthly AI budget.`,
    });
  }

  const conversationCap = getPlanConfig(business.plan).conversationCap || 0;
  const convoPct = conversationCap > 0 ? business.monthlyConversationsUsed / conversationCap : 0;
  if (convoPct >= 1) {
    notifications.push({
      id: 'conversations_full',
      level: 'critical',
      title: 'Conversation limit reached',
      message: `You've reached your ${conversationCap}/mo conversation limit. New conversations may be turned away until next month, or until you upgrade your plan.`,
    });
  } else if (convoPct >= WARNING_THRESHOLD) {
    notifications.push({
      id: 'conversations_warning',
      level: 'warning',
      title: 'Conversation limit almost reached',
      message: `You've used ${business.monthlyConversationsUsed} of your ${conversationCap}/mo conversation limit.`,
    });
  }

  return notifications.filter((n) => !dismissed.includes(n.id));
}

module.exports = { getBusinessNotifications };
