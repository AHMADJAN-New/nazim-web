/**
 * User Tours API Client
 * 
 * API client for user tour management.
 */

import { apiClient } from './client';

export interface UserTour {
  id: string;
  user_id: string;
  tour_id: string;
  tour_version: string;
  tour_title: string | null;
  tour_description: string | null;
  assigned_by: string;
  required_permissions: string[] | null;
  trigger_route: string | null;
  is_completed: boolean;
  completed_at: string | null;
  last_step_id: string | null;
  last_step_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserTourInsert {
  tour_id: string;
  tour_version?: string;
  tour_title?: string;
  tour_description?: string;
  assigned_by?: string;
  required_permissions?: string[];
  trigger_route?: string | null;
}

export interface UserTourUpdate {
  is_completed?: boolean;
  last_step_id?: string;
  last_step_index?: number;
}

export const userToursApi = {
  /**
   * Get all tours for current user
   */
  myTours: async (): Promise<UserTour[]> => {
    const response = await apiClient.get<UserTour[]>('/user-tours/my');
    return Array.isArray(response) ? response : (response?.data || []);
  },

  /**
   * Get tours for a specific route
   */
  toursForRoute: async (route: string): Promise<UserTour[]> => {
    const response = await apiClient.get<UserTour[]>('/user-tours/for-route', { route });
    return Array.isArray(response) ? response : (response?.data || []);
  },

  /**
   * Get a specific tour
   */
  get: async (id: string): Promise<UserTour> => {
    const response = await apiClient.get<{ data: UserTour }>(`/user-tours/${id}`);
    return (response as { data?: UserTour })?.data || (response as UserTour);
  },

  /**
   * Create a new tour assignment
   */
  create: async (data: UserTourInsert): Promise<UserTour> => {
    const response = await apiClient.post<{ data: UserTour }>('/user-tours', data);
    return (response as { data?: UserTour })?.data || (response as UserTour);
  },

  /**
   * Update a tour
   */
  update: async (id: string, data: UserTourUpdate): Promise<UserTour> => {
    const response = await apiClient.put<{ data: UserTour }>(`/user-tours/${id}`, data);
    return (response as { data?: UserTour })?.data || (response as UserTour);
  },

  /**
   * Mark a tour as completed
   */
  complete: async (id: string): Promise<UserTour> => {
    const response = await apiClient.post<{ data: UserTour }>(`/user-tours/${id}/complete`);
    return (response as { data?: UserTour })?.data || (response as UserTour);
  },

  /**
   * Save progress for a tour
   */
  saveProgress: async (id: string, stepId: string, stepIndex: number): Promise<UserTour> => {
    const response = await apiClient.post<{ data: UserTour }>(`/user-tours/${id}/progress`, {
      last_step_id: stepId,
      last_step_index: stepIndex,
    });
    return (response as { data?: UserTour })?.data || (response as UserTour);
  },

  /**
   * Delete a tour
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/user-tours/${id}`);
  },
};

