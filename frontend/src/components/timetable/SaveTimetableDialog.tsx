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
				toast.error((t('timetable.saveValidationError') || 'Cannot save: {count} entry/entries have missing required fields.').replace('{count}', invalidEntries.length.toString()));
				return;
			}

			if (import.meta.env.DEV) {
				console.log('Saving timetable with entries:', data.entries.length);
			}
			
			await createTimetable({
				name: data.name.trim(),
				description: data.description?.trim() || null,
				timetableType: data.timetable_type,
				organizationId: data.organization_id,
				academicYearId: data.academic_year_id,
				schoolId: data.school_id,
				entries: data.entries.map((e) => ({
					classAcademicYearId: e.class_academic_year_id,
					subjectId: e.subject_id,
					teacherId: e.teacher_id,
					scheduleSlotId: e.schedule_slot_id,
					dayName: e.day_name,
					periodOrder: e.period_order,
				})),
			});
			
			// Close dialog on success (success toast is shown by the hook)
			onOpenChange(false);
		} catch (error: any) {
			// Log detailed error for debugging
			if (import.meta.env.DEV) {
				console.error('Failed to save timetable:', error);
				console.error('Error details:', {
					message: error?.message,
					response: error?.response,
					stack: error?.stack
				});
			}
			
			// Extract error message from various possible locations
			const errorMessage = 
				error?.response?.data?.message || 
				error?.response?.data?.error || 
				error?.message || 
				'Unknown error occurred';
			
			toast.error((t('timetable.saveFailed') || 'Failed to save timetable: {error}').replace('{error}', errorMessage));
			// Don't close dialog on error so user can retry
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


