import { useTheme } from '../contexts/ThemeContext';
import enTranslations from '../translations/en.json';
import geTranslations from '../translations/ge.json';

const translations = {
  en: enTranslations,
  ge: geTranslations
};

export function useTranslation() {
  const { language } = useTheme();
  
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  };
  
  return { t, language };
}
