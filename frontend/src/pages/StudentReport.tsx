import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { studentsApi } from '@/lib/api/client';
import { useStudents } from '@/hooks/useStudents';
import { useSchools } from '@/hooks/useSchools';
import type { Student } from '@/types/domain/student';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Search,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentReportRow {
  admissionNumber: string;
  cardNumber: string;
  status: string;
  fullName: string;
  gender: string;
  age: string;
  dateOfBirth: string;
  nationality: string;
  religion: string;
  bloodGroup: string;
  school: string;
  applyingGrade: string;
  admissionYear: string;
  admissionFeeStatus: string;
  guardianName: string;
  guardianPhone: string;
  contactPhone: string;
  email: string;
  address: string;
  originLocation: string;
  currentLocation: string;
  previousSchool: string;
  isOrphan: string;
  disabilityStatus: string;
  emergencyContact: string;
}

const statusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
      return 'secondary';
    case 'withdrawn':
      return 'outline';
    default:
      return 'outline';
  }
};

const formatStatus = (value?: string) => {
  if (!value) return '—';
  const words = value.replace(/_/g, ' ').split(' ');
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDate = (date?: Date | string | null) => {
  if (!date) return '—';
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'yyyy-MM-dd');
};

const buildLocation = (province?: string | null, district?: string | null, village?: string | null) => {
  const parts = [province, district, village].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

const buildAddress = (student: Student) => {
  if (student.homeAddress) return student.homeAddress;
  const { address } = student;
  const parts = [address?.street, address?.city, address?.state, address?.country, address?.postalCode]
    .filter(Boolean)
    .join(', ');
  return parts || '—';
};

const toReportRow = (student: Student): StudentReportRow => {
  return {
    admissionNumber: student.admissionNumber || '—',
    cardNumber: student.cardNumber || '—',
    status: formatStatus(student.status),
    fullName: student.fullName,
    gender: student.gender === 'male' ? 'Male' : 'Female',
    age: student.age != null ? `${student.age}` : '—',
    dateOfBirth: formatDate(student.dateOfBirth ?? student.birthDate ?? null),
    nationality: student.nationality || '—',
    religion: student.religion || '—',
    bloodGroup: student.bloodGroup || '—',
    school: student.school?.schoolName || '—',
    applyingGrade: student.applyingGrade || '—',
    admissionYear: student.admissionYear || '—',
    admissionFeeStatus: formatStatus(student.admissionFeeStatus),
    guardianName: student.guardianName || student.fatherName || '—',
    guardianPhone: student.guardianPhone || '—',
    contactPhone: student.phone || '—',
    email: student.email || '—',
    address: buildAddress(student),
    originLocation: buildLocation(student.origProvince, student.origDistrict, student.origVillage),
    currentLocation: buildLocation(student.currProvince, student.currDistrict, student.currVillage),
    previousSchool: student.previousSchool || '—',
    isOrphan: student.isOrphan ? 'Yes' : 'No',
    disabilityStatus: student.disabilityStatus || '—',
    emergencyContact:
      student.emergencyContactName || student.emergencyContactPhone
        ? `${student.emergencyContactName || ''} ${student.emergencyContactPhone || ''}`.trim()
        : '—',
  };
};

const highlight = (label: string, value: string) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">{label}</span>
    <span className="text-foreground">{value || '—'}</span>
  </div>
);

const StudentReport = () => {
  const { t } = useLanguage();
  const { data: students, isLoading } = useStudents();
  const { data: schools } = useSchools();

  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    const list = students || [];
    const query = searchQuery.toLowerCase();

    return list.filter(student => {
      if (statusFilter !== 'all' && student.status !== statusFilter) return false;
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false;
      if (schoolFilter !== 'all' && student.schoolId !== schoolFilter) return false;

      if (!query) return true;

      return (
        (student.fullName || '').toLowerCase().includes(query) ||
        (student.admissionNumber || '').toLowerCase().includes(query) ||
        (student.fatherName || '').toLowerCase().includes(query) ||
        (student.guardianPhone || '').toLowerCase().includes(query) ||
        (student.cardNumber || '').toLowerCase().includes(query)
      );
    });
  }, [students, statusFilter, genderFilter, schoolFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const male = filteredStudents.filter(s => s.gender === 'male').length;
    const female = filteredStudents.filter(s => s.gender === 'female').length;
    const orphans = filteredStudents.filter(s => s.isOrphan).length;

    return { total, male, female, orphans };
  }, [filteredStudents]);

  const reportRows = useMemo(() => filteredStudents.map(toReportRow), [filteredStudents]);

  const selectedSchool = useMemo(
    () => (schoolFilter !== 'all' ? schools?.find(s => s.id === schoolFilter) : null),
    [schoolFilter, schools]
  );

  const exportSchool = selectedSchool || schools?.[0];

  const filtersSummary = useMemo(() => {
    const summaries: string[] = [];
    if (statusFilter !== 'all') summaries.push(`Status: ${statusFilter}`);
    if (genderFilter !== 'all') summaries.push(`Gender: ${genderFilter}`);
    if (schoolFilter !== 'all') summaries.push(`School: ${selectedSchool?.schoolName || schoolFilter}`);
    if (searchQuery) summaries.push(`Search: ${searchQuery}`);
    return summaries.join(' | ');
  }, [genderFilter, schoolFilter, searchQuery, selectedSchool, statusFilter]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!exportSchool) {
      toast.error('A school is required to export the report.');
      return;
    }

    try {
      const { blob, filename } = await studentsApi.exportReport({
        format,
        school_id: exportSchool.id,
        student_status: statusFilter !== 'all' ? statusFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        search: searchQuery || undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `student-registration-report.${format === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export the report. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>{t('reports.studentReport.title') || 'Student Registration Report'}</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">Insightful reporting for every registered student</h1>
          <p className="max-w-3xl text-muted-foreground">
            Review the complete registration footprint of each student with personal, academic, guardian, and location
            details. Export polished PDF or Excel summaries that mirror the on-screen table design.
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><UserRound className="h-4 w-4" /> Total {stats.total}</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Male {stats.male}</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Female {stats.female}</span>
            <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Orphans {stats.orphans}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" asChild>
            <Link to="/students">Back to registrations</Link>
          </Button>
          <Button variant="secondary" onClick={() => handleExport('csv')} disabled={!reportRows.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV / Excel
          </Button>
          <Button variant="default" onClick={() => handleExport('pdf')} disabled={!reportRows.length}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Registration overview</CardTitle>
              <CardDescription>Search, filter, and export every registration detail in one place.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              {filtersSummary || 'No filters applied'}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
            <div className="relative">
              <Input
                placeholder="Search by name, admission number, guardian phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Select value={schoolFilter} onValueChange={(value) => setSchoolFilter(value as typeof schoolFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schools</SelectItem>
                {schools?.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.schoolName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="admitted">Admitted</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={(value) => setGenderFilter(value as typeof genderFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="Loading student registrations..." />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[1400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-44">Admission</TableHead>
                      <TableHead className="w-72">Student</TableHead>
                      <TableHead className="w-64">Guardian & Contact</TableHead>
                      <TableHead className="w-80">Locations</TableHead>
                      <TableHead className="w-72">School & Academics</TableHead>
                      <TableHead className="w-72">Health & Safety</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No student registrations match the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="align-top">
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="px-2 py-1 text-xs">
                                {student.admissionNumber || '—'}
                              </Badge>
                              <Badge variant={statusBadgeVariant(student.status)} className="text-xs capitalize">
                                {formatStatus(student.status)}
                              </Badge>
                            </div>
                            {highlight('Card', student.cardNumber || '—')}
                            {highlight('Admission Year', student.admissionYear || '—')}
                            {highlight('Fee', student.admissionFeeStatus || '—')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>
                              <p className="font-semibold text-lg leading-tight">{student.fullName}</p>
                              <p className="text-sm text-muted-foreground">Father: {student.fatherName || '—'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">{student.gender === 'male' ? 'Male' : 'Female'}</Badge>
                              <Badge variant="outline" className="text-xs">Age: {student.age ?? '—'}</Badge>
                              <Badge variant="outline" className="text-xs">{formatDate(student.dateOfBirth)}</Badge>
                            </div>
                            <div className="flex flex-col gap-1">
                              {highlight('Nationality', student.nationality || '—')}
                              {highlight('Religion', student.religion || '—')}
                              {highlight('Blood', student.bloodGroup || '—')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="font-semibold">{student.guardianName || student.fatherName || '—'}</p>
                              <p className="text-sm text-muted-foreground">{student.guardianRelation || 'Guardian'}</p>
                            </div>
                            {highlight('Guardian Phone', student.guardianPhone || '—')}
                            {highlight('Contact Phone', student.phone || '—')}
                            {highlight('Email', student.email || '—')}
                            {highlight('Address', buildAddress(student))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs uppercase text-muted-foreground">Origin</p>
                                <p className="font-medium">{buildLocation(student.origProvince, student.origDistrict, student.origVillage)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs uppercase text-muted-foreground">Current</p>
                                <p className="font-medium">{buildLocation(student.currProvince, student.currDistrict, student.currVillage)}</p>
                              </div>
                            </div>
                            {highlight('Previous School', student.previousSchool || '—')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="font-semibold">{student.school?.schoolName || '—'}</p>
                            {highlight('Applying Grade', student.applyingGrade || '—')}
                            {highlight('Nationality', student.nationality || '—')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {student.isOrphan && <Badge variant="secondary">Orphan</Badge>}
                              {student.disabilityStatus && (
                                <Badge variant="outline" className="text-xs">{student.disabilityStatus}</Badge>
                              )}
                            </div>
                            {highlight('Emergency',
                              student.emergencyContactName || student.emergencyContactPhone
                                ? `${student.emergencyContactName || ''} ${student.emergencyContactPhone || ''}`.trim()
                                : '—'
                            )}
                            {highlight('Health', student.healthInfo?.medicalConditions?.join(', ') || '—')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentReport;
