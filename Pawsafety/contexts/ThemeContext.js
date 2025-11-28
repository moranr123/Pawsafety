import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { LIGHT_THEME, DARK_THEME } from '../constants/theme';

// Create Theme Context
const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Memoize toggle function to prevent recreation
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Memoize theme object to prevent unnecessary re-renders
  const theme = useMemo(() => ({
    colors: isDarkMode ? DARK_THEME : LIGHT_THEME,
    isDarkMode,
    toggleTheme,
  }), [isDarkMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 