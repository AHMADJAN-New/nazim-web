// src/hooks/useServerReport.ts
// Hook for server-side report generation with progress tracking

import { useState, useCallback, useRef, useEffect } from 'react';

import { apiClient } from '@/lib/api/client';
import type {
  ServerReportOptions,
  GenerateReportRequest,
  GenerateReportResponse,
  ReportStatusResponse,
  ReportStatus,
} from '@/lib/reporting/serverReportTypes';

const API_BASE = '/reports';

export interface UseServerReportState {
  isGenerating: boolean;
  progress: number;
  status: ReportStatus | null;
  reportId: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  error: string | null;
}

export interface UseServerReportReturn extends UseServerReportState {
  generateReport: <T extends Record<string, any>>(options: ServerReportOptions<T>) => Promise<void>;
  downloadReport: () => void;
  reset: () => void;
}

const POLL_INTERVAL = 1000; // Poll every 1 second
const MAX_POLL_ATTEMPTS = 300; // Max 5 minutes of polling

export function useServerReport(): UseServerReportReturn {
  const [state, setState] = useState<UseServerReportState>({
    isGenerating: false,
    progress: 0,
    status: null,
    reportId: null,
    downloadUrl: null,
    fileName: null,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const onProgressRef = useRef<((progress: number, message?: string) => void) | undefined>();
  const onCompleteRef = useRef<(() => void) | undefined>();
  const onErrorRef = useRef<((error: string) => void) | undefined>();
  const downloadUrlRef = useRef<string | null>(null);
  const reportIdRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const pollStatus = useCallback(async (reportId: string) => {
    try {
      const response = await apiClient.get<ReportStatusResponse>(`${API_BASE}/${reportId}/status`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get report status');
      }

      setState(prev => ({
        ...prev,
        status: response.status,
        progress: response.progress,
        downloadUrl: response.download_url || null,
        fileName: response.file_name || null,
        error: response.error_message || null,
      }));

      // Update refs for download
      downloadUrlRef.current = response.download_url || null;

      // Call progress callback
      if (onProgressRef.current && response.status === 'processing') {
        // Pass progress and optional message
        // Backend doesn't provide progress_message yet, so we'll pass undefined
        // The callback signature allows optional message parameter
        onProgressRef.current(response.progress, undefined);
      }

      // Check if completed or failed
      if (response.status === 'completed') {
        stopPolling();
        setState(prev => ({ ...prev, isGenerating: false }));

        // Update refs for download (ensure they're set before callback)
        downloadUrlRef.current = response.download_url || null;
        reportIdRef.current = response.report_id;

        // Call complete callback after state is updated
        // Use setTimeout to ensure state update is processed
        // Pass downloadUrl to callback so it's available immediately
        setTimeout(() => {
          if (onCompleteRef.current) {
            onCompleteRef.current(response.download_url || null);
          }
        }, 100); // Increased delay to ensure state is fully updated
      } else if (response.status === 'failed') {
        stopPolling();
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: response.error_message || 'Report generation failed',
        }));

        // Call error callback
        if (onErrorRef.current) {
          onErrorRef.current(response.error_message || 'Report generation failed');
        }
      }

      // Check max poll attempts
      pollAttemptsRef.current++;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        const error = 'Report generation timed out. The queue worker may not be running. Please try again or contact support.';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error,
        }));
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
        return; // Exit early to prevent further polling
      }
      
      // If status is still pending after 30 seconds, warn user
      if (pollAttemptsRef.current === 30 && response.status === 'pending') {
        console.warn('Report has been pending for 30 seconds. Queue worker may not be running.');
      }
    } catch (err) {
      console.error('Error polling report status:', err);
      pollAttemptsRef.current++;
      
      // Stop polling after too many consecutive errors
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        const error = err instanceof Error ? err.message : 'Failed to check report status';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error,
        }));
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    }
  }, [stopPolling]);

  const startPolling = useCallback((reportId: string) => {
    pollAttemptsRef.current = 0;
    pollIntervalRef.current = setInterval(() => {
      pollStatus(reportId);
    }, POLL_INTERVAL);
  }, [pollStatus]);

  const generateReport = useCallback(async <T extends Record<string, any>>(
    options: ServerReportOptions<T>
  ) => {
    // Store callbacks in refs
    onProgressRef.current = options.onProgress;
    onCompleteRef.current = options.onComplete;
    onErrorRef.current = options.onError;

    // Reset state
    setState({
      isGenerating: true,
      progress: 0,
      status: 'pending',
      reportId: null,
      downloadUrl: null,
      fileName: null,
      error: null,
    });

    try {
      // Build request
      const request: GenerateReportRequest = {
        report_key: options.reportKey,
        report_type: options.reportType,
        branding_id: options.brandingId,
        layout_id: options.layoutId,
        report_template_id: options.reportTemplateId,
        template_name: options.templateName,
        title: options.title,
        watermark_mode: options.watermarkMode ?? 'default',
        notes_mode: options.notesMode ?? 'defaults',
        parameters: options.parameters,
        column_config: options.columnConfig,
        columns: options.columns,
        rows: options.rows,
        async: options.async ?? true, // Default to async
      };

      // Make API call
      const response = await apiClient.post<GenerateReportResponse>(`${API_BASE}/generate`, request);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate report');
      }

      setState(prev => ({
        ...prev,
        reportId: response.report_id,
        status: response.status,
      }));

      // Update ref for download
      reportIdRef.current = response.report_id;

      // If sync and already completed, we're done
      if (response.status === 'completed' && response.download_url) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          progress: 100,
          downloadUrl: response.download_url || null,
          fileName: response.file_name || null,
        }));

        // Update refs for download
        downloadUrlRef.current = response.download_url || null;
        reportIdRef.current = response.report_id;

        if (options.onComplete) {
          options.onComplete(response.download_url || null);
        }
        return;
      }

      // If async or still processing, start polling
      if (response.status === 'pending' || response.status === 'processing') {
        startPolling(response.report_id);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to generate report';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        status: 'failed',
        error,
      }));

      if (options.onError) {
        options.onError(error);
      }
    }
  }, [startPolling]);

  const downloadReport = useCallback(async (retryCount = 0) => {
    // Use refs to get the latest values (not dependent on state updates)
    const currentDownloadUrl = downloadUrlRef.current;
    const currentReportId = reportIdRef.current;

    if (!currentDownloadUrl || !currentReportId) {
      // If not ready, try again after a short delay (max 3 retries)
      if (retryCount < 3) {
        setTimeout(() => {
          downloadReport(retryCount + 1);
        }, 500);
      } else {
        setState(prev => ({ ...prev, error: 'Download URL not available' }));
      }
      return;
    }

    try {
      // Extract the endpoint path from the full URL
      // downloadUrl from backend is like: http://localhost:8000/api/reports/{id}/download
      // API client baseUrl is /api, so we need: /reports/{id}/download
      const url = new URL(currentDownloadUrl);
      let endpoint = url.pathname;
      
      // Remove /api prefix if present (backend URL includes it, API client will add it back)
      if (endpoint.startsWith('/api/')) {
        endpoint = endpoint.substring(4); // Remove '/api' but keep the leading '/'
      } else if (endpoint.startsWith('/api')) {
        endpoint = endpoint.substring(4);
      }
      
      // Ensure endpoint starts with /
      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }

      // Debug log in development
      if (import.meta.env.DEV) {
        console.log('[useServerReport] Downloading report:', {
          originalUrl: currentDownloadUrl,
          extractedEndpoint: endpoint,
          reportId: currentReportId,
          retryCount,
        });
      }

      // Use API client's requestFile method (includes authentication automatically)
      const { blob, filename } = await apiClient.requestFile(endpoint);

      // Create a blob URL and download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || state.fileName || 'report';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download report';
      
      // If it's a 404 and we haven't retried too many times, try again
      // The file might not be ready yet even though status is "completed"
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        if (retryCount < 5) {
          if (import.meta.env.DEV) {
            console.log(`[useServerReport] File not ready, retrying... (${retryCount + 1}/5)`);
          }
          setTimeout(() => {
            downloadReport(retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Download error:', error);
    }
  }, [state.fileName]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      isGenerating: false,
      progress: 0,
      status: null,
      reportId: null,
      downloadUrl: null,
      fileName: null,
      error: null,
    });
  }, [stopPolling]);

  return {
    ...state,
    generateReport,
    downloadReport,
    reset,
  };
}

// Helper hook for simple synchronous report generation
export function useQuickReport() {
  const serverReport = useServerReport();

  const generatePdf = useCallback(async <T extends Record<string, any>>(
    reportKey: string,
    title: string,
    columns: (string | { key: string; label: string })[],
    rows: T[],
    brandingId?: string
  ) => {
    await serverReport.generateReport({
      reportKey,
      reportType: 'pdf',
      title,
      columns,
      rows,
      brandingId,
      async: false, // Synchronous
    });
  }, [serverReport]);

  const generateExcel = useCallback(async <T extends Record<string, any>>(
    reportKey: string,
    title: string,
    columns: (string | { key: string; label: string })[],
    rows: T[],
    brandingId?: string
  ) => {
    await serverReport.generateReport({
      reportKey,
      reportType: 'excel',
      title,
      columns,
      rows,
      brandingId,
      async: false, // Synchronous
    });
  }, [serverReport]);

  return {
    ...serverReport,
    generatePdf,
    generateExcel,
  };
}
