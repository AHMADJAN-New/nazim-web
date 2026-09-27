import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from './useLanguage';

import { examsApi, apiClient, sanitizeBrowserDownloadFilename } from '@/lib/api/client';
import { getReportLocaleOptions } from '@/lib/reporting/reportLocaleOptions';
import type { ReportStatus } from '@/lib/reporting/serverReportTypes';
import { showToast } from '@/lib/toast';

/**
 * Export student exam report cards as a branded PDF (server-side),
 * matching the student-history export progress pattern.
 */
export function useExportStudentExamReportCardsPdf() {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [isPolling, setIsPolling] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);

  const reset = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pollAttemptsRef.current = 0;
    setIsPolling(false);
    setReportId(null);
    setStatus(null);
    setProgress(0);
    setDownloadUrl(null);
    setFileName(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const downloadReport = useCallback(async () => {
    if (!downloadUrl || !reportId) return;

    try {
      const url = new URL(downloadUrl, window.location.origin);
      let endpoint = url.pathname;
      if (endpoint.startsWith('/api/')) {
        endpoint = endpoint.substring(4);
      } else if (endpoint.startsWith('/api')) {
        endpoint = endpoint.substring(4);
      }
      if (!endpoint.startsWith('/')) {
        endpoint = `/${endpoint}`;
      }

      const { blob, filename } = await apiClient.requestFile(endpoint);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = sanitizeBrowserDownloadFilename(
        filename || fileName || 'student-report-card.pdf'
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (t('toast.reportDownloadFailed') || 'Failed to download report');
      setError(msg);
      showToast.error(msg);
    }
  }, [downloadUrl, reportId, fileName, t]);

  const pollReportStatus = useCallback((id: string): void => {
    setIsPolling(true);
    setStatus('pending');
    setProgress(0);
    setError(null);

    const poll = async () => {
      try {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current > 300) {
          setIsPolling(false);
          setStatus('failed');
          setError(t('toast.reportGenerationTimeout') || 'Report generation timed out');
          showToast.error(t('toast.reportGenerationTimeout') || 'Report generation timed out');
          return;
        }

        const response = await apiClient.get<{
          success?: boolean;
          status: ReportStatus;
          progress: number;
          download_url?: string | null;
          file_name?: string | null;
          error_message?: string | null;
        }>(`/reports/${id}/status`);

        setStatus(response.status);
        setProgress(response.progress ?? 0);
        setDownloadUrl(response.download_url ?? null);
        setFileName(response.file_name ?? null);

        if (response.status === 'completed') {
          setIsPolling(false);
          setProgress(100);
          showToast.success(t('toast.reportDownloaded') || 'Report ready');
          return;
        }

        if (response.status === 'failed') {
          setIsPolling(false);
          const msg = response.error_message || t('toast.reportGenerationFailed') || 'Failed to generate report';
          setError(msg);
          showToast.error(msg);
          return;
        }

        pollTimeoutRef.current = setTimeout(() => {
          void poll();
        }, 1000);
      } catch (e) {
        setIsPolling(false);
        const msg = e instanceof Error ? e.message : (t('toast.reportGenerationFailed') || 'Failed to generate report');
        setStatus('failed');
        setError(msg);
        showToast.error(msg);
      }
    };

    void poll();
  }, [t]);

  const mutation = useMutation({
    mutationFn: async ({
      examId,
      examStudentIds,
      brandingId,
    }: {
      examId: string;
      examStudentIds: string[];
      brandingId?: string;
    }) => {
      const locale = getReportLocaleOptions(language);
      return examsApi.exportStudentReportCardsPdf(examId, {
        exam_student_ids: examStudentIds,
        language: locale.language,
        calendar_preference: locale.calendarPreference,
        branding_id: brandingId,
      });
    },
    onSuccess: (data) => {
      if (data?.id) {
        setReportId(data.id);
        setStatus((data.status as ReportStatus) ?? 'pending');
        setProgress(0);
        setError(null);
        showToast.success(t('toast.reportGenerationStarted') || 'Report generation started');
        void queryClient.invalidateQueries({ queryKey: ['reports'] });
        pollReportStatus(data.id);
      } else {
        setStatus('failed');
        setError(t('toast.reportGenerationFailed') || 'Failed to start report generation');
        showToast.error(t('toast.reportGenerationFailed') || 'Failed to start report generation');
      }
    },
    onError: (err: Error) => {
      setStatus('failed');
      setError(err.message);
      showToast.error(err.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
    },
  });

  return {
    ...mutation,
    isPolling,
    reportId,
    status,
    progress,
    downloadUrl,
    fileName,
    error,
    downloadReport,
    reset,
  };
}
