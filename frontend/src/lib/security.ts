// Barrel export for backward compatibility
// This file re-exports all security utilities from their split modules

// Core security (startup code - lightweight)
export {
  csrf,
  csp,
  secureStorage,
  sessionSecurity,
  securityHeaders,
  initializeSecurity,
} from './security-core';

// Security utilities (heavy code - lazy-loaded)
export {
  sanitize,
  rateLimiters,
  passwordValidation,
  validate,
} from './security-utils';
