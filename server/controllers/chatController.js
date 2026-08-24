const Fuse = require('fuse.js');
const Business = require('../models/Business');
const buildSystemPrompt = require('../utils/systemPromptBuilder');
const { findRelevantFaqs } = require('../utils/faqRetrieval');
const ChatLog = require('../models/ChatLog');
const { countConversationIfNew } = require('../utils/conversationCounter');
const { resetIfNewMonth } = require('../utils/monthlyReset');
const { getPlanConfig } = require('../utils/planConfig');
const { checkSpendWarning } = require('../utils/spendAlert');

const FAQ_MATCH_THRESHOLD = 0.3;
const FAQ_MATCH_SCORE_CUTOFF = 0.25;
const FAQ_CANDIDATE_COUNT = 4;
const FAQ_FULL_INCLUDE_BUDGET = 1400; // chars — matches systemPromptBuilder's MAX_FAQ_CHARS

// Bare opening greetings only ("Hi", "Salam") — deliberately narrow so a short reply
// later in the conversation (e.g. "yes" answering something the AI asked) isn't
// mistaken for a greeting and short-circuited without context.
const GREETING_ONLY_PATTERN = /^(hi+|hello+|hey+|hiya|yo+|hola|salam|assalam\s*o?\s*alaikum|namaste|good\s*(morning|afternoon|evening))[!.\s]*$/i;

exports.chat = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { messages, sessionId } = req.body;

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    await resetIfNewMonth(business);
    await countConversationIfNew(business, sessionId);

    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage.content;

    // ---- 0. Enforce plan's monthly conversation cap (applies even to free FAQ replies) ----
    const conversationCap = getPlanConfig(business.plan).conversationCap;
    if (business.monthlyConversationsUsed > conversationCap) {
      await business.save();
      ChatLog.create({ businessId, userMessage: userText, source: 'limit_reached' }).catch(() => {});
      return res.json({
        reply: "We're experiencing high demand right now. Please reach out to our team directly and they'll help you out.",
        source: 'limit_reached'
      });
    }

    // ---- 0.5 Bare opening greeting — answer locally, no AI call needed ----
    const isFirstTurn = !messages.some(m => m.role === 'assistant');
    if (isFirstTurn && GREETING_ONLY_PATTERN.test(userText.trim())) {
      await business.save();
      ChatLog.create({ businessId, userMessage: userText, source: 'greeting' }).catch(() => {});
      return res.json({ reply: business.welcomeMessage || 'Hi! How can I help you today?', source: 'greeting' });
    }

    // ---- 1. Try FAQ match first (free, no spend check needed) ----
    // Skip fuzzy matching for very short input (e.g. "Hi", "ok") — Fuse's edit-distance
    // scoring finds spurious "close" matches for short patterns against longer FAQ
    // questions, so greetings were matching unrelated FAQs. Let the AI handle those instead.
    let candidateFaqs = [];
    if (business.faqs && business.faqs.length && userText.trim().length >= 8) {
      const fuse = new Fuse(business.faqs, {
        keys: ['question'],
        threshold: FAQ_MATCH_THRESHOLD,
        ignoreLocation: true,
        includeScore: true
      });
      const result = fuse.search(userText);

      if (result.length > 0 && result[0].score <= FAQ_MATCH_SCORE_CUTOFF) {
        await business.save();
        ChatLog.create({ businessId, userMessage: userText, source: 'faq' }).catch(() => {});
        return res.json({ reply: result[0].item.answer, source: 'faq' });
      }

      // No confident auto-answer. If the whole FAQ list is small enough to fit the
      // prompt budget, just hand the AI all of it — keyword overlap can miss a
      // relevant FAQ entirely when the visitor's wording shares no words with it
      // (e.g. "send it back" vs. "return policy"). Only fall back to keyword-ranked
      // top-N once there are too many FAQs to include in full.
      const totalFaqChars = business.faqs.reduce(
        (sum, f) => sum + (f.question?.length || 0) + (f.answer?.length || 0) + 10, 0
      );
      candidateFaqs = totalFaqChars <= FAQ_FULL_INCLUDE_BUDGET
        ? business.faqs
        : findRelevantFaqs(business.faqs, userText, FAQ_CANDIDATE_COUNT);
    }

    // ---- 2. Check spend cap before calling AI (fresh read narrows the race window) ----
    const spendCheck = await Business.findById(businessId).select('monthlySpendUsed monthlySpendCap');
    if (spendCheck.monthlySpendUsed >= spendCheck.monthlySpendCap) {
      ChatLog.create({ businessId, userMessage: userText, source: 'limit_reached' }).catch(() => {});
      return res.json({
        reply: "We're experiencing high demand right now. Please reach out to our team directly and they'll help you out.",
        source: 'limit_reached'
      });
    }

    // ---- 3. Call Claude AI ----
    const systemPrompt = buildSystemPrompt(business, candidateFaqs);
    const trimmedMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: trimmedMessages
      })
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.log('Anthropic error:', detail);
      return res.status(502).json({ error: 'Upstream AI error' });
    }

    const data = await aiRes.json();
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // ---- 4. Track actual spend (atomic $inc — avoids lost updates under concurrent requests) ----
    const usage = data.usage || {};
    const inputCost = ((usage.input_tokens || 0) / 1e6) * 1;
    const outputCost = ((usage.output_tokens || 0) / 1e6) * 5;
    await Business.updateOne({ _id: businessId }, { $inc: { monthlySpendUsed: inputCost + outputCost } });
    checkSpendWarning(businessId).catch((e) => console.log('Spend warning check failed:', e.message));

    let chatLogId = null;
    try {
      const log = await ChatLog.create({ businessId, userMessage: userText, aiReply: reply, source: 'ai' });
      chatLogId = log._id;
    } catch {}

    res.json({ reply, source: 'ai', chatLogId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};