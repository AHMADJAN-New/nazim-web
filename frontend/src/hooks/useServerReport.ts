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
  const onCompleteRef = useRef<((downloadUrl: string, fileName: string) => void) | undefined>();
  const onErrorRef = useRef<((error: string) => void) | undefined>();

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

      // Call progress callback
      if (onProgressRef.current && response.status === 'processing') {
        onProgressRef.current(response.progress);
      }

      // Check if completed or failed
      if (response.status === 'completed') {
        stopPolling();
        setState(prev => ({ ...prev, isGenerating: false }));

        // Call complete callback
        if (onCompleteRef.current && response.download_url && response.file_name) {
          onCompleteRef.current(response.download_url, response.file_name);
        }
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
        const error = 'Report generation timed out';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error,
        }));
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    } catch (err) {
      console.error('Error polling report status:', err);
      // Don't stop polling on transient errors, just log them
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

      // If sync and already completed, we're done
      if (response.status === 'completed' && response.download_url) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          progress: 100,
          downloadUrl: response.download_url || null,
          fileName: response.file_name || null,
        }));

        if (options.onComplete && response.download_url && response.file_name) {
          options.onComplete(response.download_url, response.file_name);
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
        error,
      }));

      if (options.onError) {
        options.onError(error);
      }
    }
  }, [startPolling]);

  const downloadReport = useCallback(() => {
    if (state.downloadUrl) {
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = state.downloadUrl;
      link.download = state.fileName || 'report';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [state.downloadUrl, state.fileName]);

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
