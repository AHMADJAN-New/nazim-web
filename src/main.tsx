import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/console-replacer' // Initialize logging system
import { initializeSecurity } from './lib/security' // Initialize security
import { initializePWA } from './lib/pwa' // Initialize PWA
import { initializePerformanceMonitoring } from './lib/performance' // Initialize performance monitoring
import { initializeAccessibility } from './lib/accessibility' // Initialize accessibility
import { LanguageProvider } from '@/hooks/useLanguage';

// Initialize security measures
initializeSecurity();

// Initialize PWA features
initializePWA();

// Initialize performance monitoring
initializePerformanceMonitoring();

// Initialize accessibility features
initializeAccessibility();

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
