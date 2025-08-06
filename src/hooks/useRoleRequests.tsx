import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RoleRequest {
  id: string;
  user_id: string;
  existing_role: string | null;
  requested_role: string;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string;
  reviewed_by?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export const useRoleRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_role_requests')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      toast.error('Failed to fetch role requests');
    } finally {
      setLoading(false);
    }
  };

  const createRoleRequest = async (requestedRole: string, justification: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Get current role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('user_role_requests')
        .insert({
          user_id: user.id,
          existing_role: profile?.role as any,
          requested_role: requestedRole as any,
          justification,
          requested_by: user.id
        });

      if (error) throw error;
      
      toast.success('Role change request submitted successfully');
      await fetchRequests();
    } catch (error) {
      console.error('Error creating role request:', error);
      toast.error('Failed to submit role request');
      throw error;
    }
  };

  const approveRequest = async (requestId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .rpc('approve_role_change', {
          request_id: requestId,
          approver_id: user.id
        });

      if (error) throw error;
      
      if (data) {
        toast.success('Role request approved successfully');
        await fetchRequests();
      } else {
        toast.error('Failed to approve role request');
      }
    } catch (error) {
      console.error('Error approving role request:', error);
      toast.error('Failed to approve role request');
      throw error;
    }
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .rpc('reject_role_change', {
          request_id: requestId,
          approver_id: user.id,
          reason
        });

      if (error) throw error;
      
      if (data) {
        toast.success('Role request rejected');
        await fetchRequests();
      } else {
        toast.error('Failed to reject role request');
      }
    } catch (error) {
      console.error('Error rejecting role request:', error);
      toast.error('Failed to reject role request');
      throw error;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  return {
    requests,
    loading,
    createRoleRequest,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests
  };
};