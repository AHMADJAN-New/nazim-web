import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t, Language } from '@/lib/i18n';
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/api/client";

const getLanguage = (): Language => {
  const saved = localStorage.getItem('nazim-language');
  return (['en', 'ps', 'fa', 'ar'].includes(saved as string) ? saved as Language : 'ps');
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
  reportDbId?: string | null;
  reportDialogOpen: boolean;
  userNote: string;
  isSubmittingReport: boolean;
  reportSubmitted: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    reportDialogOpen: false,
    userNote: '',
    isSubmittingReport: false,
    reportSubmitted: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9),
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

    this.props.onError?.(error, errorInfo);

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

    void this.persistError(error, errorInfo, errorId);
    void this.reportToExternalServices(error, errorInfo, errorId);
  }

  private persistError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      const response = await apiClient.post<{ data: { id: string } }>('/client-error-reports', {
        client_error_id: errorId,
        message: (error.message || 'Unknown error').slice(0, 4000),
        stack: error.stack?.slice(0, 12000) ?? null,
        component_stack: errorInfo.componentStack?.slice(0, 12000) ?? null,
        url: window.location.href,
        level: this.props.level || 'component',
        user_agent: navigator.userAgent.slice(0, 500),
      });
      const id = response?.data?.id ?? null;
      if (id) {
        this.setState({ reportDbId: id });
      }
    } catch (persistError) {
      logger.error('Failed to persist error report', {
        component: 'ErrorBoundary',
        metadata: { persistError: String(persistError) },
      });
    }
  };

  private reportToExternalServices = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
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
        reportDbId: null,
        reportDialogOpen: false,
        userNote: '',
        reportSubmitted: false,
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

  private handleOpenReportDialog = () => {
    this.setState({ reportDialogOpen: true });
  };

  private handleSubmitReport = async () => {
    const lang = getLanguage();
    this.setState({ isSubmittingReport: true });

    try {
      let dbId = this.state.reportDbId;

      if (!dbId && this.state.error) {
        const response = await apiClient.post<{ data: { id: string } }>('/client-error-reports', {
          client_error_id: this.state.errorId,
          message: (this.state.error.message || 'Unknown error').slice(0, 4000),
          stack: this.state.error.stack?.slice(0, 12000) ?? null,
          component_stack: this.state.errorInfo?.componentStack?.slice(0, 12000) ?? null,
          url: window.location.href,
          level: this.props.level || 'component',
          user_agent: navigator.userAgent.slice(0, 500),
        });
        dbId = response?.data?.id ?? null;
        if (dbId) {
          this.setState({ reportDbId: dbId });
        }
      }

      if (!dbId) {
        toast.error(t('errorBoundary.reportFailed', lang) || 'Could not submit report. Please try again.');
        return;
      }

      await apiClient.patch(`/client-error-reports/${dbId}/report`, {
        user_note: this.state.userNote.trim() || null,
      });

      this.setState({
        reportSubmitted: true,
        reportDialogOpen: false,
        userNote: '',
      });
      toast.success(t('errorBoundary.reportSent', lang) || 'Thank you. Your report was submitted.');
    } catch (err) {
      logger.error('Failed to submit user error report', {
        component: 'ErrorBoundary',
        metadata: { err: String(err) },
      });
      toast.error(t('errorBoundary.reportFailed', lang) || 'Could not submit report. Please try again.');
    } finally {
      this.setState({ isSubmittingReport: false });
    }
  };

  private renderReportDialog() {
    const lang = getLanguage();
    return (
      <Dialog
        open={this.state.reportDialogOpen}
        onOpenChange={(open) => this.setState({ reportDialogOpen: open })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('errorBoundary.reportBug', lang)}</DialogTitle>
            <DialogDescription>
              {t('errorBoundary.reportDescription', lang) ||
                'Optionally describe what you were doing. The error details are already saved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="error-user-note">
              {t('errorBoundary.whatWereYouDoing', lang) || 'What were you doing? (optional)'}
            </Label>
            <Textarea
              id="error-user-note"
              value={this.state.userNote}
              onChange={(e) => this.setState({ userNote: e.target.value })}
              rows={4}
              maxLength={2000}
              placeholder={t('errorBoundary.notePlaceholder', lang) || 'Describe the steps that led to this error…'}
            />
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => this.setState({ reportDialogOpen: false })}
              disabled={this.state.isSubmittingReport}
            >
              {t('common.cancel', lang) || 'Cancel'}
            </Button>
            <Button onClick={() => void this.handleSubmitReport()} disabled={this.state.isSubmittingReport}>
              {this.state.isSubmittingReport
                ? (t('common.saving', lang) || 'Submitting…')
                : (t('errorBoundary.submitReport', lang) || 'Submit report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  private renderReportButton(fullWidth = false) {
    const lang = getLanguage();
    if (this.state.reportSubmitted) {
      return (
        <Button variant="ghost" className={fullWidth ? 'w-full' : undefined} disabled>
          <Bug className="w-4 h-4 mr-2" />
          {t('errorBoundary.reportSent', lang) || 'Report submitted'}
        </Button>
      );
    }

    return (
      <Button
        variant={fullWidth ? 'ghost' : 'outline'}
        size={fullWidth ? 'default' : 'sm'}
        className={fullWidth ? 'w-full' : undefined}
        onClick={this.handleOpenReportDialog}
      >
        <Bug className={fullWidth ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1'} />
        {fullWidth ? t('errorBoundary.reportBug', lang) : t('errorBoundary.report', lang)}
      </Button>
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.level === 'critical') {
        const lang = getLanguage();
        return (
          <>
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
                  {this.renderReportButton(true)}
                </CardContent>
              </Card>
            </div>
            {this.renderReportDialog()}
          </>
        );
      }

      const lang = getLanguage();
      return (
        <>
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
                    {this.renderReportButton(false)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {this.renderReportDialog()}
        </>
      );
    }

    return this.props.children;
  }
}

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

export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    logger.error('Component error caught by useErrorHandler', {
      component: context || 'Unknown',
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    });

    throw error;
  }, []);

  return handleError;
}

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
