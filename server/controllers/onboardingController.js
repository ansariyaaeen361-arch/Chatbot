const scrapeWebsite = require('../utils/websiteScraper');

exports.analyzeWebsite = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const scraped = await scrapeWebsite(url);

    const prompt = `Here is content extracted from a business website.

Title: ${scraped.title}
Meta description: ${scraped.metaDescription}
Page content: ${scraped.bodyText}

Based on this, respond with ONLY a JSON object (no markdown, no explanation) in this exact shape:
{
  "name": "business name",
  "description": "2-3 sentence description of what the business does",
  "services": ["service 1", "service 2", "service 3"],
  "targetCustomer": "who their ideal customer is",
  "tone": "professional" or "friendly" or "casual"
}

Write the description like a real person describing the business, not like an AI. Plain words, short sentences. No em dashes (—), no corporate buzzwords.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.log('Anthropic error:', detail);
      return res.status(502).json({ error: 'AI analysis failed' });
    }

    const data = await aiRes.json();
    const rawText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse AI response' });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze website. Please try again.' });
  }
};