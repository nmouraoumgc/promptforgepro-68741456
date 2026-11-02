import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from './locales/pt.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // The user's saved choice (localStorage) must win over the static <html lang>.
      order: ['querystring', 'localStorage', 'htmlTag', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'pf_lang',
      caches: ['localStorage'],
    },
  });

const syncHtmlLang = (lng?: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = (lng || '').startsWith('en') ? 'en' : 'pt-PT';
};
syncHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
