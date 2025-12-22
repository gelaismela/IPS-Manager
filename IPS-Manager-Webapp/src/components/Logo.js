import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Logo.css';

function Logo() {
  const { theme, language } = useTheme();
  
  // Map language code to filename format
  const langCode = language === 'en' ? 'en' : 'ge';
  
  // Construct logo filename based on theme and language
  const logoSrc = `/logos/logo-${langCode}-${theme}.png`;
  
  return (
    <img 
      key={`${langCode}-${theme}`}
      src={logoSrc} 
      alt="IPS Logo"
      className="app-logo"
      onError={(e) => {
        // Fallback to plain logo without text if specific one not found
        e.target.src = `/logos/logo-${theme}.png`;
      }}
    />
  );
}

export default Logo;
