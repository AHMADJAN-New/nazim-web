import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParentPortal } from '@/hooks/useParentPortal';

export default function ParentFeesPage() {
  const { data } = useParentPortal();

  return (
    <MainLayout title="Parent Portal — Fees">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">Fee Payment</h1>
          <p className="text-primary-foreground/80">Pending dues overview</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle>{child.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm">Pending: ₹{child.pendingFees || 0}</p>
                <Badge variant={child.pendingFees > 0 ? 'destructive' : 'secondary'}>
                  {child.pendingFees > 0 ? 'Due' : 'Clear'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
