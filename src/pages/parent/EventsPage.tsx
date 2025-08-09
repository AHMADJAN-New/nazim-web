import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function ParentEventsPage() {
  const { data } = useQuery({
    queryKey: ['parent-events'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('events')
        .select('id,title,event_date,start_time,category')
        .gte('event_date', today)
        .order('event_date', { ascending: true });
      return data || [];
    }
  });

  return (
    <MainLayout title="Parent Portal — Events">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">Upcoming Events</h1>
          <p className="text-primary-foreground/80">Stay updated with school events</p>
        </header>

        <div className="space-y-3">
          {(data || []).map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{new Date(e.event_date as any).toDateString()} {e.start_time ? `• ${e.start_time}` : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
