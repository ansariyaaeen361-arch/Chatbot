const cheerio = require('cheerio');

async function scrapeWebsite(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MentalForgeBot/1.0)' }
  });
  if (!res.ok) throw new Error('Could not fetch website');

  const html = await res.text();
  const $ = cheerio.load(html);

  $('script, style, nav, footer, noscript').remove();

  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);

  return { title, metaDescription, bodyText };
}

module.exports = scrapeWebsite;