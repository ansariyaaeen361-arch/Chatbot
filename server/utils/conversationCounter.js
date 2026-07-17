const ConversationSession = require('../models/ConversationSession');

// Increments business.monthlyConversationsUsed at most once per (businessId, sessionId),
// so a visitor who starts with AI chat and escalates to a live agent is only counted once.
// Saves `business` immediately when it counts, so the increment isn't lost if the caller's
// own save is skipped by an early return later in the request (e.g. an upstream API failure).
async function countConversationIfNew(business, sessionId) {
  if (!business || !sessionId) return;
  try {
    await ConversationSession.create({ businessId: business._id, sessionId });
  } catch (err) {
    if (err.code === 11000) return; // already counted this session
    throw err;
  }
  business.monthlyConversationsUsed = (business.monthlyConversationsUsed || 0) + 1;
  await business.save();
}

module.exports = { countConversationIfNew };
