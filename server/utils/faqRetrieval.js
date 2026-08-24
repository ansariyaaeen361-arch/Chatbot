// Fuse.js (used for the auto-answer path) does character-level fuzzy matching, which is
// good for typos but bad at matching a differently-worded question to the same FAQ
// ("what's your pricing look like" vs "Is the pricing the same for every business?").
// This does simple IDF-weighted keyword overlap instead, to surface FAQs that are worth
// giving the AI as grounding context even when the wording doesn't line up closely.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'what', 'whats',
  'how', 'why', 'who', 'can', 'could', 'i', 'you', 'your', 'yours', 'to', 'for', 'of',
  'and', 'or', 'on', 'in', 'it', 'its', 'this', 'that', 'these', 'those', 'my', 'me',
  'with', 'be', 'been', 'being', 'have', 'has', 'had', 'need', 'needs', 'about', 'if',
  'will', 'would', 'should', 'just', 'like', 'look', 'looks', 'looking', 'get', 'gets',
  'got', 'use', 'using', 'used', 'one', 'also', 'not', 'so', 'than', 'then', 'there',
  'here', 'out', 'up', 'down', 'all', 'any', 'some', 'more', 'most', 'much', 'many',
  'really', 'actually', 'sure', 'feel', 'feels'
]);

function normalize(word) {
  // crude plural stripping ("languages" -> "language") — not real stemming, just enough
  // to catch the most common singular/plural mismatch
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function keywords(text) {
  const words = (text.toLowerCase().match(/[a-z0-9']+/g) || [])
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .map(normalize);
  return Array.from(new Set(words));
}

function findRelevantFaqs(faqs, userText, limit) {
  if (!faqs || !faqs.length) return [];

  const userWords = keywords(userText);
  if (!userWords.length) return [];

  const df = new Map();
  const faqKeywordSets = faqs.map(f => {
    const words = keywords(f.question);
    for (const w of words) df.set(w, (df.get(w) || 0) + 1);
    return words;
  });

  const N = faqs.length;
  const idf = w => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;

  return faqs
    .map((f, idx) => {
      const faqWords = new Set(faqKeywordSets[idx]);
      let score = 0;
      for (const w of userWords) if (faqWords.has(w)) score += idf(w);
      return { f, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.f);
}

module.exports = { findRelevantFaqs };
