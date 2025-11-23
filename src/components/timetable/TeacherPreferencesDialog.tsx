import { useEffect, useMemo, useState } from 'react';
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
	const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
	const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

	// Load current preference for selected teacher
	const { data: prefs } = useTeacherPreferences(orgId, teacherId, academicYearId || undefined);
	const existing = prefs && prefs.length > 0 ? prefs[0] : null;

	useEffect(() => {
		if (existing) {
			setSelectedSlotIds(existing.schedule_slot_ids || []);
		} else {
			setSelectedSlotIds([]);
		}
	}, [existing?.id]);

	const teacherOptions = useMemo(() => {
		return (staff || [])
			.filter((s) => s.is_active !== false)
			.map((s) => ({ id: s.id, name: s.full_name || s.employee_id || 'Unknown' }));
	}, [staff]);

	const handleToggleSlot = (slotId: string, checked: boolean | string) => {
		const isChecked = Boolean(checked);
		setSelectedSlotIds((prev) => {
			const set = new Set(prev);
			if (isChecked) set.add(slotId);
			else set.delete(slotId);
			return Array.from(set);
		});
	};

	const handleSave = async () => {
		if (!teacherId) return;
		await upsertPref({
			teacher_id: teacherId,
			schedule_slot_ids: selectedSlotIds,
			organization_id: orgId || null,
			academic_year_id: academicYearId || null,
			is_active: true,
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
				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-4 items-center">
						<Label htmlFor="teacher">{t('timetable.selectTeacher') || 'Select Teacher'}</Label>
						<div className="col-span-2">
							<Select value={teacherId} onValueChange={setTeacherId}>
								<SelectTrigger id="teacher">
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
						</div>
					</div>
					<div>
						<Label className="mb-2 block">{t('timetable.periods') || 'Periods'}</Label>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
							{(slots || []).map((slot) => {
								const checked = selectedSlotIds.includes(slot.id);
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
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('common.cancel') || 'Cancel'}
					</Button>
					<Button onClick={handleSave} disabled={!teacherId || isPending}>
						{t('common.save') || 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


