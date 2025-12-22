import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/ThemeToggle.css';

function ThemeToggle() {
  const { theme, language, toggleTheme, toggleLanguage } = useTheme();
  
  return (
    <div className="theme-controls">
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        className="theme-toggle-btn"
        type="button"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <i className="bx bx-moon"></i>
        ) : (
          <i className="bx bx-sun"></i>
        )}
      </button>
      
      {/* Language Toggle */}
      <button 
        onClick={toggleLanguage} 
        className="language-toggle-btn"
        type="button"
        title={language === 'en' ? 'Switch to Georgian' : 'Switch to English'}
      >
        {language === 'en' ? 'ENG' : 'ქარ'}
      </button>
    </div>
  );
}

export default ThemeToggle;
