import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParentPortal } from '@/hooks/useParentPortal';

export default function ParentResultsPage() {
  const { data } = useParentPortal();

  return (
    <MainLayout title="Parent Portal — Results">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-primary-foreground/80">Latest grades per child</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle>{child.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Recent Grade: {child.recentGrade ?? 'N/A'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
