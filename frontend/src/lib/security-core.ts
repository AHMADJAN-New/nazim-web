import { logger } from './logger';

// CSRF Protection
class CSRFProtection {
  private token: string | null = null;
  private readonly tokenKey = 'csrf_token';

  generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Store in sessionStorage (more secure than localStorage)
    sessionStorage.setItem(this.tokenKey, this.token);
    
    logger.debug('CSRF token generated', {
      component: 'CSRF',
    });
    
    return this.token;
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = sessionStorage.getItem(this.tokenKey);
    }
    return this.token;
  }

  validateToken(token: string): boolean {
    const storedToken = this.getToken();
    const isValid = storedToken === token && token.length === 64;
    
    if (!isValid) {
      logger.warn('CSRF token validation failed', {
        component: 'CSRF',
        metadata: { provided: !!token, stored: !!storedToken },
      });
    }
    
    return isValid;
  }

  clearToken(): void {
    this.token = null;
    sessionStorage.removeItem(this.tokenKey);
    
    logger.debug('CSRF token cleared', {
      component: 'CSRF',
    });
  }

  // Middleware for API requests
  addToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  }
}

export const csrf = new CSRFProtection();

// Content Security Policy helpers
export const csp = {
  generate: (options: {
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    additionalDomains?: string[];
  } = {}) => {
    const {
      allowInlineStyles = false,
      allowInlineScripts = false,
      additionalDomains = [],
    } = options;
    
    // Build connect-src with Laravel API
    // Note: CSP meta tags don't support wildcards, so we use exact domains
    const connectSrc = [
      "'self'",
      "https:",
      "wss:",
      "ws:",
      // Laravel API URLs
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      ...additionalDomains
    ].filter(Boolean).join(' ');

    // Build img-src, frame-src, and object-src
    const imgSrcParts = ["'self'", "data:", "https:", "http:"];
    const frameSrcParts = ["'self'", "blob:", "data:", "srcdoc:", "about:", "https:", "http:"];
    const objectSrcParts = ["'self'", "blob:", "data:", "https:", "http:"];

    const policies = [
      "default-src 'self' blob:",
      `script-src 'self' ${allowInlineScripts ? "'unsafe-inline'" : ''} ${additionalDomains.join(' ')}`,
      `style-src 'self' ${allowInlineStyles ? "'unsafe-inline'" : ''} https://fonts.googleapis.com`,
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src ${imgSrcParts.join(' ')}`,
      `frame-src ${frameSrcParts.join(' ')}`,
      `object-src ${objectSrcParts.join(' ')}`,
      `connect-src ${connectSrc}`,
      // Note: frame-ancestors cannot be set via meta tag, only via HTTP header
      "base-uri 'self'",
      "form-action 'self'",
    ];

    return policies.join('; ');
  },

  // Apply CSP via meta tag (for development)
  apply: (options?: Parameters<typeof csp.generate>[0]) => {
    // Remove any existing CSP meta tags
    const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingMeta) {
      existingMeta.remove();
    }
    
    const policy = csp.generate(options);
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = policy;
    document.head.appendChild(meta);
    
    // Log the policy in development for debugging
    if (import.meta.env.DEV) {
      console.log('🔒 CSP Applied:', policy);
    }
  },
};

// Secure storage utilities (minimal version for session management)
export const secureStorage = {
  // Encrypt sensitive data before storing
  setItem: (key: string, value: any, sensitive = false) => {
    try {
      const serialized = JSON.stringify(value);
      
      if (sensitive) {
        // Use sessionStorage for sensitive data
        sessionStorage.setItem(key, serialized);
        logger.debug('Sensitive data stored in session storage', {
          component: 'SecureStorage',
          metadata: { key },
        });
      } else {
        localStorage.setItem(key, serialized);
      }
    } catch (error) {
      logger.error('Failed to store data', {
        component: 'SecureStorage',
        metadata: { key, error: error.toString() },
      });
    }
  },

  getItem: (key: string, sensitive = false) => {
    try {
      const storage = sensitive ? sessionStorage : localStorage;
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logger.error('Failed to retrieve data', {
        component: 'SecureStorage',
        metadata: { key, error: error.toString() },
      });
      return null;
    }
  },

  removeItem: (key: string, sensitive = false) => {
    const storage = sensitive ? sessionStorage : localStorage;
    storage.removeItem(key);
  },

  clear: (sensitiveOnly = false) => {
    if (sensitiveOnly) {
      sessionStorage.clear();
    } else {
      localStorage.clear();
      sessionStorage.clear();
    }
  },
};

// Session security
export const sessionSecurity = {
  // Session timeout handling
  setupTimeout: (timeoutMs: number = 30 * 60 * 1000) => { // 30 minutes default
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logger.info('Session timed out', { component: 'SessionSecurity' });
        sessionSecurity.destroy();
        window.location.href = '/auth?reason=timeout';
      }, timeoutMs);
    };

    // Reset timeout on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Initial timeout
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  },

  // Destroy session
  destroy: () => {
    secureStorage.clear();
    csrf.clearToken();
    
    // Clear all cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    
    logger.info('Session destroyed', { component: 'SessionSecurity' });
  },

  // Check if session is valid
  isValid: (): boolean => {
    const lastActivity = secureStorage.getItem('last_activity');
    if (!lastActivity) return false;
    
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - lastActivity < thirtyMinutes;
  },

  // Update last activity
  updateActivity: () => {
    secureStorage.setItem('last_activity', Date.now());
  },
};

// Initialize security measures (minimal version for startup)
export const initializeSecurity = () => {
  // Generate CSRF token
  csrf.generateToken();
  
  // Apply CSP in development (lightweight, keep it)
  // Make it permissive in dev to allow Laravel API connections
  if (import.meta.env.DEV) {
    // In development, allow HTTP connections to localhost/127.0.0.1 for Laravel API
    // Note: CSP meta tags don't support port wildcards, so we use the exact URLs
    const connectSrcParts = [
      "'self'",
      "https:",
      "wss:",
      "ws:",
      // Add Laravel API URL
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ];
    
    // Build img-src for images (include blob: for image previews)
    const imgSrcParts = [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "http:", // Allow HTTP for local development
    ];
    
    // Build frame-src for PDFs and iframes (include data: and srcdoc: for preview iframes)
    const frameSrcParts = [
      "'self'",
      "blob:",
      "data:",
      "srcdoc:",
      "about:",
      "https:",
      "http:", // Allow HTTP for local development
    ];
    
    // Allow object-src for PDF/object embeds in dev (includes http/https and data URIs)
    const objectSrcParts = [
      "'self'",
      "blob:",
      "data:", // Allow data URIs for base64-encoded PDFs
      "https:",
      "http:", // Allow HTTP for local development (PDF/object)
    ];

    const policy = [
      "default-src 'self' blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src ${imgSrcParts.join(' ')}`,
      `connect-src ${connectSrcParts.join(' ')}`,
      `frame-src ${frameSrcParts.join(' ')}`,
      `object-src ${objectSrcParts.join(' ')}`,
      // Note: frame-ancestors cannot be set via meta tag, only via HTTP header
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    
    // Remove any existing CSP meta tags
    const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingMeta) {
      existingMeta.remove();
    }
    
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = policy;
    document.head.appendChild(meta);
    
    console.log('🔒 CSP Applied (Development Mode - Permissive):', policy);
  }
  
  // Setup session timeout (defer to avoid blocking)
  setTimeout(() => {
    sessionSecurity.setupTimeout();
    sessionSecurity.updateActivity();
  }, 0);
  
  logger.info('Security measures initialized', {
    component: 'Security',
  });
};

// Security headers
export const securityHeaders = {
  // Generate security headers for API responses
  generate: () => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }),
};
