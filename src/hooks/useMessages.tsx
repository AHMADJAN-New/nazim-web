import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
  id: string;
  subject: string;
  content: string;
  sender_id: string;
  recipients: string[];
  sent_at?: string | null;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  priority: 'low' | 'normal' | 'high';
  is_read?: boolean;
  is_starred?: boolean;
}

export const useMessages = () => {
  return useQuery({
    queryKey: ['messages'],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as any as Message[];
    },
  });
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      subject: string;
      content: string;
      recipients: string[];
      priority: 'low' | 'normal' | 'high';
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('messages')
        .insert({
          subject: message.subject,
          content: message.content,
          recipients: message.recipients,
          priority: message.priority,
          sender_id: auth.user?.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          branch_id: auth.user?.user_metadata?.branch_id || '660e8400-e29b-41d4-a716-446655440001',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
};

export const useUpdateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Message> & { id: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update message');
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete message');
    },
  });
};
