import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending';
}

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async (): Promise<UpcomingEvent[]> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get upcoming communications marked as events
      const { data: events } = await supabase
        .from('communications')
        .select('*')
        .eq('type', 'event')
        .gte('published_date', today)
        .order('published_date', { ascending: true })
        .limit(3);

      // Get upcoming exams as events
      const { data: exams } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          exam_date,
          subjects!inner(name)
        `)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(2);

      const eventList: UpcomingEvent[] = [];

      // Add communication events
      events?.forEach(event => {
        eventList.push({
          id: `event-${event.id}`,
          title: event.title,
          date: event.published_date?.split('T')[0] || '',
          time: new Date(event.published_date || '').toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: 'event',
          status: 'confirmed'
        });
      });

      // Add exam events
      exams?.forEach(exam => {
        eventList.push({
          id: `exam-${exam.id}`,
          title: `${exam.subjects?.name} Exam`,
          date: exam.exam_date,
          time: '10:00 AM', // Default exam time
          type: 'exam',
          status: 'confirmed'
        });
      });

      // Sort by date and return top 3
      return eventList
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);
    },
  });
};