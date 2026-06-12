import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('bgImage') || '');

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'theme-light' : '';
    document.documentElement.style.setProperty(
      '--bg-image',
      bgImage ? `url(${bgImage})` : 'none'
    );
  }, [theme, bgImage]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const setBackground = useCallback((url) => {
    localStorage.setItem('bgImage', url);
    setBgImage(url);
  }, []);

  const removeBackground = useCallback(() => {
    localStorage.removeItem('bgImage');
    setBgImage('');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, bgImage, setBackground, removeBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
