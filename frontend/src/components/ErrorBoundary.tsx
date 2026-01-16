import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t, Language } from '@/lib/i18n';
import { logger } from "@/lib/logger";

const getLanguage = (): Language => {
  const saved = localStorage.getItem('nazim-language');
  return (['en', 'ps', 'fa', 'ar'].includes(saved as string) ? saved as Language : 'en');
};

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9), // Generate error ID for tracking
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    logger.error("ErrorBoundary caught an error", {
      component: 'ErrorBoundary',
      metadata: {
        errorId,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.retryCount,
        level: this.props.level || 'component',
      },
    });

    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Show toast notification for non-critical errors
    if (this.props.level !== 'critical') {
      const lang = getLanguage();
      toast.error(t('errorBoundary.somethingWentWrong', lang), {
        description: t('errorBoundary.workingOnFix', lang),
        action: {
          label: t('events.retry', lang),
          onClick: () => this.handleRetry(),
        },
      });
    }

    // Report to external monitoring
    this.reportError(error, errorInfo, errorId);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // Send to external error tracking service
      if (window.Sentry) {
        window.Sentry.withScope((scope) => {
          scope.setTag('errorBoundary', true);
          scope.setTag('errorId', errorId);
          scope.setTag('level', this.props.level || 'component');
          scope.setContext('errorInfo', {
            componentStack: errorInfo.componentStack,
            retryCount: this.retryCount,
          });
          window.Sentry.captureException(error);
        });
      }

      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: this.props.level === 'critical',
          error_id: errorId,
        });
      }
    } catch (reportError) {
      logger.error('Failed to report error to external services', {
        component: 'ErrorBoundary',
        metadata: { reportError: reportError.toString() },
      });
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info(`Retrying after error (attempt ${this.retryCount})`, {
        component: 'ErrorBoundary',
        metadata: { errorId: this.state.errorId },
      });
      
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    } else {
      const lang = getLanguage();
      toast.error(t('errorBoundary.maxRetriesReached', lang), {
        description: t('errorBoundary.refreshOrContactSupport', lang),
      });
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack?.substring(0, 500), // Limit stack trace length
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
    };

    const subject = encodeURIComponent(`Bug Report - Error ID: ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorDetails, null, 2)}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@greenvalley.edu?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Critical errors get a full-page error screen
      if (this.props.level === 'critical') {
        const lang = getLanguage();
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-900">{t('errorBoundary.applicationError', lang)}</CardTitle>
                <CardDescription>
                  {t('errorBoundary.applicationCrashed', lang)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Error ID: <code className="bg-gray-100 px-1 rounded">{this.state.errorId}</code></p>
                  {import.meta.env.DEV && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600">{t('errorBoundary.technicalDetails', lang)}</summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {this.state.error?.stack}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={this.handleRefresh} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('errorBoundary.refreshPage', lang)}
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    {t('errorBoundary.goHome', lang)}
                  </Button>
                </div>
                <Button variant="ghost" onClick={this.handleReportBug} className="w-full">
                  <Bug className="w-4 h-4 mr-2" />
                  {t('errorBoundary.reportBug', lang)}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Component-level errors get a smaller fallback
      const lang = getLanguage();
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">{t('errorBoundary.componentError', lang)}</h3>
                <p className="text-sm text-red-700 mt-1">
                  {t('errorBoundary.tryReloading', lang)}
                </p>
                {import.meta.env.DEV && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-red-600">
                      {t('errorBoundary.errorDetailsDev', lang)}
                    </summary>
                    <pre className="text-xs mt-1 p-2 bg-red-100 rounded overflow-auto max-h-32">
                      {this.state.error?.message}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2 mt-3">
                  {this.retryCount < this.maxRetries && (
                    <Button size="sm" onClick={this.handleRetry}>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t('events.retry', lang)} ({this.maxRetries - this.retryCount} left)
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={this.handleReportBug}>
                    <Bug className="w-3 h-3 mr-1" />
                    {t('errorBoundary.report', lang)}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    logger.error('Component error caught by useErrorHandler', {
      component: context || 'Unknown',
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    });

    // Re-throw to be caught by ErrorBoundary
    throw error;
  }, []);

  return handleError;
}

// Async error handler for promises
export function useAsyncErrorHandler() {
  const handleAsyncError = React.useCallback((error: Error, context?: string) => {
    const lang = getLanguage();
    logger.error('Async error caught', {
      component: context || 'Async',
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    });

    toast.error(t('errorBoundary.anErrorOccurred', lang), {
      description: error.message || t('errorBoundary.tryAgainLater', lang),
    });
  }, []);

  return handleAsyncError;
}

export default ErrorBoundary;
