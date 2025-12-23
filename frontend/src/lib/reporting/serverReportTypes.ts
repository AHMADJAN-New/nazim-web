// src/lib/reporting/serverReportTypes.ts
// Types for server-side report generation

export type ServerReportType = 'pdf' | 'excel';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface GenerateReportRequest {
  report_key: string;
  report_type: ServerReportType;
  branding_id?: string | null;
  layout_id?: string | null;
  template_name?: string | null;
  title?: string;
  watermark_mode?: 'default' | 'pick' | 'none';
  notes_mode?: 'defaults' | 'custom' | 'none';
  parameters?: Record<string, any>;
  column_config?: Record<string, { width?: number; align?: string }>;
  columns: (string | ReportColumn)[];
  rows: Record<string, any>[];
  async?: boolean;
}

export interface GenerateReportResponse {
  success: boolean;
  report_id: string;
  status: ReportStatus;
  download_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_ms?: number | null;
  message?: string;
  error?: string;
}

export interface ReportStatusResponse {
  success: boolean;
  report_id: string;
  status: ReportStatus;
  progress: number;
  download_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_ms?: number | null;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReportRun {
  id: string;
  organization_id: string | null;
  branding_id: string | null;
  user_id: string | null;
  report_key: string;
  report_type: ServerReportType;
  template_name: string | null;
  title: string | null;
  status: ReportStatus;
  progress: number;
  file_name: string | null;
  file_size_bytes: number | null;
  duration_ms: number | null;
  error_message: string | null;
  row_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReportListResponse {
  success: boolean;
  data: ReportRun[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export interface ServerReportOptions<T extends Record<string, any>> {
  reportKey: string;
  reportType: ServerReportType;
  title: string;
  columns: (string | ReportColumn)[];
  rows: T[];
  brandingId?: string;
  layoutId?: string;
  templateName?: string;
  watermarkMode?: 'default' | 'pick' | 'none';
  notesMode?: 'defaults' | 'custom' | 'none';
  parameters?: Record<string, any>;
  columnConfig?: Record<string, { width?: number; align?: string }>;
  async?: boolean;
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: (downloadUrl: string, fileName: string) => void;
  onError?: (error: string) => void;
}
