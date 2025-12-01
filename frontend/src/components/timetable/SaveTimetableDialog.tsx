import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTimetable } from '@/hooks/useTimetables';
import type { DayName } from '@/lib/timetableSolver';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { saveTimetableSchema, type SaveTimetableFormData } from '@/lib/validations';

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

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<SaveTimetableFormData>({
		resolver: zodResolver(saveTimetableSchema),
		defaultValues: {
			name: defaultName || '',
			description: '',
			timetable_type: 'teaching',
			organization_id: orgId,
			academic_year_id: academicYearId ?? null,
			school_id: schoolId ?? null,
			entries: entries,
		},
	});

	useEffect(() => {
		if (open) {
			// Validate entries before setting
			const validEntries = entries.filter(e => 
				e.class_academic_year_id && 
				e.subject_id && 
				e.teacher_id && 
				e.schedule_slot_id && 
				e.day_name
			);
			
			reset({
				name: defaultName || '',
				description: '',
				timetable_type: 'teaching',
				organization_id: orgId,
				academic_year_id: academicYearId ?? null,
				school_id: schoolId ?? null,
				entries: validEntries,
			});
		}
	}, [open, defaultName, orgId, academicYearId, schoolId, entries, reset]);

	const handleSave = async (data: SaveTimetableFormData) => {
		try {
			// Validate entries one more time
			const invalidEntries = data.entries.filter(e => 
				!e.class_academic_year_id || 
				!e.subject_id || 
				!e.teacher_id || 
				!e.schedule_slot_id || 
				!e.day_name
			);
			
			if (invalidEntries.length > 0) {
				toast.error(`Cannot save: ${invalidEntries.length} entry/entries have missing required fields.`);
				return;
			}

			await createTimetable({
				name: data.name.trim(),
				description: data.description?.trim() || null,
				timetable_type: data.timetable_type,
				organization_id: data.organization_id,
				academic_year_id: data.academic_year_id,
				school_id: data.school_id,
				entries: data.entries.map((e) => ({
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
				<form onSubmit={handleSubmit(handleSave)} className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">{t('timetable.name') || 'Name'}</label>
						<Input {...register('name')} />
						{errors.name && (
							<p className="text-sm text-destructive mt-1">{errors.name.message}</p>
						)}
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">{t('timetable.description') || 'Description'}</label>
						<Textarea {...register('description')} rows={3} />
						{errors.description && (
							<p className="text-sm text-destructive mt-1">{errors.description.message}</p>
						)}
					</div>
					{errors.entries && (
						<p className="text-sm text-destructive">{errors.entries.message}</p>
					)}
					<DialogFooter>
						<Button 
							type="button"
							variant="outline" 
							onClick={() => onOpenChange(false)}
						>
							{t('common.cancel') || 'Cancel'}
						</Button>
						<Button type="submit" disabled={isPending}>
							{t('common.save') || 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}


