import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .use(LanguageDetector)  // language detector
  .use(Backend) // backend to load translations
  .init({
    debug: import.meta.env.DEV,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    
    // Configure backend
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Detection options (simplified)
    detection: {
      order: ['navigator', 'querystring', 'localStorage'],
      caches: ['localStorage'],
    },
  });

// Fetch user's country based on IP and set language accordingly
export const fetchUserLanguage = async (): Promise<void> => {
  try {
    const response = await fetch('/api/detect-language');
    if (response.ok) {
      const { language } = await response.json();
      if (language && language !== i18n.language) {
        i18n.changeLanguage(language);
      }
    }
  } catch (error) {
    console.error('Error fetching user language:', error);
  }
};

export default i18n;