import DOMPurify from 'isomorphic-dompurify';
import { logger } from './logger';

// Input sanitization
export const sanitize = {
  // Sanitize HTML content
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
    });
  },

  // Sanitize text (remove all HTML)
  text: (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  },

  // Sanitize SQL inputs (basic protection)
  sql: (input: string): string => {
    return input
      .replace(/['";\\]/g, '') // Remove dangerous characters
      .trim();
  },

  // Sanitize file names
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe characters
      .substring(0, 255); // Limit length
  },

  // Sanitize email
  email: (input: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = input.toLowerCase().trim();
    return emailRegex.test(sanitized) ? sanitized : '';
  },

  // Sanitize phone number
  phone: (input: string): string => {
    return input.replace(/[^+\d\s()-]/g, '').trim();
  },

  // Sanitize URL
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },
};

// Rate limiting
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Update the requests array
    this.requests.set(identifier, recentRequests);
    
    // Check if limit is exceeded
    if (recentRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', {
        component: 'RateLimiter',
        metadata: { identifier, requests: recentRequests.length, limit: this.maxRequests },
      });
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }

  clear(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}

// Global rate limiters
export const rateLimiters = {
  api: new RateLimiter(100, 60000), // 100 requests per minute
  auth: new RateLimiter(5, 300000), // 5 auth attempts per 5 minutes
  search: new RateLimiter(50, 60000), // 50 searches per minute
  upload: new RateLimiter(10, 600000), // 10 uploads per 10 minutes
};

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

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let supabaseDomains: string[] = [];
    
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        const origin = url.origin;
        // Add REST API domain (HTTPS)
        supabaseDomains.push(origin);
        // Add Realtime WebSocket domain (WSS)
        const wsOrigin = origin.replace('https://', 'wss://').replace('http://', 'ws://');
        supabaseDomains.push(wsOrigin);
      } catch (e) {
        // Invalid URL, skip
        console.warn('Invalid Supabase URL in CSP:', supabaseUrl);
      }
    }
    
    // Build connect-src with Supabase URLs
    // Note: CSP meta tags don't support wildcards, so we use exact domains
    const connectSrc = [
      "'self'",
      ...supabaseDomains,
      ...additionalDomains
    ].filter(Boolean).join(' ');

    const policies = [
      "default-src 'self'",
      `script-src 'self' ${allowInlineScripts ? "'unsafe-inline'" : ''} ${additionalDomains.join(' ')}`,
      `style-src 'self' ${allowInlineStyles ? "'unsafe-inline'" : ''} https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
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

// Secure storage utilities
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

// Password strength validation
export const passwordValidation = {
  strength: (password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } => {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid common sequences');
    }

    const isStrong = score >= 5;

    return { score: Math.max(0, score), feedback, isStrong };
  },

  // Check against common passwords
  isCommon: (password: string): boolean => {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', '1234567890'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  },
};

// Input validation
export const validate = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // SQL injection patterns
  sqlInjection: (input: string): boolean => {
    const sqlPatterns = [
      /('|(\\')|(;)|(\\))/i,
      /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /exec(\s|\+)+(s|x)p\w+/i,
      /union\s+select/i,
      /drop\s+table/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  // XSS patterns
  xss: (input: string): boolean => {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },
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

// Initialize security measures
export const initializeSecurity = () => {
  // Generate CSRF token
  csrf.generateToken();
  
  // Apply CSP in development (lightweight, keep it)
  // Make it permissive in dev to allow Supabase connections
  if (import.meta.env.DEV) {
    // Get Supabase URL to add to CSP
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let supabaseConnectSrc = '';
    
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        // Add the exact Supabase URL to connect-src
        supabaseConnectSrc = ` ${url.origin}`;
        // Also add WebSocket version
        const wsOrigin = url.origin.replace('https://', 'wss://').replace('http://', 'ws://');
        supabaseConnectSrc += ` ${wsOrigin}`;
      } catch (e) {
        console.warn('Invalid Supabase URL for CSP:', supabaseUrl);
      }
    }
    
    // In development, allow HTTP connections to localhost/127.0.0.1 for local Supabase
    // Note: CSP meta tags don't support port wildcards, so we use the exact Supabase URL
    const connectSrcParts = [
      "'self'",
      "https:",
      "wss:",
      "ws:",
    ];
    
    // Add Supabase URL if available
    if (supabaseConnectSrc) {
      connectSrcParts.push(supabaseConnectSrc.trim());
    } else {
      // Fallback: allow common localhost ports for Supabase
      connectSrcParts.push(
        "http://127.0.0.1:54321",
        "http://localhost:54321",
        "ws://127.0.0.1:54321",
        "ws://localhost:54321"
      );
    }
    
    // Build img-src with Supabase URL for images
    const imgSrcParts = [
      "'self'",
      "data:",
      "https:",
    ];
    
    // Add Supabase URL for images in development
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        imgSrcParts.push(url.origin);
      } catch (e) {
        // Fallback: allow common localhost ports for Supabase
        imgSrcParts.push(
          "http://127.0.0.1:54321",
          "http://localhost:54321"
        );
      }
    } else {
      // Fallback: allow common localhost ports for Supabase
      imgSrcParts.push(
        "http://127.0.0.1:54321",
        "http://localhost:54321"
      );
    }
    
    const policy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src ${imgSrcParts.join(' ')}`,
      `connect-src ${connectSrcParts.join(' ')}`,
      "frame-ancestors 'none'",
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