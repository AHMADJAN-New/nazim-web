import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitter?: boolean;
  shouldRetry?: (error: any, attemptNumber: number) => boolean;
  onRetry?: (error: any, attemptNumber: number) => void;
  onFailure?: (error: any, attemptNumber: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
  jitter: true,
  shouldRetry: (error: any) => {
    // Don't retry client errors (4xx) except for specific cases
    if (error?.status >= 400 && error?.status < 500) {
      return error?.status === 408 || error?.status === 429; // Timeout or Rate Limit
    }
    // Retry server errors (5xx) and network errors
    return true;
  },
  onRetry: () => {},
  onFailure: () => {},
};

// Calculate delay with exponential backoff and optional jitter
function calculateDelay(
  attemptNumber: number,
  baseDelay: number,
  maxDelay: number,
  exponentialBase: number,
  jitter: boolean
): number {
  const exponentialDelay = baseDelay * Math.pow(exponentialBase, attemptNumber - 1);
  const delay = Math.min(exponentialDelay, maxDelay);
  
  if (jitter) {
    // Add jitter to prevent thundering herd
    return delay * (0.5 + Math.random() * 0.5);
  }
  
  return delay;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`, {
          component: 'Retry',
          metadata: { context, attempts: attempt },
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      logger.warn(`Operation failed on attempt ${attempt}`, {
        component: 'Retry',
        metadata: {
          context,
          attempt,
          maxAttempts: opts.maxAttempts,
          error: error?.message || error?.toString(),
        },
      });

      // Check if we should retry this error
      if (!opts.shouldRetry(error, attempt)) {
        logger.error('Operation failed (non-retryable error)', {
          component: 'Retry',
          metadata: { context, error: error?.message || error?.toString() },
        });
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < opts.maxAttempts) {
        const delay = calculateDelay(
          attempt,
          opts.baseDelay,
          opts.maxDelay,
          opts.exponentialBase,
          opts.jitter
        );

        opts.onRetry(error, attempt);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  opts.onFailure(lastError, opts.maxAttempts);
  
  logger.error(`Operation failed after ${opts.maxAttempts} attempts`, {
    component: 'Retry',
    metadata: {
      context,
      maxAttempts: opts.maxAttempts,
      finalError: lastError?.message || lastError?.toString(),
    },
  });

  throw lastError;
}

// Circuit Breaker Pattern
export class CircuitBreaker {
  private failureCount = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      ...options,
    };
  }

  async execute<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error('Circuit breaker is OPEN');
        logger.warn('Circuit breaker rejected request', {
          component: 'CircuitBreaker',
          metadata: { context, state: this.state },
        });
        throw error;
      } else {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          component: 'CircuitBreaker',
          metadata: { context },
        });
      }
    }

    try {
      const result = await operation();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(error, context);
      throw error;
    }
  }

  private onSuccess(context?: string) {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker closed after successful operation', {
        component: 'CircuitBreaker',
        metadata: { context },
      });
    }
  }

  private onFailure(error: any, context?: string) {
    this.failureCount++;
    
    logger.warn(`Circuit breaker recorded failure ${this.failureCount}`, {
      component: 'CircuitBreaker',
      metadata: {
        context,
        failureCount: this.failureCount,
        threshold: this.options.failureThreshold,
        error: error?.message,
      },
    });

    if (this.failureCount >= this.options.failureThreshold!) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.recoveryTimeout!;
      
      logger.error('Circuit breaker opened due to repeated failures', {
        component: 'CircuitBreaker',
        metadata: {
          context,
          failureCount: this.failureCount,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        },
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    
    logger.info('Circuit breaker manually reset', {
      component: 'CircuitBreaker',
    });
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  supabase: new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 30000 }),
  external: new CircuitBreaker({ failureThreshold: 5, recoveryTimeout: 60000 }),
};

// Enhanced fetch with retry and circuit breaker
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {},
  useCircuitBreaker = true
): Promise<Response> {
  const startTime = Date.now();
  const circuitBreaker = circuitBreakers.external;

  const operation = async () => {
    const response = await fetch(url, options);
    
    // Log the API call
    logger.apiCall(
      url,
      options.method || 'GET',
      response.status,
      Date.now() - startTime
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  };

  if (useCircuitBreaker) {
    return circuitBreaker.execute(
      () => withRetry(operation, retryOptions, `fetch ${url}`),
      `fetch ${url}`
    );
  }

  return withRetry(operation, retryOptions, `fetch ${url}`);
}

// Retry decorator for class methods
export function retryable(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => method.apply(this, args),
        options,
        `${target.constructor.name}.${propertyName}`
      );
    };

    return descriptor;
  };
}

// Timeout wrapper
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Batch retry for multiple operations
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<T | Error>> {
  const results = await Promise.allSettled(
    operations.map((op, index) =>
      withRetry(op, options, `batch operation ${index}`)
    )
  );

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : result.reason
  );
}