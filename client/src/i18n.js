import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import id from "./locales/id.json";
import de from "./locales/de.json";
import tr from "./locales/tr.json";
import it from "./locales/it.json";
import ko from "./locales/ko.json";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "it", label: "Italiano" },
  { code: "ko", label: "한국어" },
];

const RTL_LANGS = ["ar"];

function applyDirection(lang) {
  document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

const savedLang = (() => {
  try { return localStorage.getItem("forge_lang") || "en"; } catch { return "en"; }
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    pt: { translation: pt },
    ru: { translation: ru },
    id: { translation: id },
    de: { translation: de },
    tr: { translation: tr },
    it: { translation: it },
    ko: { translation: ko },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDirection(savedLang);

i18n.on("languageChanged", (lang) => {
  try { localStorage.setItem("forge_lang", lang); } catch {}
  applyDirection(lang);
});

export default i18n;
