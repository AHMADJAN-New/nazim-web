import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
// DISABLED: Console replacer causes infinite logging loop
// import './lib/console-replacer' // Initialize logging system
import { LanguageProvider } from '@/hooks/useLanguage';
import { RootBootstrap } from './RootBootstrap';

// Unregister any existing service workers (PWA removed for performance)
// Add error handling to prevent errors when document is in invalid state (e.g., PDF iframes)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {
            // Silently ignore unregistration errors
          });
          if (import.meta.env.DEV) {
            console.log('Service worker unregistered');
          }
        });
      })
      .catch((error) => {
        // Silently ignore errors when document is in invalid state (e.g., PDF iframes)
        if (import.meta.env.DEV) {
          console.debug('Service worker registration check failed (likely in iframe):', error);
        }
      });
  } catch (error) {
    // Silently ignore errors when service worker API is not available or document is invalid
    if (import.meta.env.DEV) {
      console.debug('Service worker unregistration skipped:', error);
    }
  }
}

// Ensure right-click (context menu) works properly
// Fix: Allow right-click everywhere by default
// Only prevent on elements that explicitly need custom context menus
// Keep this listener - it's cheap and non-blocking
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <RootBootstrap>
        <App />
      </RootBootstrap>
    </LanguageProvider>
  </StrictMode>
);
