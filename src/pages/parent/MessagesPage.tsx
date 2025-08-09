import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParentPortal } from '@/hooks/useParentPortal';

export default function ParentMessagesPage() {
  const { data } = useParentPortal();

  return (
    <MainLayout title="Parent Portal — Messages">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-primary-foreground/80">Latest updates and messages</p>
        </header>

        <div className="space-y-3">
          {data?.recentMessages.map((m, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">{m.subject}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{m.time}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
