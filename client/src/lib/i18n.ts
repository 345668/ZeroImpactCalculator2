import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next with enhanced configuration
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
    
    // Enhanced detection options for better persistence
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      cookieExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    
    // Ensure resources are loaded properly
    load: 'languageOnly',
    
    // Don't use empty string as missing value
    returnEmptyString: false,
    
    // More robust namespace handling
    ns: 'translation',
    defaultNS: 'translation',
    
    // Better fallback handling
    fallbackNS: false,
    
    // Prevent nested key lookup path conflicts
    keySeparator: '.',
    nsSeparator: ':',
  });

// Force reload all namespaces when language changes
const originalChangeLanguage = i18n.changeLanguage;
i18n.changeLanguage = async function(lng: string | undefined, callback?: ((error: any, t: any) => void) | undefined) {
  try {
    const result = await originalChangeLanguage.call(i18n, lng, callback);
    
    // Force reload all namespaces
    if (i18n.services && i18n.services.resourceStore) {
      Object.keys(i18n.services.resourceStore.data).forEach(language => {
        if (language === lng) {
          Object.keys(i18n.services.resourceStore.data[language]).forEach(namespace => {
            i18n.reloadResources(lng, namespace);
          });
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error changing language:', error);
    if (callback) callback(error, null);
    throw error;
  }
};

// Fetch user's country based on IP and set language accordingly
export const fetchUserLanguage = async (): Promise<void> => {
  try {
    // Check if user already has a language preference
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['en', 'de'].includes(savedLanguage)) {
      if (savedLanguage !== i18n.language) {
        await i18n.changeLanguage(savedLanguage);
      }
      return;
    }
    
    // Otherwise detect from server
    const response = await fetch('/api/detect-language');
    if (response.ok) {
      const { language } = await response.json();
      if (language && language !== i18n.language) {
        await i18n.changeLanguage(language);
        localStorage.setItem('i18nextLng', language);
      }
    }
  } catch (error) {
    console.error('Error fetching user language:', error);
  }
};

export default i18n;