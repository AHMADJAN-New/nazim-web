import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api, websitePublicBooksApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useProfile } from '@/hooks/useProfiles';

// Types
export interface WebsitePublicBook {
    id: string;
    title: string;
    author: string | null;
    category: string | null;
    description: string | null;
    cover_image_path: string | null;
    cover_image_url?: string | null;
    file_path: string | null;
    file_url?: string | null;
    file_size: number | null;
    download_count: number;
    is_featured: boolean;
    sort_order: number;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
}

export interface WebsiteScholar {
    id: string;
    name: string;
    title: string | null;
    bio: string | null;
    photo_path: string | null;
    photo_url?: string | null;
    specializations: string[] | null;
    contact_email: string | null;
    sort_order: number;
    is_featured: boolean;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
}

export interface WebsiteCourse {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    duration: string | null;
    level: string | null;
    instructor_name: string | null;
    cover_image_path: string | null;
    cover_image_url?: string | null; // Added by backend for public API
    enrollment_cta: string | null;
    is_featured: boolean;
    sort_order: number;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
}

export interface WebsiteGraduate {
    id: string;
    name: string;
    graduation_year: number | null;
    program: string | null;
    photo_path: string | null;
    photo_url?: string | null;
    bio: string | null;
    is_featured: boolean;
    sort_order: number;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
}

export interface WebsiteDonation {
    id: string;
    title: string;
    description: string | null;
    target_amount: number | null;
    current_amount: number;
    bank_details: Record<string, string> | null;
    payment_links: Record<string, string> | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface WebsiteInboxMessage {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string;
    status: 'new' | 'read' | 'replied' | 'archived';
    replied_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface WebsiteInboxStats {
    new: number;
    read: number;
    replied: number;
    archived: number;
    total: number;
}

// Public Books Hooks
export const useWebsitePublicBooks = () => {
    return useQuery<WebsitePublicBook[]>({
        queryKey: ['website-public-books'],
        queryFn: async () => {
            const response = await api.get<WebsitePublicBook[]>('/website/public-books');
            return response;
        },
    });
};

export const useCreateWebsitePublicBook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<WebsitePublicBook>) => {
            const response = await api.post<WebsitePublicBook>('/website/public-books', data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Book created successfully');
            queryClient.invalidateQueries({ queryKey: ['website-public-books'] });
        },
        onError: () => showToast.error('Failed to create book'),
    });
};

export const useUpdateWebsitePublicBook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebsitePublicBook> & { id: string }) => {
            const response = await api.put<WebsitePublicBook>(`/website/public-books/${id}`, data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Book updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-public-books'] });
        },
        onError: () => showToast.error('Failed to update book'),
    });
};

export const useDeleteWebsitePublicBook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/public-books/${id}`);
        },
        onSuccess: () => {
            showToast.success('Book deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-public-books'] });
        },
        onError: () => showToast.error('Failed to delete book'),
    });
};

/** Upload a PDF file for a library book. Returns path and file_size. */
export const useUploadPublicBookFile = () => {
    return useMutation({
        mutationFn: async (file: File) => {
            if (file.type !== 'application/pdf') {
                throw new Error('File must be a PDF');
            }
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                throw new Error('PDF must be less than 50MB');
            }
            return websitePublicBooksApi.uploadFile(file);
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to upload PDF');
        },
    });
};

/** Upload a cover image for a library book. Returns path for cover_image_path. */
export const useUploadPublicBookCover = () => {
    return useMutation({
        mutationFn: async (file: File) => {
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image');
            }
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error('Image must be less than 10MB');
            }
            return websitePublicBooksApi.uploadCover(file);
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to upload cover image');
        },
    });
};

// Scholars Hooks
export const useWebsiteScholars = () => {
    return useQuery<WebsiteScholar[]>({
        queryKey: ['website-scholars'],
        queryFn: async () => {
            const response = await api.get<WebsiteScholar[]>('/website/scholars');
            return response;
        },
    });
};

export const useCreateWebsiteScholar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<WebsiteScholar>) => {
            const response = await api.post<WebsiteScholar>('/website/scholars', data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Scholar created successfully');
            queryClient.invalidateQueries({ queryKey: ['website-scholars'] });
        },
        onError: () => showToast.error('Failed to create scholar'),
    });
};

export const useUpdateWebsiteScholar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebsiteScholar> & { id: string }) => {
            const response = await api.put<WebsiteScholar>(`/website/scholars/${id}`, data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Scholar updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-scholars'] });
        },
        onError: () => showToast.error('Failed to update scholar'),
    });
};

export const useDeleteWebsiteScholar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/scholars/${id}`);
        },
        onSuccess: () => {
            showToast.success('Scholar deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-scholars'] });
        },
        onError: () => showToast.error('Failed to delete scholar'),
    });
};

export const useUploadWebsiteScholarPhoto = () => {
    const queryClient = useQueryClient();
    const { data: profile } = useProfile();
    return useMutation({
        mutationFn: async ({ id, file }: { id: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            const params: Record<string, string> = {};
            if (profile?.default_school_id) {
                params.current_school_id = profile.default_school_id;
            }
            const result = await api.post<{ photo_path: string; photo_url: string; scholar?: WebsiteScholar }>(
                `/website/scholars/${id}/photo`,
                formData,
                { headers: {} as Record<string, string>, params }
            );
            return result;
        },
        onSuccess: (data, variables) => {
            showToast.success('Scholar photo updated');
            // Update cache so UI shows photo immediately; do NOT invalidate website-scholars
            // (refetch would overwrite cache and can make the photo disappear)
            const updatedId = data?.scholar?.id ?? variables.id;
            const updatedPhotoPath = data?.scholar?.photo_path ?? data?.photo_path ?? null;
            const updatedPhotoUrl = (data as { photo_url?: string | null })?.photo_url ?? data?.scholar?.photo_url ?? null;

            if (updatedId && updatedPhotoPath) {
                queryClient.setQueryData<WebsiteScholar[]>(['website-scholars'], (prev) => {
                    if (!prev) return prev;
                    return prev.map((s) =>
                        s.id === updatedId
                            ? { ...s, photo_path: updatedPhotoPath, photo_url: updatedPhotoUrl ?? s.photo_url }
                            : s
                    );
                });
            }
            queryClient.invalidateQueries({ queryKey: ['public-scholars'] });
        },
        onError: () => showToast.error('Failed to upload scholar photo'),
    });
};

// Courses Hooks
export const useWebsiteCourses = () => {
    return useQuery<WebsiteCourse[]>({
        queryKey: ['website-courses'],
        queryFn: async () => {
            const response = await api.get<WebsiteCourse[]>('/website/courses');
            return response;
        },
    });
};

export const useCreateWebsiteCourse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<WebsiteCourse>) => {
            const response = await api.post<WebsiteCourse>('/website/courses', data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Course created successfully');
            queryClient.invalidateQueries({ queryKey: ['website-courses'] });
        },
        onError: () => showToast.error('Failed to create course'),
    });
};

export const useUpdateWebsiteCourse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebsiteCourse> & { id: string }) => {
            const response = await api.put<WebsiteCourse>(`/website/courses/${id}`, data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Course updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-courses'] });
        },
        onError: () => showToast.error('Failed to update course'),
    });
};

export const useDeleteWebsiteCourse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/courses/${id}`);
        },
        onSuccess: () => {
            showToast.success('Course deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-courses'] });
        },
        onError: () => showToast.error('Failed to delete course'),
    });
};

// Graduates Hooks
export const useWebsiteGraduates = () => {
    return useQuery<WebsiteGraduate[]>({
        queryKey: ['website-graduates'],
        queryFn: async () => {
            const response = await api.get<WebsiteGraduate[]>('/website/graduates');
            return response;
        },
    });
};

export const useCreateWebsiteGraduate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<WebsiteGraduate>) => {
            const response = await api.post<WebsiteGraduate>('/website/graduates', data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Graduate created successfully');
            queryClient.invalidateQueries({ queryKey: ['website-graduates'] });
        },
        onError: () => showToast.error('Failed to create graduate'),
    });
};

export const useUpdateWebsiteGraduate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebsiteGraduate> & { id: string }) => {
            const response = await api.put<WebsiteGraduate>(`/website/graduates/${id}`, data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Graduate updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-graduates'] });
        },
        onError: () => showToast.error('Failed to update graduate'),
    });
};

export const useDeleteWebsiteGraduate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/graduates/${id}`);
        },
        onSuccess: () => {
            showToast.success('Graduate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-graduates'] });
        },
        onError: () => showToast.error('Failed to delete graduate'),
    });
};

// Donations Hooks
export const useWebsiteDonations = () => {
    return useQuery<WebsiteDonation[]>({
        queryKey: ['website-donations'],
        queryFn: async () => {
            const response = await api.get<WebsiteDonation[]>('/website/donations');
            return response;
        },
    });
};

export const useCreateWebsiteDonation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<WebsiteDonation>) => {
            const response = await api.post<WebsiteDonation>('/website/donations', data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Donation fund created successfully');
            queryClient.invalidateQueries({ queryKey: ['website-donations'] });
        },
        onError: () => showToast.error('Failed to create donation fund'),
    });
};

export const useUpdateWebsiteDonation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebsiteDonation> & { id: string }) => {
            const response = await api.put<WebsiteDonation>(`/website/donations/${id}`, data);
            return response;
        },
        onSuccess: () => {
            showToast.success('Donation fund updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-donations'] });
        },
        onError: () => showToast.error('Failed to update donation fund'),
    });
};

export const useDeleteWebsiteDonation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/donations/${id}`);
        },
        onSuccess: () => {
            showToast.success('Donation fund deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-donations'] });
        },
        onError: () => showToast.error('Failed to delete donation fund'),
    });
};

// Inbox Hooks
export const useWebsiteInbox = (status?: string) => {
    return useQuery<{ data: WebsiteInboxMessage[] }>({
        queryKey: ['website-inbox', status],
        queryFn: async () => {
            const params = status ? `?status=${status}` : '';
            const response = await api.get<{ data: WebsiteInboxMessage[] }>(`/website/inbox${params}`);
            return response;
        },
    });
};

export const useWebsiteInboxStats = () => {
    return useQuery<WebsiteInboxStats>({
        queryKey: ['website-inbox-stats'],
        queryFn: async () => {
            const response = await api.get<WebsiteInboxStats>('/website/inbox/stats');
            return response;
        },
    });
};

export const useUpdateWebsiteInboxMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const response = await api.put<WebsiteInboxMessage>(`/website/inbox/${id}`, { status });
            return response;
        },
        onSuccess: () => {
            showToast.success('Message updated successfully');
            queryClient.invalidateQueries({ queryKey: ['website-inbox'] });
            queryClient.invalidateQueries({ queryKey: ['website-inbox-stats'] });
        },
        onError: () => showToast.error('Failed to update message'),
    });
};

export const useDeleteWebsiteInboxMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/website/inbox/${id}`);
        },
        onSuccess: () => {
            showToast.success('Message deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['website-inbox'] });
            queryClient.invalidateQueries({ queryKey: ['website-inbox-stats'] });
        },
        onError: () => showToast.error('Failed to delete message'),
    });
};
