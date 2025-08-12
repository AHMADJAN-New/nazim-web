import React from 'react';
import { logger } from './logger';

// Accessibility utilities and helpers
export const a11y = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix = 'a11y'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Announce to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const announcer = document.getElementById('a11y-announcer') || createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);

    logger.debug('Screen reader announcement', {
      component: 'Accessibility',
      metadata: { message, priority },
    });
  },

  // Focus management
  focus: {
    // Move focus to element
    moveTo: (element: HTMLElement | null): boolean => {
      if (!element) return false;
      
      try {
        element.focus();
        logger.debug('Focus moved', {
          component: 'Accessibility',
          metadata: { element: element.tagName, id: element.id },
        });
        return true;
      } catch (error) {
        logger.warn('Failed to move focus', {
          component: 'Accessibility',
          metadata: { error: error.toString() },
        });
        return false;
      }
    },

    // Focus first focusable element in container
    moveToFirst: (container: HTMLElement): boolean => {
      const focusable = getFocusableElements(container);
      return focusable.length > 0 ? a11y.focus.moveTo(focusable[0]) : false;
    },

    // Focus last focusable element in container
    moveToLast: (container: HTMLElement): boolean => {
      const focusable = getFocusableElements(container);
      return focusable.length > 0 ? a11y.focus.moveTo(focusable[focusable.length - 1]) : false;
    },

    // Trap focus within container
    trap: (container: HTMLElement): (() => void) => {
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return () => {};

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstFocusable) {
              event.preventDefault();
              lastFocusable.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              event.preventDefault();
              firstFocusable.focus();
            }
          }
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      
      // Focus first element
      firstFocusable.focus();

      // Return cleanup function
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    },
  },

  // Color contrast utilities
  contrast: {
    // Calculate relative luminance
    getLuminance: (hex: string): number => {
      const rgb = hexToRgb(hex);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    // Calculate contrast ratio
    getRatio: (color1: string, color2: string): number => {
      const lum1 = a11y.contrast.getLuminance(color1);
      const lum2 = a11y.contrast.getLuminance(color2);
      
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      
      return (brightest + 0.05) / (darkest + 0.05);
    },

    // Check if contrast meets WCAG standards
    meetsWCAG: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): {
      normal: boolean;
      large: boolean;
      ratio: number;
    } => {
      const ratio = a11y.contrast.getRatio(color1, color2);
      const normalThreshold = level === 'AA' ? 4.5 : 7;
      const largeThreshold = level === 'AA' ? 3 : 4.5;

      return {
        normal: ratio >= normalThreshold,
        large: ratio >= largeThreshold,
        ratio,
      };
    },
  },

  // Keyboard navigation helpers
  keyboard: {
    // Handle arrow key navigation
    handleArrowKeys: (
      event: KeyboardEvent,
      items: HTMLElement[],
      currentIndex: number,
      options: {
        orientation?: 'horizontal' | 'vertical' | 'both';
        wrap?: boolean;
      } = {}
    ): number => {
      const { orientation = 'vertical', wrap = true } = options;
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
            event.preventDefault();
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
            event.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
            event.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
            event.preventDefault();
          }
          break;
        case 'Home':
          newIndex = 0;
          event.preventDefault();
          break;
        case 'End':
          newIndex = items.length - 1;
          event.preventDefault();
          break;
      }

      if (newIndex !== currentIndex && items[newIndex]) {
        items[newIndex].focus();
      }

      return newIndex;
    },
  },

  // ARIA helpers
  aria: {
    // Set ARIA attributes
    setAttributes: (element: HTMLElement, attributes: Record<string, string | boolean | number>): void => {
      Object.entries(attributes).forEach(([key, value]) => {
        const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
        element.setAttribute(ariaKey, String(value));
      });
    },

    // Live region helpers
    createLiveRegion: (priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
      const region = document.createElement('div');
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
      return region;
    },
  },
};

// Utility functions
function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div');
  announcer.id = 'a11y-announcer';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  document.body.appendChild(announcer);
  return announcer;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

// React hooks for accessibility
export function useAnnouncer() {
  return React.useCallback((message: string, priority?: 'polite' | 'assertive') => {
    a11y.announce(message, priority);
  }, []);
}

export function useFocusTrap(ref: React.RefObject<HTMLElement>, active = true) {
  React.useEffect(() => {
    if (!active || !ref.current) return;

    const cleanup = a11y.focus.trap(ref.current);
    return cleanup;
  }, [ref, active]);
}

export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    autoFocus?: boolean;
  } = {}
) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const { orientation = 'vertical', wrap = true, autoFocus = false } = options;

  React.useEffect(() => {
    if (autoFocus && items[0]) {
      items[0].focus();
    }
  }, [items, autoFocus]);

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      const newIndex = a11y.keyboard.handleArrowKeys(event, items, currentIndex, {
        orientation,
        wrap,
      });
      setCurrentIndex(newIndex);
    },
    [items, currentIndex, orientation, wrap]
  );

  React.useEffect(() => {
    const container = items[0]?.closest('[role]') as HTMLElement;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return { currentIndex, setCurrentIndex };
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(
    () => window.matchMedia('(prefers-contrast: high)').matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = () => setPrefersHighContrast(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// HOC for accessibility features
export function withAccessibility<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    announceOnMount?: string;
    focusOnMount?: boolean;
    skipLinks?: Array<{ href: string; text: string }>;
  } = {}
) {
  return React.forwardRef<any, T>((props, ref) => {
    const announce = useAnnouncer();
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (options.announceOnMount) {
        announce(options.announceOnMount);
      }
      
      if (options.focusOnMount && containerRef.current) {
        a11y.focus.moveToFirst(containerRef.current);
      }
    }, [announce]);

    return (
      <div ref={containerRef}>
        {options.skipLinks && (
          <div className="sr-only focus:not-sr-only">
            {options.skipLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-primary text-primary-foreground p-2 z-50"
              >
                {link.text}
              </a>
            ))}
          </div>
        )}
        <Component {...(props as T)} />
      </div>
    );
  });
}

// Accessibility audit tools
export const a11yAudit = {
  // Check for common accessibility issues
  runBasicAudit: (): {
    score: number;
    issues: Array<{ type: string; message: string; element?: HTMLElement }>;
  } => {
    const issues: Array<{ type: string; message: string; element?: HTMLElement }> = [];

    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach(img => {
      issues.push({
        type: 'missing-alt',
        message: 'Image missing alt text',
        element: img as HTMLElement,
      });
    });

    // Check for missing form labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        issues.push({
          type: 'missing-label',
          message: 'Form input missing label',
          element: input as HTMLElement,
        });
      }
    });

    // Check for proper heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      if (currentLevel > lastLevel + 1) {
        issues.push({
          type: 'heading-hierarchy',
          message: `Heading level ${currentLevel} skips level ${lastLevel + 1}`,
          element: heading as HTMLElement,
        });
      }
      lastLevel = currentLevel;
    });

    // Check for low contrast (simplified)
    const elements = document.querySelectorAll('[style*="color"]');
    elements.forEach(element => {
      const style = window.getComputedStyle(element as Element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      if (color && backgroundColor) {
        // This is a simplified check - in practice, you'd need proper color parsing
        if (color === backgroundColor) {
          issues.push({
            type: 'low-contrast',
            message: 'Potentially low color contrast',
            element: element as HTMLElement,
          });
        }
      }
    });

    const totalChecks = images.length + inputs.length + headings.length + elements.length;
    const score = totalChecks > 0 ? Math.max(0, 100 - (issues.length / totalChecks) * 100) : 100;

    logger.info('Accessibility audit completed', {
      component: 'Accessibility',
      metadata: { score, issueCount: issues.length },
    });

    return { score, issues };
  },

  // Generate accessibility report
  generateReport: (): string => {
    const { score, issues } = a11yAudit.runBasicAudit();
    
    let report = `Accessibility Audit Report\n`;
    report += `==========================\n\n`;
    report += `Overall Score: ${score.toFixed(1)}/100\n`;
    report += `Issues Found: ${issues.length}\n\n`;

    if (issues.length > 0) {
      report += `Issues:\n`;
      issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue.type}: ${issue.message}\n`;
      });
    } else {
      report += `No issues found! 🎉\n`;
    }

    return report;
  },
};

// Initialize accessibility features
export const initializeAccessibility = () => {
  // Create announcer element
  createAnnouncer();

  // Add skip links styles
  const skipLinkStyles = document.createElement('style');
  skipLinkStyles.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .sr-only:focus,
    .focus\\:not-sr-only:focus {
      position: static;
      width: auto;
      height: auto;
      padding: inherit;
      margin: inherit;
      overflow: visible;
      clip: auto;
      white-space: normal;
    }
  `;
  document.head.appendChild(skipLinkStyles);

  // Set up global keyboard event handling for escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Close any open modals, dropdowns, etc.
      const openElements = document.querySelectorAll('[aria-expanded="true"]');
      openElements.forEach(element => {
        element.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Run initial audit in development
  if (import.meta.env.DEV) {
    setTimeout(() => {
      const audit = a11yAudit.runBasicAudit();
      if (audit.issues.length > 0) {
        console.warn('Accessibility issues found:', audit.issues);
      }
    }, 2000);
  }

  logger.info('Accessibility features initialized', {
    component: 'Accessibility',
  });
};