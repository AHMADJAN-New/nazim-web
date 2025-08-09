import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Printer, CreditCard, QrCode, User, Calendar, MapPin } from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { supabase } from '@/integrations/supabase/client';

export default function IdCardPage() {
  interface StudentCard {
    id: string;
    name: string;
    studentId: string;
    class: string;
    section: string;
    photo: string;
    dob: string;
    fatherName: string;
    address: string;
    phone: string;
    email: string;
    admissionDate: string;
    validUntil: string;
  }

  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentCard | null>(null);

  const { data: studentsData = [], isLoading } = useStudents();
  const { data: classesData = [] } = useClasses();

  const students: StudentCard[] = useMemo(() => studentsData.map((student) => {
    const admission = new Date(student.admission_date);
    admission.setFullYear(admission.getFullYear() + 1);
    return {
      id: student.id,
      name: student.profiles?.full_name || '',
      studentId: student.student_id,
      class: student.classes?.name || '',
      section: student.classes?.section || '',
      photo: student.profiles?.avatar_url || '/placeholder.svg',
      dob: student.date_of_birth || '',
      fatherName: student.guardian_name || '',
      address: student.profiles?.address || '',
      phone: student.guardian_phone || student.profiles?.phone || '',
      email: student.profiles?.email || '',
      admissionDate: student.admission_date,
      validUntil: admission.toISOString().split('T')[0],
    };
  }), [studentsData]);

  const classOptions = useMemo(
    () => Array.from(new Set(classesData.map((c) => c.name))),
    [classesData]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass =
        !selectedClass || selectedClass === 'all' || student.class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, selectedClass]);

  const handlePreview = (student: StudentCard) => {
    setSelectedStudent(student);
    setPreviewOpen(true);
  };

  const handlePrint = async (student: StudentCard) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-id-card', {
        body: { studentId: student.id }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error generating ID card:', err);
    }
  };

  const handleBulkGenerate = async () => {
    try {
      const studentIds = filteredStudents.map((s) => s.id);
      const { data, error } = await supabase.functions.invoke('generate-id-cards-bulk', {
        body: { studentIds }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error generating bulk ID cards:', err);
    }
  };

  if (isLoading) {
    return (
      <MainLayout
        title={t('ID Card Generation')}
        showBreadcrumb
        breadcrumbItems={[
          { label: t('Students'), href: '/students' },
          { label: t('ID Cards') }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={t('ID Card Generation')}
      showBreadcrumb
      breadcrumbItems={[
        { label: t('Students'), href: '/students' },
        { label: t('ID Cards') }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className={`flex flex-col sm:flex-row gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={t('Search students...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isRTL ? 'pr-10' : 'pl-10'}
            />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('Select Class')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Classes')}</SelectItem>
              {classOptions.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBulkGenerate} className="whitespace-nowrap">
            <CreditCard className="h-4 w-4" />
            {t('Bulk Generate')}
          </Button>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="object-cover w-full h-full" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{student.studentId}</Badge>
                      <Badge variant="outline">{student.class} - {student.section}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <User className="h-4 w-4" />
                    <span>{student.fatherName}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Calendar className="h-4 w-4" />
                    <span>{student.dob}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{student.address}</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button size="sm" variant="outline" onClick={() => handlePreview(student)}>
                    <CreditCard className="h-4 w-4" />
                    {t('Preview')}
                  </Button>
                  <Button size="sm" onClick={() => handlePrint(student)}>
                    <Printer className="h-4 w-4" />
                    {t('Print')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('No Students Found')}</h3>
              <p className="text-muted-foreground">{t('Try adjusting your search criteria.')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ID Card Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ID Card Preview')}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              {/* ID Card Design */}
              <div className="bg-gradient-to-br from-primary to-primary-light p-6 rounded-lg text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white rounded-full"></div>
                  <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white rounded-full"></div>
                </div>
                
                {/* School Header */}
                <div className="text-center mb-4 relative z-10">
                  <h3 className="text-lg font-bold">مدرسة النظام الإسلامية</h3>
                  <p className="text-sm opacity-90">Nazim Islamic School</p>
                </div>

                {/* Student Info */}
                <div className={`flex gap-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-20 h-24 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                    {selectedStudent.photo ? (
                      <img
                        src={selectedStudent.photo}
                        alt={selectedStudent.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-lg">{selectedStudent.name}</h4>
                    <p className="text-sm opacity-90">{selectedStudent.studentId}</p>
                    <p className="text-sm opacity-90">{selectedStudent.class} - {selectedStudent.section}</p>
                    <p className="text-xs opacity-75">{t('Father')}: {selectedStudent.fatherName}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className={`flex justify-between items-center mt-4 text-xs opacity-75 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('Valid Until')}: {selectedStudent.validUntil}</span>
                  <QrCode className="h-6 w-6" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button className="flex-1" onClick={() => handlePrint(selectedStudent)}>
                  <Printer className="h-4 w-4" />
                  {t('Print')}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4" />
                  {t('Download')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}