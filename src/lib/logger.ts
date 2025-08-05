type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Only log to console in development
    if (this.isDevelopment) {
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }

    // In production, we could send logs to a monitoring service
    // For now, we'll store them in session storage for debugging
    if (!this.isDevelopment) {
      try {
        const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
        logs.push({
          level,
          message,
          data,
          timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        sessionStorage.setItem('app_logs', JSON.stringify(logs));
      } catch (e) {
        // Silently fail if storage is not available
      }
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  // Method to get logs for debugging
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  // Method to clear logs
  clearLogs(): void {
    sessionStorage.removeItem('app_logs');
  }
}

export const logger = new Logger();
