import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
import './lib/console-replacer' // Initialize logging system
import { initializeSecurity } from './lib/security' // Initialize security
import { initializePWA } from './lib/pwa' // Initialize PWA
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { initializePerformanceMonitoring } from './lib/performance' // Initialize performance monitoring
import { initializeAccessibility } from './lib/accessibility' // Initialize accessibility
import { LanguageProvider } from '@/hooks/useLanguage';

// Initialize security measures (lightweight, keep it)
initializeSecurity();

// Initialize PWA features asynchronously (non-blocking)
if (import.meta.env.PROD) {
  initializePWA().catch(console.error);
}

// Initialize performance monitoring only in production or when explicitly enabled
if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERF_MONITORING === 'true') {
  initializePerformanceMonitoring();
}

// Initialize accessibility features asynchronously (non-blocking)
setTimeout(() => {
  initializeAccessibility();
}, 0);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
