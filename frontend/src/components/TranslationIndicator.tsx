// Global Translation Indicator - Automatically processes translation strings in the DOM
import { useEffect } from 'react';

/**
 * Component that processes all text nodes in the DOM to add styling for translation indicators
 * This runs automatically to style [EN], [HARDCODED], and [MISSING] markers
 */
export function TranslationIndicator() {
  useEffect(() => {
    // Only run in development/strict mode
    const isDev = import.meta.env?.DEV || import.meta.env?.MODE === 'test';
    if (!isDev) return;

    const processTextNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent) {
          const text = node.textContent.trim();
          if (
            text.startsWith('[EN] ') ||
            text.startsWith('[HARDCODED] ') ||
            text.startsWith('[MISSING: ')
          ) {
            textNodes.push(node as Text);
          }
        }
      }

      // Process each text node
      textNodes.forEach((textNode) => {
        // Skip if already processed (has a wrapper parent)
        if (textNode.parentElement?.classList.contains('translation-indicator-wrapper')) {
          return;
        }

        const text = textNode.textContent || '';
        const parent = textNode.parentElement;
        if (!parent) return;

        // Verify the node is still a child of its parent (React might have removed it)
        if (!parent.contains(textNode)) {
          return;
        }

        // Create wrapper span
        const wrapper = document.createElement('span');
        wrapper.className = 'translation-indicator-wrapper';

        if (text.startsWith('[HARDCODED] ')) {
          const actualText = text.replace(/^\[HARDCODED\] /, '');
          wrapper.innerHTML = `
            <span class="translation-hardcoded">
              <span class="translation-hardcoded-badge" title="Hardcoded string detected. This should use a translation key instead of hardcoded text.">
                [HARDCODED]
              </span>
              <span class="translation-hardcoded-text">${actualText}</span>
            </span>
          `;
        } else if (text.startsWith('[EN] ')) {
          const actualText = text.replace(/^\[EN\] /, '');
          wrapper.innerHTML = `
            <span class="translation-fallback">
              <span class="translation-fallback-badge" title="Missing translation in current language. Showing English fallback.">
                [EN]
              </span>
              <span class="translation-fallback-text">${actualText}</span>
            </span>
          `;
        } else if (text.startsWith('[MISSING: ')) {
          wrapper.innerHTML = `
            <span class="translation-missing" style="color: hsl(var(--destructive)); font-weight: bold;">
              ${text}
            </span>
          `;
        }

        // Replace text node with wrapper - check if node is still valid
        try {
          if (parent.contains(textNode)) {
            parent.replaceChild(wrapper, textNode);
          }
        } catch (error) {
          // Node was removed by React, skip it
          if (import.meta.env.DEV) {
            console.warn('[TranslationIndicator] Failed to replace node (likely removed by React):', error);
          }
        }
      });
    };

    // Process on mount and after a short delay (to catch dynamically rendered content)
    processTextNodes();
    const timeout = setTimeout(processTextNodes, 1000);

    // Use MutationObserver to process new content
    const observer = new MutationObserver(() => {
      processTextNodes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return null;
}

