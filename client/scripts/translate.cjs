// Reads src/locales/en.json (source of truth) and fills in the other locale files
// via the free MyMemory translation API (no API key needed). Re-runnable: only
// translates keys that are missing or still equal to the English source, so it's
// cheap to run again after adding new strings.
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const EMAIL = "product.dev.mevteck@gmail.com"; // bumps the free daily quota from 5k to 50k chars

const TARGET_LANGS = ["es", "fr", "ar", "pt", "ru", "id", "de", "tr", "it", "ko"];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

async function translate(text, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}&de=${EMAIL}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus !== 200 && data.responseStatus !== "200") {
    throw new Error(`MyMemory error for "${text}" -> ${targetLang}: ${data.responseDetails}`);
  }
  return data.responseData.translatedText;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, "en.json"), "utf8")));

  for (const lang of TARGET_LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    let existingFlat = {};
    if (fs.existsSync(filePath)) {
      existingFlat = flatten(JSON.parse(fs.readFileSync(filePath, "utf8")));
    }

    let translatedCount = 0;
    for (const [key, enText] of Object.entries(enFlat)) {
      const already = existingFlat[key];
      const needsTranslation = !already || already === enText;
      if (!needsTranslation) continue;

      try {
        const translated = await translate(enText, lang);
        existingFlat[key] = translated;
        translatedCount++;
        await sleep(120); // stay well under rate limits
      } catch (e) {
        console.error(`  [${lang}] FAILED "${key}": ${e.message}`);
        existingFlat[key] = enText; // fall back to English rather than leaving it missing
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(unflatten(existingFlat), null, 2) + "\n");
    console.log(`[${lang}] wrote ${Object.keys(existingFlat).length} keys (${translatedCount} newly translated)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
