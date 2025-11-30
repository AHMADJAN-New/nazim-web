import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    PersonalInformationSection,
    AdmissionInformationSection,
    AddressInformationSection,
    GuardianInformationSection,
    OtherInformationSection,
} from './StudentFormSections';
import { useStudentAutocomplete } from '@/hooks/useStudentAutocomplete';
import { StudentAutocompleteInput } from './StudentAutocompleteInput';
import { StudentPictureUpload } from './StudentPictureUpload';
import { useStudentDuplicateCheck } from '@/hooks/useStudentDuplicateCheck';
import { useSchools } from '@/hooks/useSchools';
import { useProfile } from '@/hooks/useProfiles';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { useLanguage } from '@/hooks/useLanguage';
import type { Student } from '@/hooks/useStudents';
import { StudentDocumentsDialog } from './StudentDocumentsDialog';
import { StudentEducationalHistoryDialog } from './StudentEducationalHistoryDialog';
import { StudentDisciplineRecordsDialog } from './StudentDisciplineRecordsDialog';

export interface StudentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student?: Student | null;
    onSuccess?: () => void;
    onSubmitData?: (values: StudentFormValues, isEdit: boolean, pictureFile?: File | null) => Promise<void> | void;
}

type StudentFormValues = {
    organization_id?: string;
    school_id?: string | null;
    admission_no: string;
    card_number?: string | null;
    full_name: string;
    father_name: string;
    grandfather_name?: string | null;
    mother_name?: string | null;
    gender: 'male' | 'female';
    birth_year?: string | null;
    birth_date?: string | null;
    age?: number | null;
    admission_year?: string | null;
    applying_grade?: string | null;
    preferred_language?: string | null;
    nationality?: string | null;
    previous_school?: string | null;
    orig_province?: string | null;
    orig_district?: string | null;
    orig_village?: string | null;
    curr_province?: string | null;
    curr_district?: string | null;
    curr_village?: string | null;
    home_address?: string | null;
    guardian_name?: string | null;
    guardian_relation?: string | null;
    guardian_phone?: string | null;
    guardian_tazkira?: string | null;
    guardian_picture_path?: string | null;
    zamin_name?: string | null;
    zamin_phone?: string | null;
    zamin_tazkira?: string | null;
    zamin_address?: string | null;
    admission_fee_status: 'paid' | 'pending' | 'waived' | 'partial';
    student_status: 'applied' | 'admitted' | 'active' | 'withdrawn';
    is_orphan: boolean;
    disability_status?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    family_income?: string | null;
};

export function StudentFormDialog({ open, onOpenChange, student, onSuccess, onSubmitData }: StudentFormDialogProps) {
    const isEdit = !!student;
    const { t } = useLanguage();
    const { data: ac } = useStudentAutocomplete();
    const [selectedPictureFile, setSelectedPictureFile] = useState<File | null>(null);
    const pictureUpload = useStudentPictureUpload();
    
    // Dialog states for documents, history, and discipline
    const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);

    const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = useForm<StudentFormValues>({
        defaultValues: {
            admission_no: '',
            card_number: '',
            full_name: '',
            father_name: '',
            grandfather_name: '',
            mother_name: '',
            gender: 'male',
            birth_year: '',
            birth_date: '',
            age: undefined,
            admission_year: '',
            applying_grade: '',
            preferred_language: 'Dari',
            nationality: 'Afghan',
            previous_school: '',
            orig_province: '',
            orig_district: '',
            orig_village: '',
            curr_province: '',
            curr_district: '',
            curr_village: '',
            home_address: '',
            guardian_name: '',
            guardian_relation: '',
            guardian_phone: '',
            guardian_tazkira: '',
            guardian_picture_path: '',
            zamin_name: '',
            zamin_phone: '',
            zamin_tazkira: '',
            zamin_address: '',
            admission_fee_status: 'pending',
            student_status: 'active',
            is_orphan: false,
            disability_status: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            family_income: '',
            school_id: null,
        },
    });

    const duplicateCheck = useStudentDuplicateCheck();
    const { data: profile } = useProfile();
    const isSuperAdmin = profile?.role === 'super_admin';
    const orgIdForQuery = isSuperAdmin ? undefined : profile?.organization_id;
    const { data: schools } = useSchools(orgIdForQuery);
    const formValues = watch();

    // If only one school exists, preselect it automatically
    useEffect(() => {
        if (schools && schools.length === 1) {
            setValue('school_id', schools[0].id);
        }
    }, [schools, setValue]);

    // Reset form when dialog opens and when switching between create/edit modes
    useEffect(() => {
        if (!open) {
            setSelectedPictureFile(null);
            return;
        }
        if (student) {
            reset({
                admission_no: student.admission_no || '',
                card_number: student.card_number || '',
                full_name: student.full_name || '',
                father_name: student.father_name || '',
                grandfather_name: student.grandfather_name || '',
                mother_name: student.mother_name || '',
                gender: (student.gender as 'male' | 'female') || 'male',
                birth_year: student.birth_year || '',
                birth_date: student.birth_date || '',
                age: student.age ?? undefined,
                admission_year: student.admission_year || '',
                applying_grade: student.applying_grade || '',
                preferred_language: student.preferred_language || 'Dari',
                nationality: student.nationality || 'Afghan',
                previous_school: student.previous_school || '',
                orig_province: student.orig_province || '',
                orig_district: student.orig_district || '',
                orig_village: student.orig_village || '',
                curr_province: student.curr_province || '',
                curr_district: student.curr_district || '',
                curr_village: student.curr_village || '',
                home_address: student.home_address || '',
                guardian_name: student.guardian_name || '',
                guardian_relation: student.guardian_relation || '',
                guardian_phone: student.guardian_phone || '',
                guardian_tazkira: student.guardian_tazkira || '',
                guardian_picture_path: student.guardian_picture_path || '',
                zamin_name: student.zamin_name || '',
                zamin_phone: student.zamin_phone || '',
                zamin_tazkira: student.zamin_tazkira || '',
                zamin_address: student.zamin_address || '',
                admission_fee_status: student.admission_fee_status || 'pending',
                student_status: student.student_status || 'active',
                is_orphan: !!student.is_orphan,
                disability_status: student.disability_status || '',
                emergency_contact_name: student.emergency_contact_name || '',
                emergency_contact_phone: student.emergency_contact_phone || '',
                family_income: student.family_income || '',
                school_id: student.school_id || null,
            });
        } else {
            reset({
                admission_no: '',
                card_number: '',
                full_name: '',
                father_name: '',
                grandfather_name: '',
                mother_name: '',
                gender: 'male',
                birth_year: '',
                birth_date: '',
                age: undefined,
                admission_year: '',
                applying_grade: '',
                preferred_language: 'Dari',
                nationality: 'Afghan',
                previous_school: '',
                orig_province: '',
                orig_district: '',
                orig_village: '',
                curr_province: '',
                curr_district: '',
                curr_village: '',
                home_address: '',
                guardian_name: '',
                guardian_relation: '',
                guardian_phone: '',
                guardian_tazkira: '',
                guardian_picture_path: '',
                zamin_name: '',
                zamin_phone: '',
                zamin_tazkira: '',
                zamin_address: '',
                admission_fee_status: 'pending',
                student_status: 'active',
                is_orphan: false,
                disability_status: '',
                emergency_contact_name: '',
                emergency_contact_phone: '',
                family_income: '',
                school_id: (schools && schools.length === 1) ? schools[0].id : null,
            });
        }
    }, [open, student, reset, schools]);

    const onSubmit = async (values: StudentFormValues) => {
        // Duplicate check before closing
        try {
            const dupes = await duplicateCheck.mutateAsync({
                full_name: values.full_name,
                father_name: values.father_name,
                tazkira_number: values.guardian_tazkira || null,
                card_number: values.card_number || null,
                admission_no: values.admission_no || null,
            });

            if (dupes.length > 0 && !isEdit) {
                // Simple confirm UX; can be upgraded to custom dialog
                const first = dupes[0];
                const proceed = window.confirm(
                    `${t('students.potentialDuplicate') || 'Potential duplicate found'} (e.g., ${first.full_name} - ${first.match_reason}).\n` +
                    `${t('students.proceedCreate') || 'Do you still want to proceed creating a new record?'}`
                );
                if (!proceed) {
                    return;
                }
            }
        } catch {
            // Ignore duplicate check failure; allow proceed
        }

        if (onSubmitData) {
            // Pass the selected picture file to the parent so it can upload after student creation
            await onSubmitData(values, isEdit, selectedPictureFile);
        }
        onSuccess?.();
        setSelectedPictureFile(null);
        onOpenChange(false);
    };

    return (
    <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('students.editStudent') || 'Edit Student' : t('students.add') || 'Register Student'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? t('students.updateDescription') || 'Update registration and guardian details.' : t('students.addDescription') || 'Capture admission details with guardian and residency information.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* School selection when multiple schools exist */}
                    {schools && schools.length > 1 && (
                        <AdmissionInformationSection>
                            <div className="md:col-span-2">
                                <Label>{t('students.school') || 'School'}</Label>
                                <Controller
                                    control={control}
                                    name="school_id"
                                    render={({ field }) => (
                                        <Select value={field.value || ''} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('students.selectSchool') || 'Select school'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {schools.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.school_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </AdmissionInformationSection>
                    )}

                    <AdmissionInformationSection>
                        <div>
                            <Label>{t('students.admissionNo') || 'Admission No'}</Label>
                            <Input placeholder="SH-2024-001" {...register('admission_no')} />
                        </div>
                        <div>
                            <Label>{t('students.cardNumber') || 'Card Number'}</Label>
                            <Input placeholder="Card-1001" {...register('card_number')} />
                        </div>
                        <div>
                            <Label>{t('students.applyingGrade') || 'Applying Grade'}</Label>
                            <Input placeholder="Grade 7" {...register('applying_grade')} />
                        </div>
                        <div>
                            <Label>{t('students.admissionYear') || 'Admission Year'}</Label>
                            <Input placeholder="2024" {...register('admission_year')} />
                        </div>
                    </AdmissionInformationSection>

                    <PersonalInformationSection>
                        <div>
                            <Label>{t('students.fullName') || 'Full Name'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.fullName') || 'Student full name'}
                                suggestions={ac?.names || []}
                                {...register('full_name')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.fatherName') || 'Father Name'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.fatherName') || 'Father name'}
                                suggestions={ac?.fatherNames || []}
                                {...register('father_name')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.grandfatherName') || 'Grandfather Name'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.grandfatherName') || 'Grandfather name'}
                                suggestions={ac?.grandfatherNames || []}
                                {...register('grandfather_name')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.motherName') || 'Mother Name'}</Label>
                            <Input placeholder={t('students.motherName') || 'Mother name'} {...register('mother_name')} />
                        </div>
                        <div>
                            <Label>{t('students.gender') || 'Gender'}</Label>
                            <Controller
                                name="gender"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('students.selectGender') || 'Select gender'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">{t('students.male') || 'Male'}</SelectItem>
                                            <SelectItem value="female">{t('students.female') || 'Female'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label>{t('students.birthYear') || 'Birth Year'}</Label>
                            <Input placeholder="1387" {...register('birth_year')} />
                        </div>
                        <div>
                            <Label>{t('students.birthDate') || 'Birth Date'}</Label>
                            <Input placeholder="2008-03-21" {...register('birth_date')} />
                        </div>
                        <div>
                            <Label>{t('students.age') || 'Age'}</Label>
                            <Input type="number" placeholder="15" {...register('age', { valueAsNumber: true })} />
                        </div>
                        <div>
                            <Label>{t('students.preferredLanguage') || 'Preferred Language'}</Label>
                            <Input placeholder="Dari / Pashto" {...register('preferred_language')} />
                        </div>
                        <div>
                            <Label>{t('students.nationality') || 'Nationality'}</Label>
                            <Input placeholder="Afghan" {...register('nationality')} />
                        </div>
                        <div className="md:col-span-2">
                            <Label>{t('students.previousSchool') || 'Previous School'}</Label>
                            <Input placeholder={t('students.previousSchool') || 'Previous madrasa or school'} {...register('previous_school')} />
                        </div>
                    </PersonalInformationSection>

                    <AddressInformationSection>
                        <div>
                            <Label>{t('students.originProvince') || 'Origin Province'}</Label>
                            <Input placeholder={t('students.originProvince') || 'Province'} {...register('orig_province')} />
                        </div>
                        <div>
                            <Label>{t('students.originDistrict') || 'Origin District'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.originDistrict') || 'District'}
                                suggestions={ac?.origDistricts || []}
                                {...register('orig_district')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.originVillage') || 'Origin Village'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.originVillage') || 'Village'}
                                suggestions={ac?.origVillages || []}
                                {...register('orig_village')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.currentProvince') || 'Current Province'}</Label>
                            <Input placeholder={t('students.currentProvince') || 'Province'} {...register('curr_province')} />
                        </div>
                        <div>
                            <Label>{t('students.currentDistrict') || 'Current District'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.currentDistrict') || 'District'}
                                suggestions={ac?.currDistricts || []}
                                {...register('curr_district')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.currentVillage') || 'Current Village'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.currentVillage') || 'Village'}
                                suggestions={ac?.currVillages || []}
                                {...register('curr_village')}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Label>{t('students.homeAddress') || 'Home Address'}</Label>
                            <Textarea placeholder={t('students.homeAddress') || 'Full address'} {...register('home_address')} />
                        </div>
                    </AddressInformationSection>

                    <GuardianInformationSection>
                        <div>
                            <Label>{t('students.guardianName') || 'Guardian Name'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.guardian') || 'Guardian'}
                                suggestions={ac?.guardianNames || []}
                                {...register('guardian_name')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.relation') || 'Relation'}</Label>
                            <Input placeholder={t('students.relation') || 'Relation'} {...register('guardian_relation')} />
                        </div>
                        <div>
                            <Label>{t('students.guardianPhone') || 'Guardian Phone'}</Label>
                            <Input placeholder={t('students.phone') || 'Phone'} {...register('guardian_phone')} />
                        </div>
                        <div>
                            <Label>{t('students.guardianTazkira') || 'Guardian Tazkira'}</Label>
                            <Input placeholder={t('students.guardianTazkira') || 'Tazkira'} {...register('guardian_tazkira')} />
                        </div>
                        <div className="md:col-span-2">
                            <Label>{t('students.guardianPicturePath') || 'Guardian Picture Path'}</Label>
                            <Input placeholder={t('students.guardianPicturePath') || 'Storage path'} {...register('guardian_picture_path')} />
                        </div>
                        <div>
                            <Label>{t('students.zaminName') || 'Zamin/Guarantor Name'}</Label>
                            <StudentAutocompleteInput
                                placeholder={t('students.zaminName') || 'Guarantor'}
                                suggestions={ac?.zaminNames || []}
                                {...register('zamin_name')}
                            />
                        </div>
                        <div>
                            <Label>{t('students.zaminPhone') || 'Zamin Phone'}</Label>
                            <Input placeholder={t('students.phone') || 'Phone'} {...register('zamin_phone')} />
                        </div>
                        <div>
                            <Label>{t('students.zaminTazkira') || 'Zamin Tazkira'}</Label>
                            <Input placeholder={t('students.zaminTazkira') || 'Tazkira'} {...register('zamin_tazkira')} />
                        </div>
                        <div className="md:col-span-2">
                            <Label>{t('students.zaminAddress') || 'Zamin Address'}</Label>
                            <Textarea placeholder={t('students.zaminAddress') || 'Guarantor address'} {...register('zamin_address')} />
                        </div>
                    </GuardianInformationSection>

                    <OtherInformationSection>
                        <div className="mb-4">
                            <Label>{t('students.studentPicture') || 'Student Picture'}</Label>
                            <div className="mt-2">
                                <StudentPictureUpload
                                    studentId={student?.id}
                                    organizationId={student?.organization_id || profile?.organization_id}
                                    schoolId={student?.school_id || formValues.school_id || null}
                                    currentFileName={student?.picture_path || null}
                                    onFileSelected={setSelectedPictureFile}
                                    allowUploadWithoutStudent={!isEdit}
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <Label>{t('students.admissionFeeStatus') || 'Admission Fee Status'}</Label>
                                <Controller
                                    control={control}
                                    name="admission_fee_status"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('students.feeStatus') || 'Fee status'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="paid">{t('students.paid') || 'Paid'}</SelectItem>
                                                <SelectItem value="pending">{t('students.pending') || 'Pending'}</SelectItem>
                                                <SelectItem value="waived">{t('students.waived') || 'Waived'}</SelectItem>
                                                <SelectItem value="partial">{t('students.partial') || 'Partial'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>{t('students.status') || 'Student Status'}</Label>
                                <Controller
                                    control={control}
                                    name="student_status"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('students.status') || 'Status'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="applied">{t('students.applied') || 'Applied'}</SelectItem>
                                                <SelectItem value="admitted">{t('students.admitted') || 'Admitted'}</SelectItem>
                                                <SelectItem value="active">{t('students.active') || 'Active'}</SelectItem>
                                                <SelectItem value="withdrawn">{t('students.withdrawn') || 'Withdrawn'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>{t('students.orphanStatus') || 'Orphan Status'}</Label>
                                <Controller
                                    control={control}
                                    name="is_orphan"
                                    render={({ field }) => (
                                        <Select value={field.value ? 'yes' : 'no'} onValueChange={(value) => field.onChange(value === 'yes')}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('students.orphan') || 'Orphan'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">{t('students.orphan') || 'Orphan'}</SelectItem>
                                                <SelectItem value="no">{t('students.hasParents') || 'Has parents'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>{t('students.disabilityStatus') || 'Disability Status'}</Label>
                                <Input placeholder={t('students.disabilityStatus') || 'e.g. Hearing impairment'} {...register('disability_status')} />
                            </div>
                            <div>
                                <Label>{t('students.emergencyContactName') || 'Emergency Contact Name'}</Label>
                                <Input placeholder={t('students.emergencyContactName') || 'Emergency contact'} {...register('emergency_contact_name')} />
                            </div>
                            <div>
                                <Label>{t('students.emergencyContactPhone') || 'Emergency Contact Phone'}</Label>
                                <Input placeholder={t('students.emergencyContactPhone') || 'Contact phone'} {...register('emergency_contact_phone')} />
                            </div>
                            <div className="md:col-span-3">
                                <Label>{t('students.familyIncome') || 'Family Income / Support Details'}</Label>
                                <Textarea placeholder={t('students.familyIncome') || 'Monthly income or donor support'} {...register('family_income')} />
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!isEdit}
                                onClick={() => {
                                    if (isEdit && student?.id) {
                                        setIsHistoryDialogOpen(true);
                                    }
                                }}
                            >
                                {t('students.educationalHistory') || 'Educational History'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!isEdit}
                                onClick={() => {
                                    if (isEdit && student?.id) {
                                        setIsDocumentsDialogOpen(true);
                                    }
                                }}
                            >
                                {t('students.studentDocuments') || 'Student Documents'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!isEdit}
                                onClick={() => {
                                    if (isEdit && student?.id) {
                                        setIsDisciplineDialogOpen(true);
                                    }
                                }}
                            >
                                {t('students.disciplineRecords') || 'Discipline Records'}
                            </Button>
                        </div>
                    </OtherInformationSection>

                    <DialogFooter>
                        <Button type="submit" className="w-full">
                            {isEdit ? t('common.save') || 'Update Student' : t('students.add') || 'Register Student'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Student Documents Dialog */}
        <StudentDocumentsDialog
            open={isDocumentsDialogOpen}
            onOpenChange={setIsDocumentsDialogOpen}
            student={student || null}
        />

        {/* Educational History Dialog */}
        <StudentEducationalHistoryDialog
            open={isHistoryDialogOpen}
            onOpenChange={setIsHistoryDialogOpen}
            student={student || null}
        />

        {/* Discipline Records Dialog */}
        <StudentDisciplineRecordsDialog
            open={isDisciplineDialogOpen}
            onOpenChange={setIsDisciplineDialogOpen}
            student={student || null}
        />
    </>
    );
}

export default StudentFormDialog;


