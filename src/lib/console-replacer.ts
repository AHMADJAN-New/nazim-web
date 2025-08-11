import { logger } from './logger';

// Global console override for development
if (import.meta.env.DEV) {
  const originalConsole = { ...console };

  // Override console methods to also send to our logger
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    logger.debug(args.join(' '), { component: 'Console' });
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    logger.info(args.join(' '), { component: 'Console' });
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    logger.warn(args.join(' '), { component: 'Console' });
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    logger.error(args.join(' '), { component: 'Console' });
  };
}

// Helper functions for common logging patterns
export const logAuthEvent = (event: string, email?: string, metadata?: any) => {
  logger.info(`Auth: ${event}`, {
    component: 'Authentication',
    action: event,
    metadata: { email: email ? '[REDACTED]' : undefined, ...metadata },
  });
};

export const logUserAction = (action: string, userId?: string, metadata?: any) => {
  logger.userAction(action, userId || 'anonymous', metadata);
};

export const logApiCall = async (
  endpoint: string,
  method: string,
  startTime: number,
  response?: Response,
  error?: any
) => {
  const duration = Date.now() - startTime;
  const statusCode = response?.status || (error ? 500 : 0);
  
  await logger.apiCall(endpoint, method, statusCode, duration, {
    component: 'API',
    metadata: error ? { error: error.message } : undefined,
  });
};

export const logComponentError = (componentName: string, error: Error, props?: any) => {
  logger.error(`Component error in ${componentName}`, {
    component: componentName,
    metadata: {
      error: error.message,
      stack: error.stack,
      props: props ? Object.keys(props) : undefined, // Don't log actual prop values for privacy
    },
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  if (duration > 1000) { // Log slow operations
    logger.performance(operation, duration, {
      component: 'Performance',
      metadata,
    });
  }
};

// Hook for measuring React component performance
export const usePerformanceLogger = (componentName: string) => {
  const logRender = (renderTime: number) => {
    if (renderTime > 16) { // Log renders taking more than one frame (60fps)
      logPerformance(`${componentName} render`, renderTime);
    }
  };

  return { logRender };
};