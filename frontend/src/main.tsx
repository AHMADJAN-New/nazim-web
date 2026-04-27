import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

import './index.css'
// DISABLED: Console replacer causes infinite logging loop
// import './lib/console-replacer' // Initialize logging system

import { RootBootstrap } from './RootBootstrap';

import { DatePreferenceProvider } from '@/hooks/useDatePreference';
import { LanguageProvider } from '@/hooks/useLanguage';

// Service worker policy:
// - Regular browser tabs: keep the SW unregistered. The PWA was removed
//   from the web app for performance and we don't want it back there.
// - Electron desktop: register /sw.js so the SPA shell + JS/CSS bundle
//   get cached on first online boot, letting the app load on subsequent
//   offline launches.
//
// Guard against sandboxed/invalid documents (PDF viewers etc.) that
// throw InvalidStateError on serviceWorker.* access.
const isElectronRenderer =
  typeof window !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Boolean((window as any).electron?.offline);

if ('serviceWorker' in navigator) {
  try {
    if (isElectronRenderer) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // SW registration is best-effort — failure means offline boots
          // won't have the shell cached, but everything else still works.
        });
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {
              // ignore unregister issues in sandboxed contexts
            });
          });
        })
        .catch(() => {
          // ignore InvalidStateError or other errors when document is not eligible
        });
    }
  } catch {
    // ignore InvalidStateError when the document is in an invalid state (e.g., embedded PDF)
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
      <DatePreferenceProvider>
        <RootBootstrap>
          <App />
        </RootBootstrap>
      </DatePreferenceProvider>
    </LanguageProvider>
  </StrictMode>
);
