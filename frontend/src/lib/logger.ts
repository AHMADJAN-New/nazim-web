export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;
  
  // Log levels hierarchy: error > warn > info > debug
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'warn';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context?.component) {
      return `${prefix} [${context.component}] ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    if (!this.isProduction) return;
    
    try {
      // Store critical logs via Laravel API for monitoring
      // TODO: Implement Laravel API endpoint for application logs
      // For now, logs are only sent to console and external monitoring services
      if (entry.level === 'error' || entry.level === 'warn') {
        // Future: Use Laravel API to persist logs
        // await apiClient.post('/logs', {
        //   level: entry.level,
        //   message: entry.message,
        //   context: entry.context,
        //   timestamp: entry.timestamp,
        //   user_agent: entry.userAgent,
        //   url: entry.url,
        // });
      }
    } catch (error) {
      // Fallback to console if logging service fails
      console.error('Failed to persist log:', error);
    }
  }

  private consoleLog(level: LogLevel, formattedMessage: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    // Use original console methods to avoid infinite loops with console-replacer
    // Store reference to original console methods
    const originalConsole = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
    };

    const logData = context?.metadata ? [formattedMessage, context.metadata] : [formattedMessage];

    switch (level) {
      case 'error':
        originalConsole.error(...logData);
        break;
      case 'warn':
        originalConsole.warn(...logData);
        break;
      case 'info':
        originalConsole.info(...logData);
        break;
      case 'debug':
        originalConsole.log(...logData);
        break;
    }
  }

  async log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    const formattedMessage = this.formatMessage(level, message, context);
    const logEntry = this.createLogEntry(level, message, context);

    // Console logging (always in development, limited in production)
    if (this.isDevelopment || level === 'error') {
      this.consoleLog(level, formattedMessage, context);
    }

    // Persist important logs
    await this.persistLog(logEntry);

    // Send to external monitoring services in production
    if (this.isProduction && level === 'error') {
      this.sendToMonitoring(logEntry);
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // Integration with external monitoring services
    if (window.Sentry) {
      window.Sentry.captureMessage(entry.message, {
        level: entry.level as any,
        extra: entry.context,
      });
    }

    // Custom analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: entry.message,
        fatal: entry.level === 'error',
      });
    }
  }

  // Convenience methods
  async error(message: string, context?: LogContext): Promise<void> {
    return this.log('error', message, context);
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    return this.log('warn', message, context);
  }

  async info(message: string, context?: LogContext): Promise<void> {
    return this.log('info', message, context);
  }

  async debug(message: string, context?: LogContext): Promise<void> {
    return this.log('debug', message, context);
  }

  // Performance logging
  async performance(name: string, duration: number, context?: LogContext): Promise<void> {
    return this.info(`Performance: ${name} took ${duration}ms`, {
      ...context,
      metadata: { ...context?.metadata, duration, performance: true },
    });
  }

  // User action logging
  async userAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    return this.info(`User action: ${action}`, {
      userId,
      action,
      metadata,
    });
  }

  // API call logging
  async apiCall(endpoint: string, method: string, statusCode: number, duration: number, context?: LogContext): Promise<void> {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    return this.log(level, `API ${method} ${endpoint} - ${statusCode} (${duration}ms)`, {
      ...context,
      metadata: { endpoint, method, statusCode, duration, api: true },
    });
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

export const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  // Suppress benign ResizeObserver warnings
  if (event.message === 'ResizeObserver loop completed with undelivered notifications.' ||
      event.message === 'ResizeObserver loop limit exceeded') {
    event.stopImmediatePropagation();
    return;
  }
  
  logger.error('Global error caught', {
    component: 'Global',
    metadata: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    },
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    component: 'Global',
    metadata: {
      reason: event.reason,
      stack: event.reason?.stack,
    },
  });
});

// Performance observer for Core Web Vitals
if (typeof PerformanceObserver !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navigation = entry as PerformanceNavigationTiming;
        logger.performance('Page Load', navigation.loadEventEnd - navigation.fetchStart, {
          component: 'Performance',
          metadata: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: navigation.loadEventStart - navigation.fetchStart,
          },
        });
      }
    }
  });
  
  observer.observe({ entryTypes: ['navigation'] });
}
