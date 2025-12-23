import { useMemo, useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Plus, FileText, Award, Printer, ArrowRight, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGraduationBatches } from '@/hooks/useGraduation';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/dateUtils';

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: t('graduation.status.draft') || 'Draft' },
    approved: { variant: 'default', label: t('graduation.status.approved') || 'Approved' },
    issued: { variant: 'outline', label: t('graduation.status.issued') || 'Issued' },
  };
  const config = variants[status] || variants.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function GraduationDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: schools = [], isLoading: schoolsLoading } = useSchools();
  const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
  
  // Auto-select school if there's only one, or use profile's default_school_id
  useEffect(() => {
    if (schools.length === 1) {
      // Auto-select if only one school
      setSchoolId(schools[0].id);
    } else if (profile?.default_school_id && !schoolId) {
      // Use default school from profile if available
      setSchoolId(profile.default_school_id);
    }
  }, [schools, profile?.default_school_id, schoolId]);
  
  // Fetch all batches for statistics
  // Auto-select school if there's only one, or use profile's default
  const effectiveSchoolId = schoolId || (schools.length === 1 ? schools[0]?.id : undefined);
  const { data: allBatches = [], isLoading: batchesLoading, error: batchesError } = useGraduationBatches({
    school_id: effectiveSchoolId,
  });
  
  // Calculate statistics
  const stats = useMemo(() => {
    const total = allBatches.length;
    const draft = allBatches.filter((b: any) => b.status === 'draft').length;
    const approved = allBatches.filter((b: any) => b.status === 'approved').length;
    const issued = allBatches.filter((b: any) => b.status === 'issued').length;
    
    // Current year batches
    const currentYearBatches = currentAcademicYear
      ? allBatches.filter((b: any) => b.academic_year_id === currentAcademicYear.id)
      : [];
    
    // Certificates issued this year (approximate - count students in issued batches)
    const certificatesThisYear = currentYearBatches
      .filter((b: any) => b.status === 'issued')
      .reduce((sum: number, b: any) => sum + (b.students_count || b.students?.length || 0), 0);
    
    return {
      total,
      draft,
      approved,
      issued,
      currentYearBatches: currentYearBatches.length,
      certificatesThisYear,
    };
  }, [allBatches, currentAcademicYear]);

  // Recent batches (last 10, sorted by date)
  const recentBatches = useMemo(() => {
    return [...allBatches]
      .sort((a: any, b: any) => {
        const dateA = a.graduation_date ? new Date(a.graduation_date).getTime() : 0;
        const dateB = b.graduation_date ? new Date(b.graduation_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [allBatches]);

  // Batches needing approval
  const pendingApprovals = useMemo(() => {
    return allBatches.filter((b: any) => b.status === 'draft');
  }, [allBatches]);

  // Upcoming graduations (next 30 days)
  const upcomingGraduations = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return allBatches.filter((b: any) => {
      if (!b.graduation_date) return false;
      const gradDate = new Date(b.graduation_date);
      return gradDate >= today && gradDate <= thirtyDaysFromNow;
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.graduation_date).getTime();
      const dateB = new Date(b.graduation_date).getTime();
      return dateA - dateB;
    });
  }, [allBatches]);

  if (schoolsLoading || batchesLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <p className="text-sm text-muted-foreground">{t('nav.graduationCertificates')}</p>
          <h1 className="text-2xl font-semibold">{t('graduation.dashboard.title') || 'Graduation Dashboard'}</h1>
        </div>
        <p className="p-4">{t('common.loading')}</p>
      </div>
    );
  }

  // Show dashboard even with errors - just show empty state
  // This allows users to still see quick actions and navigate

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">{t('nav.graduationCertificates')}</p>
        <h1 className="text-2xl font-semibold">{t('graduation.dashboard.title') || 'Graduation Dashboard'}</h1>
      </div>

      {/* School Selector - Show if multiple schools or no school selected */}
      {schools.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>{t('common.schoolManagement') || 'School'}</Label>
              <Select value={schoolId || ''} onValueChange={(val) => setSchoolId(val || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectSchool') || 'Select School'} />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Notice */}
      {batchesError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {t('common.error') || 'Error'} loading graduation data. {t('common.tryAgain') || 'Please try again later.'}
            </p>
            {import.meta.env.DEV && batchesError instanceof Error && (
              <p className="text-xs text-muted-foreground mt-2">{batchesError.message}</p>
            )}
            {schools.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('graduation.dashboard.noSchools') || 'No schools available. Please contact your administrator.'}
              </p>
            )}
            {schools.length > 1 && !schoolId && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('graduation.dashboard.selectSchool') || 'Please select a school above to view graduation data.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no school selected and multiple schools available */}
      {!batchesError && schools.length > 1 && !schoolId && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              {t('graduation.dashboard.selectSchool') || 'Please select a school above to view graduation data.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('graduation.summary.totalBatches') || 'Total Batches'}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('graduation.summary.draftBatches') || 'Draft'}</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.draft}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('graduation.summary.approvedBatches') || 'Approved'}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('graduation.summary.issuedBatches') || 'Issued'}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.issued}</p>
              </div>
              <Award className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Year Stats */}
      {currentAcademicYear && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('graduation.dashboard.currentYearBatches') || 'Current Year Batches'}</p>
                  <p className="text-2xl font-bold">{stats.currentYearBatches}</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentAcademicYear.name}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('graduation.dashboard.certificatesThisYear') || 'Certificates Issued This Year'}</p>
                  <p className="text-2xl font-bold">{stats.certificatesThisYear}</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentAcademicYear.name}</p>
                </div>
                <Award className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('graduation.dashboard.quickActions') || 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-auto py-6 flex flex-col items-start gap-2">
              <Link to="/graduation/batches?action=create">
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">{t('graduation.dashboard.createBatch') || 'Create New Batch'}</div>
                  <div className="text-xs opacity-80">{t('graduation.dashboard.createBatchDesc') || 'Start a new graduation batch'}</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex flex-col items-start gap-2">
              <Link to="/certificates/templates">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">{t('graduation.dashboard.viewTemplates') || 'View Templates'}</div>
                  <div className="text-xs opacity-80">{t('graduation.dashboard.viewTemplatesDesc') || 'Manage certificate templates'}</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex flex-col items-start gap-2">
              <Link to="/certificates/issued">
                <Printer className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">{t('graduation.dashboard.issuedCertificates') || 'Issued Certificates'}</div>
                  <div className="text-xs opacity-80">{t('graduation.dashboard.issuedCertificatesDesc') || 'View all issued certificates'}</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('graduation.dashboard.recentBatches') || 'Recent Batches'}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/graduation/batches">
                {t('common.viewAll') || 'View All'} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('common.noData') || 'No batches found'}</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.slice(0, 5).map((batch: any) => (
                  <Link
                    key={batch.id}
                    to={`/graduation/batches/${batch.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{batch.academic_year?.name || 'Unknown Year'}</p>
                        <StatusBadge status={batch.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {batch.class?.name || batch.class_id} • {batch.graduation_date ? formatDate(batch.graduation_date) : '—'}
                      </p>
                      {batch.students_count !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {batch.students_count} {t('graduation.table.students') || 'students'}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('graduation.dashboard.pendingApprovals') || 'Pending Approvals'}</CardTitle>
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary">{pendingApprovals.length}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('graduation.dashboard.noPendingApprovals') || 'No pending approvals'}</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 5).map((batch: any) => (
                  <Link
                    key={batch.id}
                    to={`/graduation/batches/${batch.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{batch.academic_year?.name || 'Unknown Year'}</p>
                        <StatusBadge status={batch.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {batch.class?.name || batch.class_id} • {batch.graduation_date ? formatDate(batch.graduation_date) : '—'}
                      </p>
                      {batch.students_count !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {batch.students_count} {t('graduation.table.students') || 'students'}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Graduations */}
      {upcomingGraduations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('graduation.dashboard.upcomingGraduations') || 'Upcoming Graduations'}</CardTitle>
            <Badge variant="outline">{upcomingGraduations.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingGraduations.slice(0, 5).map((batch: any) => (
                <Link
                  key={batch.id}
                  to={`/graduation/batches/${batch.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{batch.academic_year?.name || 'Unknown Year'}</p>
                      <StatusBadge status={batch.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {batch.class?.name || batch.class_id} • {batch.graduation_date ? formatDate(batch.graduation_date) : '—'}
                    </p>
                    {batch.students_count !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {batch.students_count} {t('graduation.table.students') || 'students'}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

