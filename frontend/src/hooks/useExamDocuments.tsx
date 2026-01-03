import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { examDocumentsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface ExamDocument {
  id: string;
  organization_id: string;
  school_id: string;
  exam_id: string;
  exam_class_id: string | null;
  exam_student_id: string | null;
  document_type: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  exam?: {
    id: string;
    name: string;
  };
  exam_class?: {
    id: string;
    class_name: string;
  };
  exam_student?: {
    id: string;
    student_name: string;
  };
}

export const useExamDocuments = (params?: {
  examId?: string;
  examClassId?: string;
  examStudentId?: string;
  documentType?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery<ExamDocument[]>({
    queryKey: ['exam-documents', params],
    queryFn: async () => {
      if (!user || !profile) return [];
      const apiParams: any = {};
      if (params?.examId) apiParams.exam_id = params.examId;
      if (params?.examClassId) apiParams.exam_class_id = params.examClassId;
      if (params?.examStudentId) apiParams.exam_student_id = params.examStudentId;
      if (params?.documentType) apiParams.document_type = params.documentType;
      const documents = await examDocumentsApi.list(apiParams);
      return documents as ExamDocument[];
    },
    enabled: !!user && !!profile,
    staleTime: 60 * 1000,
  });
};

export const useCreateExamDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      exam_id: string;
      exam_class_id?: string | null;
      exam_student_id?: string | null;
      document_type: string;
      title: string;
      description?: string | null;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('exam_id', data.exam_id);
      if (data.exam_class_id) formData.append('exam_class_id', data.exam_class_id);
      if (data.exam_student_id) formData.append('exam_student_id', data.exam_student_id);
      formData.append('document_type', data.document_type);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('file', data.file);

      const document = await examDocumentsApi.create(formData);
      return document as ExamDocument;
    },
    onSuccess: () => {
      showToast.success('toast.examDocuments.uploaded');
      void queryClient.invalidateQueries({ queryKey: ['exam-documents'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.examDocuments.uploadFailed'),
  });
};

export const useDeleteExamDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await examDocumentsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      showToast.success('toast.examDocuments.deleted');
      void queryClient.invalidateQueries({ queryKey: ['exam-documents'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.examDocuments.deleteFailed'),
  });
};

export const useDownloadExamDocument = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await examDocumentsApi.download(id);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.examDocuments.downloadFailed'),
  });
};

