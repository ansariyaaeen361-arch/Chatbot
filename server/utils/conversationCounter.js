const ConversationSession = require('../models/ConversationSession');
const Business = require('../models/Business');

// Increments business.monthlyConversationsUsed at most once per (businessId, sessionId),
// so a visitor who starts with AI chat and escalates to a live agent is only counted once.
// Uses an atomic $inc (not load-mutate-save) so concurrent requests for different
// sessions can't clobber each other's increment, then syncs the in-memory value
// so the caller's own cap check in the same request sees the up-to-date count.
async function countConversationIfNew(business, sessionId) {
  if (!business || !sessionId) return;
  try {
    await ConversationSession.create({ businessId: business._id, sessionId });
  } catch (err) {
    if (err.code === 11000) return; // already counted this session
    throw err;
  }
  const updated = await Business.findByIdAndUpdate(
    business._id,
    { $inc: { monthlyConversationsUsed: 1 } },
    { new: true, select: 'monthlyConversationsUsed' }
  );
  business.monthlyConversationsUsed = updated.monthlyConversationsUsed;
}

module.exports = { countConversationIfNew };
