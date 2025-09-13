import React, { createContext, useState, useContext, useEffect } from 'react';

// Import the actual translation files
import enTranslations from '../translations/en.json';
import viTranslations from '../translations/vi.json';

const LanguageContext = createContext();

// Use the imported translations
const translations = {
  en: enTranslations,
  vi: viTranslations
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key, params = {}) => {
    try {
      // Split the key by dots to handle nested properties
      const keys = key.split('.');
      let value = translations[language];
      
      // Navigate through the nested structure
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          // If we can't find the key, return the key itself as fallback
          return key;
        }
      }
      
      // If no value found, return the key
      if (!value) return key;
      
      // If params are provided and value is a string, replace placeholders
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        let result = value;
        
        // Replace all placeholders like {{paramName}} with actual values
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          const placeholder = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
          result = result.replace(placeholder, paramValue);
        });
        
        return result;
      }
      
      // Return the found value or the key as fallback
      return value || key;
    } catch (error) {
      console.error('Translation error for key:', key, error);
      return key;
    }
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a safe fallback instead of throwing
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key) => key
    };
  }
  return context;
};