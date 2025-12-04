import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpsertTeacherPreference, useTeacherPreferences } from '@/hooks/useTimetables';
import { useScheduleSlots } from '@/hooks/useScheduleSlots';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';
import { teacherPreferenceSchema, type TeacherPreferenceFormData } from '@/lib/validations';

interface TeacherPreferencesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId?: string;
	academicYearId?: string | null;
}

export function TeacherPreferencesDialog({ open, onOpenChange, organizationId, academicYearId }: TeacherPreferencesDialogProps) {
	const { t } = useLanguage();
	const { data: profile } = useProfile();
	const orgId = organizationId || profile?.organization_id || undefined;

	const { data: staff } = useStaff(orgId);
	const { data: slots } = useScheduleSlots(orgId, academicYearId || undefined);
	const { mutateAsync: upsertPref, isPending } = useUpsertTeacherPreference();

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm<TeacherPreferenceFormData>({
		resolver: zodResolver(teacherPreferenceSchema),
		defaultValues: {
			teacher_id: '',
			schedule_slot_ids: [],
			organization_id: orgId || null,
			academic_year_id: academicYearId || null,
			is_active: true,
		},
	});

	const selectedSlotIds = watch('schedule_slot_ids');
	const teacherId = watch('teacher_id');

	// Load current preference for selected teacher
	const { data: prefs } = useTeacherPreferences(orgId, teacherId, academicYearId || undefined);
	const existing = prefs && prefs.length > 0 ? prefs[0] : null;

	useEffect(() => {
		if (existing) {
			reset({
				teacher_id: existing.teacher_id,
				schedule_slot_ids: existing.schedule_slot_ids || [],
				organization_id: orgId || null,
				academic_year_id: academicYearId || null,
				is_active: true,
			});
		} else if (teacherId) {
			setValue('schedule_slot_ids', []);
		}
	}, [existing?.id, teacherId, orgId, academicYearId, reset, setValue]);

	const teacherOptions = useMemo(() => {
		return (staff || [])
			.filter((s) => s.status === 'active')
			.map((s) => ({ 
				id: s.id, 
				name: s.fullName || s.employeeId || 'Unknown' 
			}));
	}, [staff]);

	const handleToggleSlot = (slotId: string, checked: boolean | string) => {
		const isChecked = Boolean(checked);
		const currentIds = selectedSlotIds || [];
		const newIds = isChecked
			? [...currentIds, slotId]
			: currentIds.filter((id) => id !== slotId);
		setValue('schedule_slot_ids', newIds);
	};

	const handleSave = async (data: TeacherPreferenceFormData) => {
		await upsertPref({
			teacher_id: data.teacher_id,
			schedule_slot_ids: data.schedule_slot_ids,
			organization_id: data.organization_id,
			academic_year_id: data.academic_year_id,
			is_active: data.is_active,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{t('timetable.teacherPreferences') || 'Teacher Preferences'}</DialogTitle>
					<DialogDescription>
						{t('timetable.teacherPreferencesDesc') || 'Mark slots the selected teacher cannot teach (blocked periods).'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(handleSave)} className="space-y-4">
					<div className="grid grid-cols-3 gap-4 items-center">
						<Label htmlFor="teacher_id">{t('timetable.selectTeacher') || 'Select Teacher'}</Label>
						<div className="col-span-2">
							<Controller
								control={control}
								name="teacher_id"
								render={({ field }) => (
									<Select value={field.value || ''} onValueChange={field.onChange}>
										<SelectTrigger id="teacher_id">
											<SelectValue placeholder={t('timetable.selectTeacher') || 'Select Teacher'} />
										</SelectTrigger>
										<SelectContent>
											{teacherOptions.map((tch) => (
												<SelectItem key={tch.id} value={tch.id}>
													{tch.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.teacher_id && (
								<p className="text-sm text-destructive mt-1">{errors.teacher_id.message}</p>
							)}
						</div>
					</div>
					<div>
						<Label className="mb-2 block">{t('timetable.periods') || 'Periods'}</Label>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
							{(slots || []).map((slot) => {
								const checked = (selectedSlotIds || []).includes(slot.id);
								return (
									<label key={slot.id} className="flex items-center gap-2 border rounded-md p-2">
										<Checkbox checked={checked} onCheckedChange={(c) => handleToggleSlot(slot.id, c)} />
										<div className="text-sm">
											<div className="font-medium">{slot.name}</div>
											<div className="text-muted-foreground">{slot.start_time} - {slot.end_time}</div>
										</div>
									</label>
								);
							})}
						</div>
						{errors.schedule_slot_ids && (
							<p className="text-sm text-destructive mt-1">{errors.schedule_slot_ids.message}</p>
						)}
					</div>
					<DialogFooter>
						<Button 
							type="button"
							variant="outline" 
							onClick={() => onOpenChange(false)}
						>
							{t('common.cancel') || 'Cancel'}
						</Button>
						<Button type="submit" disabled={!teacherId || isPending}>
							{t('common.save') || 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}


