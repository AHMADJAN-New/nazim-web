import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { courseDocumentsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface CourseDocument {
  id: string;
  organization_id: string;
  school_id: string;
  course_id: string;
  course_student_id: string | null;
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
  course?: {
    id: string;
    name: string;
  };
  course_student?: {
    id: string;
    full_name: string;
  };
}

export const useCourseDocuments = (params?: {
  courseId?: string;
  courseStudentId?: string;
  documentType?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery<CourseDocument[]>({
    queryKey: ['course-documents', profile?.organization_id ?? null, profile?.default_school_id ?? null, params],
    queryFn: async () => {
      if (!user || !profile) return [];
      const apiParams: any = {};
      if (params?.courseId) apiParams.course_id = params.courseId;
      if (params?.courseStudentId) apiParams.course_student_id = params.courseStudentId;
      if (params?.documentType) apiParams.document_type = params.documentType;
      const documents = await courseDocumentsApi.list(apiParams);
      return documents as CourseDocument[];
    },
    enabled: !!user && !!profile,
    staleTime: 60 * 1000,
  });
};

export const useCreateCourseDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      course_id: string;
      course_student_id?: string | null;
      document_type: string;
      title: string;
      description?: string | null;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('course_id', data.course_id);
      if (data.course_student_id) formData.append('course_student_id', data.course_student_id);
      formData.append('document_type', data.document_type);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('file', data.file);

      const document = await courseDocumentsApi.create(formData);
      return document as CourseDocument;
    },
    onSuccess: () => {
      showToast.success('toast.courseDocuments.uploaded');
      void queryClient.invalidateQueries({ queryKey: ['course-documents'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseDocuments.uploadFailed'),
  });
};

export const useDeleteCourseDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await courseDocumentsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      showToast.success('toast.courseDocuments.deleted');
      void queryClient.invalidateQueries({ queryKey: ['course-documents'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseDocuments.deleteFailed'),
  });
};

export const useDownloadCourseDocument = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await courseDocumentsApi.download(id);
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
    onError: (error: Error) => showToast.error(error.message || 'toast.courseDocuments.downloadFailed'),
  });
};
