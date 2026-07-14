const Fuse = require('fuse.js');
const Business = require('../models/Business');
const buildSystemPrompt = require('../utils/systemPromptBuilder');
const ChatLog = require('../models/ChatLog');

const FAQ_MATCH_THRESHOLD = 0.35;

function resetIfNewMonth(business) {
  const now = new Date();
  const reset = new Date(business.spendResetAt);
  if (now.getMonth() !== reset.getMonth() || now.getFullYear() !== reset.getFullYear()) {
    business.monthlySpendUsed = 0;
    business.spendResetAt = now;
  }
}

exports.chat = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { messages } = req.body;

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage.content;

    // ---- 1. Try FAQ match first (free, no spend check needed) ----
    if (business.faqs && business.faqs.length) {
      const fuse = new Fuse(business.faqs, {
        keys: ['question'],
        threshold: FAQ_MATCH_THRESHOLD,
        includeScore: true
      });
      const result = fuse.search(userText);

      if (result.length > 0) {
        ChatLog.create({ businessId, userMessage: userText, source: 'faq' }).catch(() => {});
        return res.json({ reply: result[0].item.answer, source: 'faq' });
      }
    }

    // ---- 2. Check spend cap before calling AI ----
    resetIfNewMonth(business);
    if (business.monthlySpendUsed >= business.monthlySpendCap) {
      await business.save();
      ChatLog.create({ businessId, userMessage: userText, source: 'limit_reached' }).catch(() => {});
      return res.json({
        reply: "We're experiencing high demand right now. Please reach out to our team directly and they'll help you out.",
        source: 'limit_reached'
      });
    }

    // ---- 3. Call Claude AI ----
    const systemPrompt = buildSystemPrompt(business);
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

    // ---- 4. Track actual spend ----
    const usage = data.usage || {};
    const inputCost = ((usage.input_tokens || 0) / 1e6) * 1;
    const outputCost = ((usage.output_tokens || 0) / 1e6) * 5;
    business.monthlySpendUsed += (inputCost + outputCost);
    await business.save();

    ChatLog.create({ businessId, userMessage: userText, source: 'ai' }).catch(() => {});

    res.json({ reply, source: 'ai' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};