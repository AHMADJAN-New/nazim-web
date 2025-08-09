import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeacherPortal } from '@/hooks/useTeacherPortal';

export default function TeacherClassesPage() {
  const { data } = useTeacherPortal();

  return (
    <MainLayout title="Teacher Portal — Classes">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-primary-foreground/80">Quick overview of your assigned classes</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.teacherInfo.classes.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Click into Attendance and Exams from the sidebar.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
