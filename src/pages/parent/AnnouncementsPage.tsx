import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCommunications } from '@/hooks/useCommunications';

export default function ParentAnnouncementsPage() {
  const { data } = useCommunications();

  const items = (data || []).filter((c) => c.type === 'announcement');

  return (
    <MainLayout title="Parent Portal — Announcements">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-primary-foreground/80">Latest school announcements</p>
        </header>

        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
