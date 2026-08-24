const MAX_KNOWLEDGE_CHARS = 4000;
const MAX_FAQ_CHARS = 1500;

function buildFaqSection(relevantFaqs) {
  if (!relevantFaqs || !relevantFaqs.length) return '';

  let combined = '';
  let remaining = MAX_FAQ_CHARS;

  for (const faq of relevantFaqs) {
    if (remaining <= 0) break;
    const entry = `\nQ: ${faq.question}\nA: ${faq.answer}\n`;
    if (entry.length > remaining) break;
    combined += entry;
    remaining -= entry.length;
  }

  if (!combined) return '';

  return `\nPossibly relevant saved FAQs (only use one if it actually answers the visitor's question, ignore it otherwise):\n${combined}`;
}

function buildKnowledgeSection(business) {
  if (!business.knowledgeBase || !business.knowledgeBase.length) return '';

  let combined = '';
  let remaining = MAX_KNOWLEDGE_CHARS;

  for (const entry of business.knowledgeBase) {
    if (remaining <= 0) break;

    const header = `\n### ${entry.title}\n`;
    const availableForContent = remaining - header.length;
    if (availableForContent <= 0) break;

    const content = entry.content.length > availableForContent
      ? entry.content.slice(0, availableForContent) + '…'
      : entry.content;

    const chunk = header + content + '\n';
    combined += chunk;
    remaining -= chunk.length;
  }

  if (!combined) return '';

  return `\nAdditional knowledge about this business (use this to answer questions the FAQs don't cover):\n${combined}`;
}

function buildSystemPrompt(business, relevantFaqs) {
  const services = business.services.length ? business.services.join(', ') : 'various services';
  const ctaText = business.ctaLinks.length
    ? business.ctaLinks.map(c => `- ${c.label}: ${c.url}`).join('\n')
    : '';
  const knowledgeSection = buildKnowledgeSection(business);
  const faqSection = buildFaqSection(relevantFaqs);

  return `You are the AI assistant for ${business.name}.
About the business: ${business.description || 'No description provided yet.'}
Services offered: ${services}
Target customer: ${business.targetCustomer || 'general visitors'}
Tone: Respond in a ${business.tone} tone.
${knowledgeSection}${faqSection}
Rules:
- Keep replies short and useful: 2 to 4 sentences max. This is a chat widget, not an essay.
- Be helpful, honest, and specific. Never invent facts, prices, or guarantees not mentioned above.
- Respond in the same language the visitor is using.
- When relevant, guide the visitor toward one of these next steps:
${ctaText || '- (no specific links provided yet)'}
- If you don't know something specific, offer to connect them with the team instead of guessing.
- Stay strictly on topics related to this business.
- Write like a real person on the team would, not like an AI. Use plain, everyday words and short, simple sentences. Never use em dashes (—); use a period, comma, or "and"/"so" instead. Avoid stiff or overly formal phrasing, corporate buzzwords, and robotic transitions like "furthermore" or "additionally".`;
}

module.exports = buildSystemPrompt;