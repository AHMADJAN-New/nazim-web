import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTimetable } from '@/hooks/useTimetables';
import type { DayName } from '@/lib/timetableSolver';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

export interface SaveEntryInput {
	class_academic_year_id: string;
	subject_id: string;
	teacher_id: string;
	schedule_slot_id: string;
	day_name: DayName;
	period_order: number;
}

interface SaveTimetableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entries: SaveEntryInput[];
	organizationId?: string | null;
	academicYearId?: string | null;
	schoolId?: string | null;
	defaultName?: string;
}

export function SaveTimetableDialog({
	open,
	onOpenChange,
	entries,
	organizationId,
	academicYearId,
	schoolId,
	defaultName,
}: SaveTimetableDialogProps) {
	const { t } = useLanguage();
	const { data: profile } = useProfile();
	const orgId = organizationId ?? profile?.organization_id ?? null;
	const { mutateAsync: createTimetable, isPending } = useCreateTimetable();
	const [name, setName] = useState(defaultName || '');
	const [description, setDescription] = useState('');

	useEffect(() => {
		if (open && defaultName) setName(defaultName);
	}, [open, defaultName]);

	const isDisabled = useMemo(() => {
		if (!name || name.trim().length === 0) return true;
		if (entries.length === 0) return true;
		if (isPending) return true;
		// Validate that all entries have required fields
		const hasInvalidEntries = entries.some(e => 
			!e.class_academic_year_id || 
			!e.subject_id || 
			!e.teacher_id || 
			!e.schedule_slot_id || 
			!e.day_name
		);
		return hasInvalidEntries;
	}, [name, entries.length, isPending, entries]);

	const handleSave = async () => {
		try {
			// Validate entries before saving
			const invalidEntries = entries.filter(e => 
				!e.class_academic_year_id || 
				!e.subject_id || 
				!e.teacher_id || 
				!e.schedule_slot_id || 
				!e.day_name
			);
			
			if (invalidEntries.length > 0) {
				console.error('Invalid entries found:', invalidEntries);
				toast.error(`Cannot save: ${invalidEntries.length} entry/entries have missing required fields.`);
				return;
			}

			console.log('Saving timetable:', {
				name: name.trim(),
				entryCount: entries.length,
				academicYearId,
				organizationId: orgId,
			});

			await createTimetable({
				name: name.trim(),
				description: description.trim() || null,
				timetable_type: 'teaching',
				organization_id: orgId,
				academic_year_id: academicYearId ?? null,
				school_id: schoolId ?? null,
				entries: entries.map((e) => ({
					class_academic_year_id: e.class_academic_year_id,
					subject_id: e.subject_id,
					teacher_id: e.teacher_id,
					schedule_slot_id: e.schedule_slot_id,
					day_name: e.day_name,
					period_order: e.period_order,
				})),
			});
			onOpenChange(false);
		} catch (error) {
			// Error is already handled by the mutation's onError
			console.error('Failed to save timetable:', error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t('timetable.save') || 'Save Timetable'}</DialogTitle>
					<DialogDescription>
						{t('timetable.saveDesc') || 'Provide a name and optional description for this timetable.'}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">{t('timetable.name') || 'Name'}</label>
						<Input value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">{t('timetable.description') || 'Description'}</label>
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('common.cancel') || 'Cancel'}
					</Button>
					<Button onClick={handleSave} disabled={isDisabled}>
						{t('common.save') || 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


