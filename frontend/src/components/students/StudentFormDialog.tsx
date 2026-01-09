import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState, memo } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { StudentAutocompleteInput } from './StudentAutocompleteInput';
import { StudentDisciplineRecordsDialog } from './StudentDisciplineRecordsDialog';
import { StudentDocumentsDialog } from './StudentDocumentsDialog';
import { StudentEducationalHistoryDialog } from './StudentEducationalHistoryDialog';
import {
    PersonalInformationSection,
    AdmissionInformationSection,
    AddressInformationSection,
    GuardianInformationSection,
    OtherInformationSection,
} from './StudentFormSections';
import { StudentPictureUpload } from './StudentPictureUpload';

import { UsageLimitWarning, useCanCreate } from '@/components/subscription';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAutocomplete } from '@/hooks/useStudentAutocomplete';


import { useStudentDuplicateCheck } from '@/hooks/useStudentDuplicateCheck';
import { useHasPermission } from '@/hooks/usePermissions';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { useLanguage } from '@/hooks/useLanguage';
import { studentSchema, type StudentFormData } from '@/lib/validations';
import type { Student } from '@/types/domain/student';

export interface StudentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student?: Student | null;
    onSuccess?: () => void;
    onSubmitData?: (values: StudentFormValues, isEdit: boolean, pictureFile?: File | null) => Promise<void> | void;
}

// Use StudentFormData from shared validation schema
type StudentFormValues = StudentFormData;

// PERFORMANCE: Memoized to prevent unnecessary re-renders
export const StudentFormDialog = memo(function StudentFormDialog({ open, onOpenChange, student, onSuccess, onSubmitData }: StudentFormDialogProps) {
    const isEdit = !!student;
    const { t } = useLanguage();
    const { data: ac } = useStudentAutocomplete();
    const [selectedPictureFile, setSelectedPictureFile] = useState<File | null>(null);
    const pictureUpload = useStudentPictureUpload();
    
    // Check usage limits for students (only relevant when creating new students)
    const studentUsage = useCanCreate('students');
    
    // Dialog states for documents, history, and discipline
    const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);

    const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
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
    const hasCreatePermission = useHasPermission('students.create');
    const hasUpdatePermission = useHasPermission('students.update');
    const hasStudentsPermission = hasCreatePermission || hasUpdatePermission;
    const orgIdForQuery = profile?.organization_id;
    const { data: schools } = useSchools(orgIdForQuery);
    const formValues = watch();
    const [activeTab, setActiveTab] = useState('admission');

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
            setActiveTab('admission');
            return;
        }
        if (student) {
            // Map Student domain object (camelCase) to form schema (snake_case)
            reset({
                admission_no: student.admissionNumber || '',
                card_number: student.cardNumber || '',
                full_name: student.fullName || '',
                father_name: student.fatherName || '',
                grandfather_name: student.grandfatherName || '',
                mother_name: student.motherName || '',
                gender: (student.gender as 'male' | 'female') || 'male',
                birth_year: student.birthYear || '',
                birth_date: student.birthDate || '',
                age: student.age ?? undefined,
                admission_year: student.admissionYear || '',
                applying_grade: student.applyingGrade || '',
                preferred_language: student.preferredLanguage || 'Dari',
                nationality: student.nationality || 'Afghan',
                previous_school: student.previousSchool || '',
                orig_province: student.origProvince || '',
                orig_district: student.origDistrict || '',
                orig_village: student.origVillage || '',
                curr_province: student.currProvince || '',
                curr_district: student.currDistrict || '',
                curr_village: student.currVillage || '',
                home_address: student.homeAddress || student.address?.street || '',
                guardian_name: student.guardianName || (student.guardians?.[0] ? `${student.guardians[0].firstName} ${student.guardians[0].lastName}`.trim() : '') || '',
                guardian_relation: student.guardianRelation || (student.guardians?.[0]?.relationship || '') || '',
                guardian_phone: student.guardianPhone || student.guardians?.[0]?.phone || '',
                guardian_tazkira: student.guardianTazkira || '',
                guardian_picture_path: student.guardianPicturePath || student.guardians?.[0]?.photo || '',
                zamin_name: student.zaminName || '',
                zamin_phone: student.zaminPhone || '',
                zamin_tazkira: student.zaminTazkira || '',
                zamin_address: student.zaminAddress || '',
                admission_fee_status: student.admissionFeeStatus || 'pending',
                student_status: student.status || 'active',
                is_orphan: student.isOrphan ?? false,
                disability_status: student.disabilityStatus || '',
                emergency_contact_name: student.emergencyContactName || student.healthInfo?.emergencyContact?.name || '',
                emergency_contact_phone: student.emergencyContactPhone || student.healthInfo?.emergencyContact?.phone || '',
                family_income: student.familyIncome || '',
                school_id: student.schoolId || null,
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
        // Duplicate check only for new students (not for updates)
        if (!isEdit) {
            try {
                const dupes = await duplicateCheck.mutateAsync({
                    full_name: values.full_name,
                    father_name: values.father_name,
                    tazkira_number: values.guardian_tazkira || null,
                    card_number: values.card_number || null,
                    admission_no: values.admission_no || null,
                });

                if (dupes.length > 0) {
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
        <style>{`
            @media (max-width: 639px) {
                [data-radix-dialog-content][data-state="open"] {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    transform: none !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    height: 100vh !important;
                    max-height: 100vh !important;
                    border-radius: 0 !important;
                }
            }
        `}</style>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-5xl max-h-[100vh] h-[100vh] sm:max-h-[95vh] sm:h-[95vh] w-full sm:w-[95vw] md:w-[90vw] lg:w-full p-0 gap-0 flex flex-col m-0 sm:m-4 rounded-none sm:rounded-lg"
                aria-describedby="student-form-description"
            >
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0">
                    <DialogTitle className="text-lg sm:text-xl">{isEdit ? t('students.editStudent') || 'Edit Student' : t('events.add') || 'Register Student'}</DialogTitle>
                    <DialogDescription id="student-form-description" className="text-sm">
                        {isEdit ? t('students.updateDescription') || 'Update registration and guardian details.' : t('students.addDescription') || 'Capture admission details with guardian and residency information.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Show usage limit warning when creating new students */}
                {!isEdit && (studentUsage.isWarning || !studentUsage.canCreate) && (
                    <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex-shrink-0">
                        <UsageLimitWarning resourceKey="students" compact />
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 px-4 sm:px-6">
                        <TabsList className="flex w-full gap-1 h-auto mb-3 sm:mb-4 flex-shrink-0 overflow-x-auto pb-1 scrollbar-hide">
                            <TabsTrigger value="admission" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">
                                {t('students.admissionInfo') || 'Admission'}
                            </TabsTrigger>
                            <TabsTrigger value="personal" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">
                                {t('students.personalInfo') || 'Personal'}
                            </TabsTrigger>
                            <TabsTrigger value="address" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">
                                {t('students.addressInfo') || 'Address'}
                            </TabsTrigger>
                            <TabsTrigger value="guardian" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">
                                {t('students.guardianInfo') || 'Guardian'}
                            </TabsTrigger>
                            <TabsTrigger value="additional" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">
                                {t('students.otherInfo') || 'Additional'}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pb-4 min-h-0">
                            {/* Admission Tab */}
                            <TabsContent value="admission" className="space-y-4 mt-0">
                                {/* School selection when multiple schools exist */}
                                {schools && schools.length > 1 && (
                                    <div className="space-y-2">
                                        <Label>{t('students.school') || 'School'}</Label>
                                        <Controller
                                            control={control}
                                            name="school_id"
                                            render={({ field }) => (
                                                <Select value={field.value || ''} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('events.selectSchool') || 'Select school'} />
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
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>
                                            {t('examReports.admissionNo') || 'Admission No'}
                                            <span className="text-destructive ml-1">*</span>
                                        </Label>
                                        <Input 
                                            placeholder="SH-2024-001" 
                                            {...register('admission_no')} 
                                            className={errors.admission_no ? 'border-destructive' : ''}
                                        />
                                        {errors.admission_no && (
                                            <p className="text-sm text-destructive mt-1">{errors.admission_no.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>{t('attendanceReports.cardNumber') || 'Card Number'}</Label>
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
                                </div>
                            </TabsContent>

                            {/* Personal Information Tab */}
                            <TabsContent value="personal" className="space-y-4 mt-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>
                                            {t('userManagement.fullName') || 'Full Name'}
                                            <span className="text-destructive ml-1">*</span>
                                        </Label>
                                        <StudentAutocompleteInput
                                            placeholder={t('userManagement.fullName') || 'Student full name'}
                                            suggestions={ac?.names || []}
                                            {...register('full_name')}
                                            className={errors.full_name ? 'border-destructive' : ''}
                                        />
                                        {errors.full_name && (
                                            <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>
                                            {t('examReports.fatherName') || 'Father Name'}
                                            <span className="text-destructive ml-1">*</span>
                                        </Label>
                                        <StudentAutocompleteInput
                                            placeholder={t('examReports.fatherName') || 'Father name'}
                                            suggestions={ac?.fatherNames || []}
                                            {...register('father_name')}
                                            className={errors.father_name ? 'border-destructive' : ''}
                                        />
                                        {errors.father_name && (
                                            <p className="text-sm text-destructive mt-1">{errors.father_name.message}</p>
                                        )}
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
                                        <Label>{t('studentReportCard.motherName') || 'Mother Name'}</Label>
                                        <Input placeholder={t('studentReportCard.motherName') || 'Mother name'} {...register('mother_name')} />
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
                                    <div className="sm:col-span-2">
                                        <Label>{t('students.previousSchool') || 'Previous School'}</Label>
                                        <Input placeholder={t('students.previousSchool') || 'Previous madrasa or school'} {...register('previous_school')} />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Address Information Tab */}
                            <TabsContent value="address" className="space-y-4 mt-0">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium mb-3">{t('students.originAddress') || 'Origin Address'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium mb-3">{t('students.currentAddress') || 'Current Address'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                        </div>
                                    </div>
                                    <div>
                                        <Label>{t('students.homeAddress') || 'Home Address'}</Label>
                                        <Textarea 
                                            placeholder={t('students.homeAddress') || 'Full address'} 
                                            {...register('home_address')}
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Guardian Information Tab */}
                            <TabsContent value="guardian" className="space-y-4 mt-0">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium mb-3">{t('students.guardianInfo') || 'Guardian Information'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                <Input placeholder={t('events.phone') || 'Phone'} {...register('guardian_phone')} />
                                            </div>
                                            <div>
                                                <Label>{t('students.guardianTazkira') || 'Guardian Tazkira'}</Label>
                                                <Input placeholder={t('students.guardianTazkira') || 'Tazkira'} {...register('guardian_tazkira')} />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Label>{t('students.guardianPicturePath') || 'Guardian Picture Path'}</Label>
                                                <Input placeholder={t('students.guardianPicturePath') || 'Storage path'} {...register('guardian_picture_path')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium mb-3">{t('students.guarantorInfo') || 'Guarantor (Zamin) Information'}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                <Input placeholder={t('events.phone') || 'Phone'} {...register('zamin_phone')} />
                                            </div>
                                            <div>
                                                <Label>{t('students.zaminTazkira') || 'Zamin Tazkira'}</Label>
                                                <Input placeholder={t('students.zaminTazkira') || 'Tazkira'} {...register('zamin_tazkira')} />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Label>{t('students.zaminAddress') || 'Zamin Address'}</Label>
                                                <Textarea 
                                                    placeholder={t('students.zaminAddress') || 'Guarantor address'} 
                                                    {...register('zamin_address')}
                                                    className="min-h-[80px]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Additional Information Tab */}
                            <TabsContent value="additional" className="space-y-4 mt-0">
                                <div className="space-y-4">
                                    <div>
                                        <Label>{t('students.studentPicture') || 'Student Picture'}</Label>
                                        <div className="mt-2">
                                            <StudentPictureUpload
                                                studentId={student?.id}
                                                organizationId={student?.organizationId || profile?.organization_id}
                                                schoolId={student?.schoolId || formValues.school_id || null}
                                                currentFileName={student?.picturePath || null}
                                                onFileSelected={setSelectedPictureFile}
                                                allowUploadWithoutStudent={!isEdit}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                            <Label>{t('students.status.label') || 'Student Status'}</Label>
                                            <Controller
                                                control={control}
                                                name="student_status"
                                                render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('students.status.label') || 'Status'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="applied">{t('students.applied') || 'Applied'}</SelectItem>
                                                            <SelectItem value="admitted">{t('students.admitted') || 'Admitted'}</SelectItem>
                                                            <SelectItem value="active">{t('events.active') || 'Active'}</SelectItem>
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
                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <Label>{t('students.familyIncome') || 'Family Income / Support Details'}</Label>
                                            <Textarea 
                                                placeholder={t('students.familyIncome') || 'Monthly income or donor support'} 
                                                {...register('family_income')}
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                    </div>
                                    {isEdit && (
                                        <div className="pt-4 border-t">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        if (student?.id) {
                                                            setIsHistoryDialogOpen(true);
                                                        }
                                                    }}
                                                    className="w-full"
                                                >
                                                    {t('students.educationalHistory') || 'Educational History'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        if (student?.id) {
                                                            setIsDocumentsDialogOpen(true);
                                                        }
                                                    }}
                                                    className="w-full"
                                                >
                                                    {t('students.studentDocuments') || 'Student Documents'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        if (student?.id) {
                                                            setIsDisciplineDialogOpen(true);
                                                        }
                                                    }}
                                                    className="w-full"
                                                >
                                                    {t('students.disciplineRecords') || 'Discipline Records'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>

                        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 border-t bg-background flex-shrink-0">
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <div className="flex gap-2 flex-1 order-2 sm:order-1">
                                    {activeTab !== 'admission' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const tabs = ['admission', 'personal', 'address', 'guardian', 'additional'];
                                                const currentIndex = tabs.indexOf(activeTab);
                                                if (currentIndex > 0) {
                                                    setActiveTab(tabs[currentIndex - 1]);
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial text-sm"
                                        >
                                            {t('events.previous') || 'Previous'}
                                        </Button>
                                    )}
                                    {activeTab !== 'additional' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const tabs = ['admission', 'personal', 'address', 'guardian', 'additional'];
                                                const currentIndex = tabs.indexOf(activeTab);
                                                if (currentIndex < tabs.length - 1) {
                                                    setActiveTab(tabs[currentIndex + 1]);
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial text-sm"
                                        >
                                            {t('events.next') || 'Next'}
                                        </Button>
                                    )}
                                </div>
                                <Button 
                                    type="submit" 
                                    className="w-full sm:w-auto sm:min-w-[150px] order-1 sm:order-2 text-sm"
                                    disabled={!isEdit && !studentUsage.canCreate}
                                >
                                    {isEdit ? t('events.save') || 'Update Student' : t('events.add') || 'Register Student'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </Tabs>
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
});

export default StudentFormDialog;


