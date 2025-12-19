import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useStaff } from '@/hooks/useStaff';
import type { Student } from '@/types/domain/student';
import type { Staff } from '@/types/domain/staff';
import { Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';

interface RecipientSelectorProps {
  recipientType: 'student' | 'staff' | 'external' | 'applicant';
  selectedRecipientId: string | null;
  onRecipientChange: (recipientId: string | null, recipientData?: any) => void;
  selectedAcademicYearId?: string | null;
  onAcademicYearChange?: (academicYearId: string | null) => void;
  selectedClassId?: string | null;
  onClassChange?: (classId: string | null) => void;
  externalRecipientName?: string;
  externalRecipientOrg?: string;
  externalRecipientAddress?: string;
  onExternalRecipientChange?: (field: 'name' | 'org' | 'address', value: string) => void;
  required?: boolean;
  error?: string;
}

export function RecipientSelector({
  recipientType,
  selectedRecipientId,
  onRecipientChange,
  selectedAcademicYearId,
  onAcademicYearChange,
  selectedClassId,
  onClassChange,
  externalRecipientName = '',
  externalRecipientOrg = '',
  externalRecipientAddress = '',
  onExternalRecipientChange,
  required = false,
  error,
}: RecipientSelectorProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Fetch academic years
  const { data: academicYears, isLoading: academicYearsLoading } = useAcademicYears(profile?.organization_id);
  const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);

  // Fetch classes for selected academic year
  const { data: classAcademicYears, isLoading: classesLoading } = useClassAcademicYears(
    selectedAcademicYearId || currentAcademicYear?.id || undefined,
    profile?.organization_id
  );

  // Auto-select current academic year if not selected and available
  const effectiveAcademicYearId = selectedAcademicYearId || currentAcademicYear?.id || null;

  // Fetch student admissions with active status and academic year/class filters
  const { data: studentAdmissions, isLoading: studentsLoading } = useStudentAdmissions(
    profile?.organization_id,
    false,
    {
      enrollment_status: 'active',
      academic_year_id: effectiveAcademicYearId || undefined,
      class_academic_year_id: selectedClassId || undefined,
    }
  );

  // Extract students from admissions
  const allStudents = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);

  // Fetch all staff (will filter client-side)
  const { data: allStaff, isLoading: staffLoading } = useStaff(profile?.organization_id, false);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!allStudents || !Array.isArray(allStudents)) return [];
    
    let filtered = allStudents as Student[];

    // Filter by search query
    if (studentSearchQuery.trim()) {
      const query = studentSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => {
        const name = (s.fullName || '').toLowerCase();
        const admissionNo = (s.admissionNumber || '').toLowerCase();
        const rollNumber = (s.rollNumber || '').toLowerCase();
        const fatherName = (s.fatherName || '').toLowerCase();
        return name.includes(query) || admissionNo.includes(query) || rollNumber.includes(query) || fatherName.includes(query);
      });
    }

    return filtered;
  }, [allStudents, studentSearchQuery]);

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    if (!allStaff || !Array.isArray(allStaff)) return [];
    
    if (!staffSearchQuery.trim()) return allStaff as Staff[];

    const query = staffSearchQuery.toLowerCase().trim();
    return (allStaff as Staff[]).filter(s => {
      const name = (s.fullName || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      const position = (s.position || '').toLowerCase();
      const department = (s.department || '').toLowerCase();
      return name.includes(query) || code.includes(query) || position.includes(query) || department.includes(query);
    });
  }, [allStaff, staffSearchQuery]);

  // Get unique classes from class academic years
  const classOptions = useMemo(() => {
    if (!classAcademicYears || !Array.isArray(classAcademicYears)) return [];
    
    const uniqueClasses = new Map<string, { id: string; name: string; section?: string }>();
    classAcademicYears.forEach(cay => {
      if (cay.class && !uniqueClasses.has(cay.classId)) {
        const className = cay.sectionName 
          ? `${cay.class.name} - ${cay.sectionName}`
          : cay.class.name;
        uniqueClasses.set(cay.classId, {
          id: cay.classId,
          name: className,
          section: cay.sectionName || undefined,
        });
      }
    });
    return Array.from(uniqueClasses.values());
  }, [classAcademicYears]);

  if (recipientType === 'student') {
    return (
      <div className="space-y-4">
        {/* Academic Year Selection */}
        <div className="space-y-2">
          <Label>
            Academic Year {required && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={effectiveAcademicYearId || ''}
            onValueChange={(value) => {
              onAcademicYearChange?.(value || null);
              // Clear class and recipient when academic year changes
              onClassChange?.(null);
              onRecipientChange(null);
            }}
            disabled={academicYearsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={academicYearsLoading ? 'Loading...' : 'Select academic year'} />
            </SelectTrigger>
            <SelectContent>
              {academicYears?.map((ay) => (
                <SelectItem key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class Selection (Optional) */}
        {effectiveAcademicYearId && (
          <div className="space-y-2">
            <Label>Class (Optional)</Label>
            <Select
              value={selectedClassId || 'all'}
              onValueChange={(value) => {
                const classId = value === 'all' ? null : value;
                onClassChange?.(classId);
                // Clear recipient when class changes
                onRecipientChange(null);
              }}
              disabled={classesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={classesLoading ? 'Loading...' : 'All classes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Student Search and Selection */}
        <div className="space-y-2">
          <Label>
            Student {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission number, roll number, or father's name..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {studentsLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!studentsLoading && filteredStudents.length === 0 && studentSearchQuery.trim() && (
              <p className="text-sm text-muted-foreground">No students found</p>
            )}
            {!studentsLoading && filteredStudents.length === 0 && !studentSearchQuery.trim() && (
              <p className="text-sm text-muted-foreground">Start typing to search for students</p>
            )}
            {!studentsLoading && filteredStudents.length > 0 && (
              <Select
                value={selectedRecipientId || ''}
                onValueChange={(value) => {
                  const student = filteredStudents.find(s => s.id === value);
                  onRecipientChange(value || null, student);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.slice(0, 100).map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{student.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.admissionNumber && `Adm: ${student.admissionNumber}`}
                          {student.rollNumber && ` • Roll: ${student.rollNumber}`}
                          {student.fatherName && ` • Father: ${student.fatherName}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Selected Student Info */}
        {selectedRecipientId && !studentsLoading && (
          <div className="p-3 bg-muted/50 rounded-md">
            {(() => {
              const student = filteredStudents.find(s => s.id === selectedRecipientId);
              if (!student) return null;
              return (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{student.fullName}</p>
                  <div className="text-muted-foreground space-y-0.5">
                    {student.admissionNumber && <p>Admission: {student.admissionNumber}</p>}
                    {student.rollNumber && <p>Roll: {student.rollNumber}</p>}
                    {student.className && <p>Class: {student.className}</p>}
                    {student.fatherName && <p>Father: {student.fatherName}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  if (recipientType === 'staff') {
    return (
      <div className="space-y-4">
        {/* Staff Search and Selection */}
        <div className="space-y-2">
          <Label>
            Staff {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, position, or department..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {staffLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!staffLoading && filteredStaff.length === 0 && staffSearchQuery.trim() && (
              <p className="text-sm text-muted-foreground">No staff found</p>
            )}
            {!staffLoading && filteredStaff.length > 0 && (
              <Select
                value={selectedRecipientId || ''}
                onValueChange={(value) => {
                  const staff = filteredStaff.find(s => s.id === value);
                  onRecipientChange(value || null, staff);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.slice(0, 100).map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{staff.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {staff.position && `Position: ${staff.position}`}
                          {staff.department && ` • Dept: ${staff.department}`}
                          {staff.code && ` • Code: ${staff.code}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Selected Staff Info */}
        {selectedRecipientId && !staffLoading && (
          <div className="p-3 bg-muted/50 rounded-md">
            {(() => {
              const staff = filteredStaff.find(s => s.id === selectedRecipientId);
              if (!staff) return null;
              return (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{staff.fullName}</p>
                  <div className="text-muted-foreground space-y-0.5">
                    {staff.position && <p>Position: {staff.position}</p>}
                    {staff.department && <p>Department: {staff.department}</p>}
                    {staff.code && <p>Code: {staff.code}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  if (recipientType === 'external') {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <Label>External Recipient</Label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm">Name {required && <span className="text-destructive">*</span>}</Label>
            <Input
              value={externalRecipientName}
              onChange={(e) => onExternalRecipientChange?.('name', e.target.value)}
              placeholder="Recipient name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Organization</Label>
            <Input
              value={externalRecipientOrg}
              onChange={(e) => onExternalRecipientChange?.('org', e.target.value)}
              placeholder="Organization"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Address</Label>
          <Input
            value={externalRecipientAddress}
            onChange={(e) => onExternalRecipientChange?.('address', e.target.value)}
            placeholder="Recipient address"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Applicant type (similar to student but without class filtering for now)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Applicant {required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          value={selectedRecipientId || ''}
          onChange={(e) => onRecipientChange(e.target.value || null)}
          placeholder="Enter applicant ID (UUID)"
        />
        <p className="text-xs text-muted-foreground">
          Applicant selection will be enhanced in a future update
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

