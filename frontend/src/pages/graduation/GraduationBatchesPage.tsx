import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGraduationBatches, useCreateGraduationBatch } from '@/hooks/useGraduation';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClasses } from '@/hooks/useClasses';
import { useExams } from '@/hooks/useExams';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';

export default function GraduationBatchesPage() {
  const { t } = useLanguage();
  const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<string | undefined>(undefined);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [examId, setExamId] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: schools = [] } = useSchools();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: classes = [] } = useClasses();
  const { data: exams = [] } = useExams();

  const { data: batches = [], isLoading } = useGraduationBatches({
    school_id: schoolId,
    academic_year_id: academicYearId,
    class_id: classId,
    exam_id: examId,
  });

  const createBatch = useCreateGraduationBatch();
  const [form, setForm] = useState({
    school_id: '',
    academic_year_id: '',
    class_id: '',
    exam_id: '',
    graduation_date: '',
  });

  const classNameById = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes]
  );
  const academicYearNameById = useMemo(
    () => Object.fromEntries(academicYears.map((ay) => [ay.id, ay.name])),
    [academicYears]
  );
  const examNameById = useMemo(
    () => Object.fromEntries(exams.map((ex) => [ex.id, ex.name])),
    [exams]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBatch.mutateAsync(form);
    setCreateOpen(false);
    setForm({
      school_id: '',
      academic_year_id: '',
      class_id: '',
      exam_id: '',
      graduation_date: '',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t('nav.graduationCertificates')}</p>
          <h1 className="text-2xl font-semibold">{t('nav.graduation.batches')}</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>{t('common.create')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('nav.graduation.batches')}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('common.schoolManagement')}</Label>
                  <Select
                    value={form.school_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, school_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectSchool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.school_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('fees.academicYear')}</Label>
                  <Select
                    value={form.academic_year_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, academic_year_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((ay) => (
                        <SelectItem key={ay.id} value={ay.id}>
                          {ay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('fees.class')}</Label>
                  <Select
                    value={form.class_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, class_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('nav.exams')}</Label>
                  <Select
                    value={form.exam_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, exam_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('nav.exams')} />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>{t('common.graduationDate') ?? 'Graduation Date'}</Label>
                  <Input
                    type="date"
                    value={form.graduation_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, graduation_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createBatch.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.filter')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{t('common.schoolManagement')}</Label>
            <Select value={schoolId || ''} onValueChange={(val) => setSchoolId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectSchool')} />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.school_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('fees.academicYear')}</Label>
            <Select value={academicYearId || ''} onValueChange={(val) => setAcademicYearId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('fees.class')}</Label>
            <Select value={classId || ''} onValueChange={(val) => setClassId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectClass') ?? 'Select'} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('nav.exams')}</Label>
            <Select value={examId || ''} onValueChange={(val) => setExamId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('nav.exams')} />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.graduation.batches')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fees.academicYear')}</TableHead>
                  <TableHead>{t('fees.class')}</TableHead>
                  <TableHead>{t('nav.exams')}</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{t('common.statusLabel')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell>{academicYearNameById[batch.academic_year_id] || batch.academic_year_id}</TableCell>
                    <TableCell>{classNameById[batch.class_id] || batch.class_id}</TableCell>
                    <TableCell>{examNameById[batch.exam_id] || batch.exam_id}</TableCell>
                    <TableCell>{batch.graduation_date}</TableCell>
                    <TableCell className="capitalize">{batch.status}</TableCell>
                    <TableCell>
                      <Button variant="link" asChild>
                        <Link to={`/graduation/batches/${batch.id}`}>{t('common.view')}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
