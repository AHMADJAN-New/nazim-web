import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';

export default function ExamReportsHub() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const canViewReports = useHasPermission('exams.read');

  const reportTypes = [
    {
      id: 'consolidated',
      title: t('examReports.consolidatedMarkSheet'),
      description: t('examReports.consolidatedMarkSheetDescription'),
      icon: FileText,
      path: '/exams/reports/consolidated',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'class-subject',
      title: t('examReports.classSubjectMarkSheet'),
      description: t('examReports.classSubjectMarkSheetDescription'),
      icon: BarChart3,
      path: '/exams/reports/class-subject',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  if (!canViewReports) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('common.noPermission')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('examReports.hub')}</h1>
        <p className="text-muted-foreground mt-2">{t('examReports.hubDescription')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(report.path)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.bgColor}`}>
                    <Icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{report.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={(e) => {
                  e.stopPropagation();
                  navigate(report.path);
                }}>
                  {t('examReports.generateReport')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">{t('common.howToUse')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t('examReports.consolidatedMarkSheet')}: {t('examReports.consolidatedMarkSheetDescription')}</p>
          <p>• {t('examReports.classSubjectMarkSheet')}: {t('examReports.classSubjectMarkSheetDescription')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
