import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
// DISABLED: Console replacer causes infinite logging loop
// import './lib/console-replacer' // Initialize logging system
import { initializeSecurity } from './lib/security' // Initialize security
import { initializePerformanceMonitoring } from './lib/performance' // Initialize performance monitoring
import { initializeAccessibility } from './lib/accessibility' // Initialize accessibility
import { LanguageProvider } from '@/hooks/useLanguage';

// Unregister any existing service workers (PWA removed for performance)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Service worker unregistered');
    });
  });
}

// Ensure right-click (context menu) works properly
// Fix: Allow right-click everywhere by default
// Only prevent on elements that explicitly need custom context menus
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  
  // Check if this is a Radix UI context menu trigger (they handle their own)
  const isRadixContextMenu = target.closest('[data-radix-context-menu-trigger]') ||
                             target.closest('[data-radix-context-menu-content]');
  
  // Check if element has explicit custom context menu
  const hasCustomContextMenu = target.closest('[data-context-menu]') || 
                               target.closest('[role="menuitem"]') ||
                               target.closest('.context-menu-trigger');
  
  // If it's a Radix context menu or custom context menu, let it handle itself
  if (isRadixContextMenu || hasCustomContextMenu) {
    // Don't interfere - let the component handle it
    return;
  }
  
  // For everything else, ensure default browser context menu works
  // Don't call preventDefault() - allow normal right-click behavior
}, false); // Use bubble phase, not capture, so we don't interfere

// Initialize security measures (lightweight, keep it)
initializeSecurity();

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
