import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParentPortal } from '@/hooks/useParentPortal';

export default function ChildrenPage() {
  const { data, isLoading } = useParentPortal();

  return (
    <MainLayout title="Parent Portal — Children">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">My Children</h1>
          <p className="text-primary-foreground/80">Overview of your children's information and dues</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle>{child.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Class: {child.class}</p>
                <p className="text-sm">Attendance: {child.attendancePercentage ?? 0}%</p>
                <div className="flex items-center justify-between">
                  <Badge variant={child.pendingFees > 0 ? 'destructive' : 'secondary'}>
                    {child.pendingFees > 0 ? `Pending ₹${child.pendingFees}` : 'No dues'}
                  </Badge>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
