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

  // Sanitize rich text editor HTML (DMS templates, etc.)
  richText: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'div',
        'span',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'ol',
        'ul',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ],
      ALLOWED_ATTR: ['style', 'dir', 'align'],
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
