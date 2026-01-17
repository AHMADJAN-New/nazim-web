// Translation Text Component - Handles fallback indicator styling
import React from 'react';

interface TranslationTextProps {
  text: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Component that processes translation strings and highlights English fallback text
 * Detects [EN] prefix and styles it with a badge and dotted underline
 */
export function TranslationText({ text, className = '', as: Component = 'span' }: TranslationTextProps) {
  // Check if text starts with [HARDCODED] prefix (hardcoded string)
  const isHardcoded = text.startsWith('[HARDCODED] ');
  
  if (isHardcoded) {
    // Extract the actual text (remove [HARDCODED] prefix)
    const actualText = text.replace(/^\[HARDCODED\] /, '');
    
    return (
      <Component className={className}>
        <span className="translation-hardcoded">
          <span className="translation-hardcoded-badge" title={`Hardcoded string detected. This should use a translation key instead of hardcoded text.`}>
            [HARDCODED]
          </span>
          <span className="translation-hardcoded-text">{actualText}</span>
        </span>
      </Component>
    );
  }
  
  // Check if text starts with [EN] prefix (English fallback)
  const isFallback = text.startsWith('[EN] ');
  
  if (isFallback) {
    // Extract the actual text (remove [EN] prefix)
    const actualText = text.replace(/^\[EN\] /, '');
    // Extract language from context if available (for future use)
    const lang = text.match(/\[EN_FALLBACK:(\w+)\]/)?.[1] || 'unknown';
    
    return (
      <Component className={className}>
        <span className="translation-fallback">
          <span className="translation-fallback-badge" title={`Missing translation in current language. Showing English fallback.`}>
            [EN]
          </span>
          <span className="translation-fallback-text">{actualText}</span>
        </span>
      </Component>
    );
  }
  
  // Regular translation (not a fallback or hardcoded)
  return <Component className={className}>{text}</Component>;
}

