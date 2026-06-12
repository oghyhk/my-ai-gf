import { createContext, useContext, useState, useCallback } from 'react';
import zh from './zh';
import en from './en';

const locales = { zh, en };
const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh');

  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let val = locales[lang];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) return key;
    }
    if (typeof val === 'string') {
      return val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }
    return val;
  }, [lang]);

  const switchLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem('lang', l);
  }, []);

  return (
    <I18nContext.Provider value={{ t, lang, switchLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
