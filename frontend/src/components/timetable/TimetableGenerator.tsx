import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
	useDraggable,
	useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LoadTimetableDialog } from './LoadTimetableDialog';
import { SaveTimetableDialog } from './SaveTimetableDialog';
import type { SaveEntryInput } from './SaveTimetableDialog';
import { TeacherPreferencesDialog } from './TeacherPreferencesDialog';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useScheduleSlots } from '@/hooks/useScheduleSlots';
import { useStaff } from '@/hooks/useStaff';
import { useTeacherSubjectAssignments } from '@/hooks/useTeacherSubjectAssignments';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useTeacherPreferences, useTimetable } from '@/hooks/useTimetables';
import { TimetableSolver, type Assignment, type DayName, type ScheduleSlot } from '@/lib/timetableSolver';


import { useSchools } from '@/hooks/useSchools';

// Draggable cell component
function DraggableCell({
	id,
	children,
	className,
}: {
	id: string;
	children: React.ReactNode;
	className?: string;
}) {
	const { t } = useLanguage();
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id,
	});

	const style = {
		transform: CSS.Translate.toString(transform),
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className={className}>
			<div className="flex items-center gap-1 group">
				<button
					{...attributes}
					{...listeners}
					className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
					aria-label={t('timetable.dragToMove') || 'Drag to move'}
				>
					<GripVertical className="h-4 w-4 text-muted-foreground" />
				</button>
				{children}
			</div>
		</div>
	);
}

// Droppable cell component
function DroppableCell({
	id,
	children,
	className,
	isOver,
}: {
	id: string;
	children: React.ReactNode;
	className?: string;
	isOver?: boolean;
}) {
	const { setNodeRef, isOver: isOverDrop } = useDroppable({
		id,
	});

	return (
		<td
			ref={setNodeRef}
			className={`${className} ${isOver || isOverDrop ? 'bg-primary/10 ring-2 ring-primary' : ''}`}
		>
			{children}
		</td>
	);
}

export function TimetableGenerator() {
	const { t } = useLanguage();
	const { data: profile } = useProfile();
	const organizationId = profile?.organization_id || undefined;

	// Academic year selection
	const { data: academicYears } = useAcademicYears(organizationId);
	const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>(undefined);

	// Set default to current academic year
	useEffect(() => {
		if (currentAcademicYear && !selectedAcademicYearId) {
			setSelectedAcademicYearId(currentAcademicYear.id);
		}
	}, [currentAcademicYear, selectedAcademicYearId]);

	// Data sources - filter by academic year
	const { data: scheduleSlots } = useScheduleSlots(organizationId, selectedAcademicYearId);
	const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, organizationId);
	const { data: staff } = useStaff(organizationId);
	const { data: assignmentsRaw } = useTeacherSubjectAssignments(organizationId, undefined, selectedAcademicYearId);
	const { data: schools } = useSchools(organizationId);
	const school = schools && schools.length > 0 ? schools[0] : null;

	// Selection states
	const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
	const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
	const [selectedDays, setSelectedDays] = useState<DayName[]>(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
	const [allYear, setAllYear] = useState<boolean>(false);
	const [showOnlyClassesWithAssignments, setShowOnlyClassesWithAssignments] = useState<boolean>(false);

	// Preferences dialog
	const [prefOpen, setPrefOpen] = useState(false);
	const { data: teacherPrefsAll } = useTeacherPreferences(organizationId, undefined, selectedAcademicYearId);

	// Derived lists
	const availableSlots: ScheduleSlot[] = useMemo(() => {
		const map = new Map<string, ScheduleSlot>();
		(scheduleSlots || []).forEach((s) => {
			if (s && s.id) {
				map.set(s.id, { 
					id: s.id, 
					name: s.name || '', 
					start_time: s.startTime || '', 
					end_time: s.endTime || '' 
				});
			}
		});
		return Array.from(map.values()).sort((a, b) => {
			if (!a || !b) return 0;
			const aTime = (a.start_time || '').toString();
			const bTime = (b.start_time || '').toString();
			return aTime.localeCompare(bTime);
		});
	}, [scheduleSlots]);

	const filteredAssignments = useMemo(() => {
		if (!assignmentsRaw || selectedClassIds.length === 0) return [];
		return assignmentsRaw.filter((a) => selectedClassIds.includes(a.class_academic_year_id));
	}, [assignmentsRaw, selectedClassIds]);

	// Get classes that have teacher-subject assignments
	const classesWithAssignments = useMemo(() => {
		if (!assignmentsRaw || !classAcademicYears) return new Set<string>();
		const classIdsWithAssignments = new Set<string>();
		assignmentsRaw.forEach((a) => {
			classIdsWithAssignments.add(a.class_academic_year_id);
		});
		return classIdsWithAssignments;
	}, [assignmentsRaw, classAcademicYears]);

	// Filter classes based on checkbox
	const filteredClasses = useMemo(() => {
		if (!classAcademicYears) return [];
		if (!showOnlyClassesWithAssignments) return classAcademicYears;
		// Only show classes that have assignments
		return classAcademicYears.filter((c) => classesWithAssignments.has(c.id));
	}, [classAcademicYears, showOnlyClassesWithAssignments, classesWithAssignments]);

	const teacherMap = useMemo(() => {
		const m = new Map<string, string>();
		(staff || []).forEach((s) => {
			// Use camelCase properties from domain model
			const displayName = s.fullName || s.employeeId || '';
			m.set(s.id, displayName);
		});
		return m;
	}, [staff]);

	const classMap = useMemo(() => {
		const m = new Map<string, string>();
		(classAcademicYears || []).forEach((c) => m.set(c.id, c.class?.name || c.id));
		return m;
	}, [classAcademicYears]);

	const subjectMap = useMemo(() => {
		const m = new Map<string, string>();
		(filteredAssignments || []).forEach((a) => {
			if (a.subject?.name) m.set(a.subject_id, a.subject.name);
		});
		return m;
	}, [filteredAssignments]);

	const preferences = useMemo(() => {
		return (teacherPrefsAll || []).map((p) => ({
			teacherId: p.teacherId,
			blockedSlotIds: p.scheduleSlotIds || [],
		}));
	}, [teacherPrefsAll]);

	// Solution state
	const [entries, setEntries] = useState<
		Array<{
			class_id: string;
			class_name: string;
			subject_name: string;
			teacher_name: string;
			teacher_id: string;
			slot_id: string;
			day: DayName;
			period_order: number;
		}>
	>([]);
	const [unscheduledCount, setUnscheduledCount] = useState<number>(0);
	// Entries to save (with subject_id etc.)
	const [saveEntries, setSaveEntries] = useState<SaveEntryInput[]>([]);
	// Save/Load dialogs
	const [saveOpen, setSaveOpen] = useState(false);
	const [loadOpen, setLoadOpen] = useState(false);
	const [loadedTimetableId, setLoadedTimetableId] = useState<string | null>(null);
	const { data: loadedTimetable } = useTimetable(loadedTimetableId || undefined);

	// Drag and drop state
	const [activeId, setActiveId] = useState<string | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	// Handlers
	const toggleClass = (id: string, checked: boolean | string) => {
		const isChecked = Boolean(checked);
		setSelectedClassIds((prev) => {
			const set = new Set(prev);
			if (isChecked) set.add(id);
			else set.delete(id);
			return Array.from(set);
		});
	};

	const toggleSlot = (id: string, checked: boolean | string) => {
		const isChecked = Boolean(checked);
		setSelectedSlotIds((prev) => {
			const set = new Set(prev);
			if (isChecked) set.add(id);
			else set.delete(id);
			return Array.from(set);
		});
	};

	const toggleDay = (day: DayName, checked: boolean | string) => {
		const isChecked = Boolean(checked);
		setSelectedDays((prev) => {
			const set = new Set(prev);
			if (isChecked) set.add(day);
			else set.delete(day);
			return Array.from(set) as DayName[];
		});
	};

	const generate = () => {
		try {
		// Validation
		if (!selectedAcademicYearId) {
			toast.error(t('timetable.selectAcademicYearError'));
			return;
		}

		if (selectedClassIds.length === 0) {
			toast.error(t('timetable.selectAtLeastOneClass'));
			return;
		}

		if (selectedSlotIds.length === 0) {
			toast.error(t('timetable.selectAtLeastOnePeriod') || 'Please select at least one period');
			return;
		}

		if (!allYear && selectedDays.length === 0) {
			toast.error(t('timetable.selectAtLeastOneDay') || 'Please select at least one day');
			return;
		}

		if (filteredAssignments.length === 0) {
			toast.error(t('timetable.noAssignmentsFound') || 'No teacher-subject assignments found for the selected classes. Please assign teachers to subjects first.');
			return;
		}

			const chosenSlots = availableSlots.filter((s) => 
				selectedSlotIds.includes(s.id) && 
				s.start_time && 
				s.end_time &&
				s.start_time.trim() !== '' &&
				s.end_time.trim() !== ''
			);

		if (chosenSlots.length === 0) {
			toast.error(t('timetable.noValidSlotsFound') || 'No valid schedule slots found. Please ensure all selected slots have start and end times configured.');
			return;
		}

		// Build solver inputs
		const assignments: Assignment[] = filteredAssignments.map((a) => ({
			teacherId: a.teacher_id,
			classAcademicYearId: a.class_academic_year_id,
			subjectId: a.subject_id,
			teacherName: teacherMap.get(a.teacher_id) || '',
			className: classMap.get(a.class_academic_year_id) || '',
			subjectName: a.subject?.name || '',
		}));

		if (assignments.length === 0) {
			toast.error(t('timetable.noAssignmentsToSchedule') || 'No assignments to schedule');
			return;
		}

			// Compute per-class capacity (handle overbooked classes)
			const perClassCount: Record<string, number> = {};
			for (const a of assignments) {
				perClassCount[a.classAcademicYearId] = (perClassCount[a.classAcademicYearId] || 0) + 1;
			}
			const capacity: Record<string, number> = {};
			const perDay = allYear ? 1 : selectedDays.length;
			const perClassSlots = chosenSlots.length * perDay;
			for (const [classId, count] of Object.entries(perClassCount)) {
				capacity[classId] = count > perClassSlots ? 2 : 1;
			}

			toast.info(t('timetable.generatingTimetable') || 'Generating timetable... This may take a few seconds.');

			const solver = new TimetableSolver(
				assignments,
				chosenSlots,
				preferences,
				{
					allYear,
					days: allYear ? (['all_year'] as DayName[]) : selectedDays,
					classMaxConcurrentPerSlot: capacity,
					timeLimitMs: 8000,
				}
			);
			const result = solver.solve();

			const entryRows = result.entries.map((e) => ({
				class_id: e.class_academic_year_id,
				class_name: classMap.get(e.class_academic_year_id) || '',
				subject_name: subjectMap.get(e.subject_id) || '',
				teacher_name: teacherMap.get(e.teacher_id) || '',
				teacher_id: e.teacher_id,
				slot_id: e.schedule_slot_id,
				day: e.day_name,
				period_order: e.period_order,
			}));
			setEntries(entryRows);

			// Prepare rows for saving (aligned by index with entryRows)
			const saveRows: SaveEntryInput[] = result.entries.map((e) => ({
				class_academic_year_id: e.class_academic_year_id,
				subject_id: e.subject_id,
				teacher_id: e.teacher_id,
				schedule_slot_id: e.schedule_slot_id,
				day_name: e.day_name,
				period_order: e.period_order,
			}));
			setSaveEntries(saveRows);
			setUnscheduledCount(result.unscheduled.length);

		if (result.unscheduled.length > 0) {
			toast.warning((t('timetable.generatedWithUnscheduled') || 'Timetable generated, but {count} assignment(s) could not be scheduled.').replace('{count}', result.unscheduled.length.toString()));
		} else {
			toast.success((t('timetable.generatedSuccessfully') || 'Timetable generated successfully with {count} scheduled entries.').replace('{count}', entryRows.length.toString()));
		}
	} catch (error) {
		if (import.meta.env.DEV) {
			console.error('Error generating timetable:', error);
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		toast.error((t('timetable.generateFailed') || 'Failed to generate timetable: {error}').replace('{error}', errorMessage));
	}
	};

	// Display helpers
	const dayList: DayName[] = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

	const teacherIdsInScope = useMemo(() => {
		const set = new Set<string>();
		entries.forEach((e) => set.add(e.teacher_id));
		return Array.from(set);
	}, [entries]);

	const classesInScope = useMemo(() => {
		const set = new Set<string>();
		entries.forEach((e) => set.add(e.class_id));
		return Array.from(set);
	}, [entries]);

	const headerSlots = useMemo(() => {
		// If we have entries but no selected slots, use slots from entries
		if (entries.length > 0 && selectedSlotIds.length === 0) {
			const entrySlotIds = new Set(entries.map(e => e.slot_id));
		return availableSlots
			.filter((s) => s && s.id && entrySlotIds.has(s.id))
			.sort((a, b) => {
				if (!a || !b) return 0;
				const aTime = (a.start_time || '').toString();
				const bTime = (b.start_time || '').toString();
				return aTime.localeCompare(bTime);
			});
	}
	return availableSlots
		.filter((s) => s && s.id && selectedSlotIds.includes(s.id))
		.sort((a, b) => {
			if (!a || !b) return 0;
			const aTime = (a.start_time || '').toString();
			const bTime = (b.start_time || '').toString();
			return aTime.localeCompare(bTime);
		});
	}, [availableSlots, selectedSlotIds, entries]);

	// Check if moving an entry would cause conflicts (exclude the moving entry by index)
	const canMoveEntry = (entryIndex: number, newSlotId: string, newDay: DayName) => {
		const moving = entries[entryIndex];
		if (!moving) return false;
		// Teacher cannot be double-booked in the same slot/day
		const teacherConflict = entries.some((e, i) => i !== entryIndex && e.teacher_id === moving.teacher_id && e.slot_id === newSlotId && e.day === newDay);
		// Class cannot be double-booked in the same slot/day
		const classConflict = entries.some((e, i) => i !== entryIndex && e.class_id === moving.class_id && e.slot_id === newSlotId && e.day === newDay);
		return !teacherConflict && !classConflict;
	};

	// Drag handlers
	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// Parse IDs: format is "entry-{index}" or "cell-{teacherId|classId}-{day}-{slotId}"
		const entryMatch = activeId.match(/^entry-(\d+)$/);
		if (!entryMatch) return;

		const entryIndex = parseInt(entryMatch[1], 10);
		const entry = entries[entryIndex];
		if (!entry) return;

		// Parse target cell: "cell-{teacherId|classId}-{day}-{slotId}"
		// Since UUIDs contain dashes, we need to split more carefully
		// Format: cell-{uuid}-{day}-{uuid}
		// We know the day is one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday, all_year
		const dayNames: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'all_year'];
		let newDay: DayName | null = null;
		let newSlotId: string | null = null;
		
		// Find the day in the string (look for the pattern -{day}-)
		for (const day of dayNames) {
			const dayPattern = `-${day}-`;
			const dayIndex = overId.indexOf(dayPattern);
			if (dayIndex !== -1) {
				newDay = day;
				// Extract slotId (everything after the day pattern)
				newSlotId = overId.substring(dayIndex + dayPattern.length);
				// Validate that slotId looks like a UUID (contains dashes and is reasonable length)
				if (newSlotId && newSlotId.length >= 36 && newSlotId.includes('-')) {
					break;
				} else {
					console.warn('Invalid slotId extracted:', newSlotId);
					newDay = null;
					newSlotId = null;
				}
			}
		}
		
		if (!newDay || !newSlotId) {
			if (import.meta.env.DEV) {
				console.error('Failed to parse cell ID:', overId);
			}
			toast.error(t('timetable.parseDropTargetError') || 'Failed to parse drop target. Please try again.');
			return;
		}
		
		const newDayTyped = newDay;

		// Don't move if it's the same position
		if (entry.slot_id === newSlotId && entry.day === newDayTyped) {
			return;
		}

		// Check if the move is valid (no conflicts)
		if (!canMoveEntry(entryIndex, newSlotId, newDayTyped)) {
			toast.error(t('timetable.moveConflictError') || 'Cannot move: This would create a conflict with another assignment');
			return;
		}

		// Update the entry - create completely new array and object to ensure React detects the change
		setEntries((prev) => {
			return prev.map((e, i) => {
				if (i === entryIndex) {
					// Create new object for the moved entry
					return {
						...e,
						slot_id: newSlotId,
						day: newDayTyped,
					};
				}
				return e; // Keep other entries as-is
			});
		});
		// Update the save entries (keep aligned by index)
		setSaveEntries((prev) => {
			if (!prev || entryIndex < 0 || entryIndex >= prev.length) return prev;
			return prev.map((e, i) => {
				if (i === entryIndex) {
					// Create new object for the moved entry
					return {
						...e,
						schedule_slot_id: newSlotId,
						day_name: newDayTyped,
					};
				}
				return e; // Keep other entries as-is
			});
		});

		toast.success(t('timetable.entryMovedSuccessfully') || 'Timetable entry moved successfully');
	};

	// Print function (export is now handled by ReportExportButtons)

	const handlePrint = () => {
		if (entries.length === 0) {
			toast.error(t('timetable.noTimetableToPrint') || 'No timetable to print. Please generate a timetable first.');
			return;
		}

		// Add print styles to the current page and trigger print
		const styleId = 'timetable-print-styles';
		let style = document.getElementById(styleId) as HTMLStyleElement;
		
		if (!style) {
			style = document.createElement('style');
			style.id = styleId;
			document.head.appendChild(style);
		}
		
		style.textContent = `
			@media print {
				/* Hide everything on the page */
				body * {
					visibility: hidden;
				}
				/* Show only the timetable section and all its contents */
				.print-timetable-section,
				.print-timetable-section * {
					visibility: visible;
				}
				/* Position the timetable section at the top */
				.print-timetable-section {
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					margin: 0;
					padding: 20px;
				}
				/* Hide buttons and action controls */
				.print-timetable-section button,
				.print-timetable-section [class*="CardHeader"] > div.flex {
					display: none !important;
					visibility: hidden !important;
				}
				/* Ensure tables are visible and properly formatted */
				.print-timetable-section table {
					display: table !important;
					width: 100% !important;
					border-collapse: collapse !important;
					margin: 10px 0 !important;
				}
				.print-timetable-section thead {
					display: table-header-group !important;
				}
				.print-timetable-section tbody {
					display: table-row-group !important;
				}
				.print-timetable-section tr {
					display: table-row !important;
					page-break-inside: avoid !important;
				}
				.print-timetable-section th,
				.print-timetable-section td {
					display: table-cell !important;
					border: 1px solid #000 !important;
					padding: 6px !important;
					font-size: 10px !important;
				}
				/* Page settings */
				@page {
					size: A3 landscape;
					margin: 1cm;
				}
			}
		`;
		
		// Trigger print dialog
		window.print();
	};

	// When a saved timetable is loaded, map it into current view
	useEffect(() => {
		if (!loadedTimetable?.timetable || !loadedTimetable?.entries) return;
		const tt = loadedTimetable;
		
		// Set the academic year if available (this will trigger schedule slots to load)
		if (tt.timetable.academicYearId && tt.timetable.academicYearId !== selectedAcademicYearId) {
			setSelectedAcademicYearId(tt.timetable.academicYearId);
			// Wait for slots to load before setting selected slots
			// This will be handled in the next effect run
			return;
		}
		
		// Extract unique slot IDs and days from loaded entries
		const uniqueSlotIds = new Set<string>();
		const uniqueDays = new Set<DayName>();
		let hasAllYear = false;
		
		(tt.entries || []).forEach((e) => {
			if (e.scheduleSlotId) uniqueSlotIds.add(e.scheduleSlotId);
			if (e.dayName) {
				if (e.dayName === 'all_year') {
					hasAllYear = true;
				} else {
					uniqueDays.add(e.dayName);
				}
			}
		});
		
		// Set selected slots from loaded timetable entries
		// Always set them, even if they don't match current academic year slots
		// The headerSlots memo will handle showing them
		if (uniqueSlotIds.size > 0) {
			setSelectedSlotIds(Array.from(uniqueSlotIds));
		}
		
		// Set days
		if (hasAllYear) {
			setAllYear(true);
			setSelectedDays([]);
		} else if (uniqueDays.size > 0) {
			setAllYear(false);
			setSelectedDays(Array.from(uniqueDays));
		}
		
		// Map loaded entries to display rows
		// Use teacher data from backend API response (fullName or employeeId)
		const entryRows = (tt.entries || []).map((e) => ({
			class_id: e.classAcademicYearId,
			class_name: e.classAcademicYear?.class?.name || classMap.get(e.classAcademicYearId) || '',
			subject_name: e.subject?.name || '',
			teacher_name: e.teacher?.fullName || e.teacher?.employeeId || teacherMap.get(e.teacherId) || '',
			teacher_id: e.teacherId,
			slot_id: e.scheduleSlotId,
			day: e.dayName,
			period_order: e.periodOrder,
		}));
		setEntries(entryRows);
		
		// Prepare save entries aligned by index
		const saveRows: SaveEntryInput[] = (tt.entries || []).map((e) => ({
			class_academic_year_id: e.classAcademicYearId,
			subject_id: e.subjectId,
			teacher_id: e.teacherId,
			schedule_slot_id: e.scheduleSlotId,
			day_name: e.dayName,
			period_order: e.periodOrder,
		}));
		setSaveEntries(saveRows);
		setUnscheduledCount(0);
		toast.success(t('timetable.loadedSuccessfully') || 'Timetable loaded successfully');
	}, [loadedTimetable?.timetable?.id, classMap, teacherMap, selectedAcademicYearId, scheduleSlots]);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t('timetable.title') || 'Timetable Generation'}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Academic Year Selector */}
					<div className="space-y-2">
						<Label className="font-semibold">{t('timetable.academicYearLabel') || 'Academic Year'} *</Label>
						<Select 
							value={selectedAcademicYearId || ''} 
							onValueChange={(value) => {
								setSelectedAcademicYearId(value);
								// Clear selected classes when academic year changes
								setSelectedClassIds([]);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t('timetable.selectAcademicYear') || 'Select Academic Year'} />
							</SelectTrigger>
							<SelectContent>
								{academicYears?.map((year) => (
									<SelectItem key={year.id} value={year.id}>
										{year.name} {year.isCurrent ? `(${t('timetable.current') || 'Current'})` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{!selectedAcademicYearId && (
							<p className="text-sm text-muted-foreground">{t('timetable.selectAcademicYearHint') || 'Please select an academic year to view classes'}</p>
						)}
					</div>

					{selectedAcademicYearId && (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Classes */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label className="font-semibold">{t('timetable.selectClasses') || 'Select Classes'}</Label>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox 
											checked={showOnlyClassesWithAssignments} 
											onCheckedChange={(v) => {
												setShowOnlyClassesWithAssignments(Boolean(v));
												// Clear selected classes when filter changes
												setSelectedClassIds([]);
											}} 
										/>
										<span className="text-xs">{t('timetable.showOnlyClassesWithAssignments') || 'Show only classes with assignments'}</span>
									</label>
								</div>
								<div className="border rounded-md p-3 h-64 overflow-auto space-y-2">
									{filteredClasses && filteredClasses.length > 0 ? (
										filteredClasses.map((c) => (
											<label key={c.id} className="flex gap-2 items-center">
												<Checkbox checked={selectedClassIds.includes(c.id)} onCheckedChange={(v) => toggleClass(c.id, v)} />
												<span>{c.class?.name || c.id}{c.sectionName ? ` - ${c.sectionName}` : ''}</span>
											</label>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											{showOnlyClassesWithAssignments 
												? (t('timetable.noClassesWithAssignments') || 'No classes with teacher-subject assignments found for this academic year')
												: (t('timetable.noClassesFound') || 'No classes found for this academic year')}
										</p>
									)}
								</div>
							</div>

						{/* Days */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="font-semibold">{t('timetable.selectDays') || 'Select Days'}</Label>
								<label className="flex items-center gap-2">
									<Checkbox checked={allYear} onCheckedChange={(v) => setAllYear(Boolean(v))} />
									<span>{t('timetable.allYear') || 'All Year'}</span>
								</label>
							</div>
							<div className={`border rounded-md p-3 ${allYear ? 'opacity-50 pointer-events-none' : ''}`}>
								<div className="grid grid-cols-2 gap-2">
									{dayList.map((d) => (
										<label key={d} className="flex items-center gap-2">
											<Checkbox checked={selectedDays.includes(d)} onCheckedChange={(v) => toggleDay(d, v)} />
											<span className="capitalize">{t(`timetable.days.${d}`) || d}</span>
										</label>
									))}
								</div>
							</div>
						</div>

						{/* Periods */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="font-semibold">{t('timetable.selectPeriods') || 'Select Periods'}</Label>
								<Button variant="secondary" size="sm" onClick={() => setPrefOpen(true)}>
									{t('timetable.teacherPreferences') || 'Teacher Preferences'}
								</Button>
							</div>
							<div className="border rounded-md p-3 h-64 overflow-auto space-y-2">
								{availableSlots.map((s) => (
									<label key={s.id} className="flex gap-2 items-center">
										<Checkbox checked={selectedSlotIds.includes(s.id)} onCheckedChange={(v) => toggleSlot(s.id, v)} />
										<span>{s.name} — {s.start_time} - {s.end_time}</span>
									</label>
								))}
							</div>
						</div>
					</div>
					)}

					{selectedAcademicYearId && (
						<div className="flex items-center justify-between">
							<div className="text-sm text-muted-foreground">
								{t('timetable.summary') || 'Select classes, days, and periods, then click Generate.'}
							</div>
							<Button onClick={generate} disabled={selectedClassIds.length === 0 || selectedSlotIds.length === 0}>
								{t('timetable.generate') || 'Generate'}
							</Button>
						</div>
					)}

					{unscheduledCount > 0 && (
						<div className="text-sm text-yellow-700">
							{unscheduledCount} {t('timetable.unscheduledNotice') || 'assignments could not be scheduled'}.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Load Timetable Button - Always visible */}
			<div className="flex items-center justify-end gap-2 mb-4">
				<Button variant="outline" onClick={() => setLoadOpen(true)}>
					{t('timetable.load') || 'Load Timetable'}
				</Button>
			</div>

			{entries.length > 0 && (
				<Card className="print-timetable-section">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>{t('timetable.results') || 'Results'}</CardTitle>
						<div className="flex items-center gap-2">
							{entries.length > 0 && (
								<ReportExportButtons
									data={entries}
									columns={[
										{ key: 'day', label: t('timetable.day') || 'Day' },
										{ key: 'period', label: t('timetable.period') || 'Period' },
										{ key: 'time', label: t('timetable.time') || 'Time' },
										{ key: 'teacher', label: t('timetable.teacher') || 'Teacher' },
										{ key: 'class', label: t('timetable.class') || 'Class' },
										{ key: 'subject', label: t('timetable.subject') || 'Subject' },
									]}
									reportKey="timetable"
									title={t('timetable.title') || 'Timetable Export'}
									transformData={(data) => {
										const days = allYear ? (['all_year'] as DayName[]) : (selectedDays.length > 0 ? selectedDays : dayList);
										const rows: Array<Record<string, any>> = [];
										
										// Create rows for each entry
										data.forEach((entry) => {
											const slot = headerSlots.find(s => s.id === entry.slot_id);
											const dayName = entry.day || '';
											const dayLabel = dayName === 'all_year' ? t('timetable.allYear') || 'All Year' : (t(`timetable.days.${dayName}`) || dayName);
											
											rows.push({
												day: dayLabel,
												period: slot?.name || '',
												time: slot ? `${slot.start_time} - ${slot.end_time}` : '',
												teacher: entry.teacher_name || '',
												class: entry.class_name || '',
												subject: entry.subject_name || '',
											});
										});
										
										return rows;
									}}
									buildFiltersSummary={() => {
										const parts: string[] = [];
										if (selectedAcademicYearId) {
											const year = academicYears?.find(y => y.id === selectedAcademicYearId);
											if (year) parts.push(`Academic Year: ${year.name}`);
										}
										if (allYear) {
											parts.push('Days: All Year');
										} else if (selectedDays.length > 0) {
											parts.push(`Days: ${selectedDays.map(d => t(`timetable.days.${d}`) || d).join(', ')}`);
										}
										if (selectedClassIds.length > 0) {
											const classNames = selectedClassIds.map(cid => {
												const cay = filteredClasses.find(c => c.id === cid);
												return cay?.class?.name || cid;
											}).join(', ');
											parts.push(`Classes: ${classNames}`);
										}
										return parts.join(' | ');
									}}
									schoolId={profile?.default_school_id}
									templateType="timetable"
									disabled={entries.length === 0}
								/>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrint}
								disabled={entries.length === 0}
								title={t('timetable.print') || 'Print Timetable'}
							>
								<Printer className="h-4 w-4 mr-2" />
								{t('timetable.print') || 'Print'}
							</Button>
							<Button
								onClick={() => {
									if (saveEntries.length === 0) {
										toast.error(t('timetable.noEntriesToSave') || 'No entries to save. Please generate a timetable first.');
										return;
									}
									if (!selectedAcademicYearId) {
										toast.error(t('timetable.selectAcademicYearBeforeSave') || 'Please select an academic year before saving.');
										return;
									}
									setSaveOpen(true);
								}}
								disabled={saveEntries.length === 0 || !selectedAcademicYearId}
							>
								{t('timetable.save') || 'Save'}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<DndContext
							sensors={sensors}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<Tabs defaultValue="teachers" className="w-full">
								<TabsList>
									<TabsTrigger value="teachers">{t('timetable.teacherView') || 'Teacher View'}</TabsTrigger>
									<TabsTrigger value="classes">{t('timetable.classView') || 'Class View'}</TabsTrigger>
								</TabsList>
								<TabsContent value="teachers" className="mt-4">
									<div className="w-full overflow-x-auto max-w-full">
										<div className="inline-block min-w-full align-middle">
											{headerSlots.length > 0 ? (
												<table className="min-w-full border">
													<thead>
														<tr className="bg-primary text-primary-foreground">
															<th className="p-2 border">{t('timetable.teacher') || 'Teacher'}</th>
															{(allYear ? (['all_year'] as DayName[]) : (selectedDays.length > 0 ? selectedDays : dayList)).flatMap((day) =>
																headerSlots.map((s) => (
																	<th key={`${day}-${s.id}`} className="p-2 border">
																		<div className="text-xs capitalize">{t(`timetable.days.${day}`) || day}</div>
																		<div className="text-xs">{s.name}</div>
																		<div className="text-[10px]">{s.start_time} - {s.end_time}</div>
																	</th>
																))
															)}
														</tr>
													</thead>
													<tbody>
														{teacherIdsInScope.map((tid) => (
															<tr key={tid} className="hover:bg-muted/50">
																<td className="p-2 border font-medium">{teacherMap.get(tid) || tid}</td>
																{(allYear ? (['all_year'] as DayName[]) : (selectedDays.length > 0 ? selectedDays : dayList)).flatMap((day) =>
																	headerSlots.map((s) => {
																		const cell = entries.find((e) => e.teacher_id === tid && e.slot_id === s.id && e.day === day);
																		const cellId = `cell-${tid}-${day}-${s.id}`;
																		// Find index by matching all key properties instead of reference
																		const entryIndex = cell ? entries.findIndex((e) => 
																			e.teacher_id === cell.teacher_id && 
																			e.class_id === cell.class_id && 
																			e.subject_name === cell.subject_name &&
																			e.slot_id === cell.slot_id &&
																			e.day === cell.day
																		) : -1;
																		return (
																			<DroppableCell
																				key={cellId}
																				id={cellId}
																				className="p-2 border align-top text-sm"
																			>
																				{cell && entryIndex >= 0 ? (
																					<DraggableCell id={`entry-${entryIndex}`} className="space-y-1">
																						<div className="font-medium">{cell.class_name}</div>
																						<div className="text-muted-foreground">{cell.subject_name}</div>
																					</DraggableCell>
																				) : null}
																			</DroppableCell>
																		);
																	})
																)}
															</tr>
														))}
													</tbody>
												</table>
											) : (
												<div className="text-center py-8 text-muted-foreground">
													{t('timetable.noSlotsSelected') || 'No schedule slots selected. Please select periods to view the timetable.'}
												</div>
											)}
										</div>
									</div>
								</TabsContent>
							<TabsContent value="classes" className="mt-4">
								<div className="w-full overflow-x-auto max-w-full">
									<div className="inline-block min-w-full align-middle">
										<table className="min-w-full border">
										<thead>
											<tr className="bg-primary text-primary-foreground">
												<th className="p-2 border">{t('timetable.class') || 'Class'}</th>
													{(allYear ? (['all_year'] as DayName[]) : (selectedDays.length > 0 ? selectedDays : dayList)).flatMap((day) =>
													headerSlots.map((s) => (
														<th key={`${day}-${s.id}`} className="p-2 border">
															<div className="text-xs capitalize">{t(`timetable.days.${day}`) || day}</div>
															<div className="text-xs">{s.name}</div>
															<div className="text-[10px]">{s.start_time} - {s.end_time}</div>
														</th>
													))
												)}
											</tr>
										</thead>
										<tbody>
											{Array.from(classesInScope).map((cid) => (
												<tr key={cid} className="hover:bg-muted/50">
													<td className="p-2 border font-medium">{classMap.get(cid) || cid}</td>
													{(allYear ? (['all_year'] as DayName[]) : (selectedDays.length > 0 ? selectedDays : dayList)).flatMap((day) =>
														headerSlots.map((s) => {
															const cell = entries.filter((e) => e.class_id === cid && e.slot_id === s.id && e.day === day);
															const cellId = `cell-${cid}-${day}-${s.id}`;
															return (
																<DroppableCell
																	key={cellId}
																	id={cellId}
																	className="p-2 border align-top text-sm"
																>
																	{cell.length > 0 ? (
																		<div className="space-y-1">
																			{cell.map((c, idx) => {
																				// Find index by matching all key properties instead of reference
																				const entryIndex = entries.findIndex((e) => 
																					e.teacher_id === c.teacher_id && 
																					e.class_id === c.class_id && 
																					e.subject_name === c.subject_name &&
																					e.slot_id === c.slot_id &&
																					e.day === c.day
																				);
																				return entryIndex >= 0 ? (
																					<DraggableCell key={idx} id={`entry-${entryIndex}`}>
																						<div className="font-medium">{c.subject_name}</div>
																						<div className="text-muted-foreground">{c.teacher_name}</div>
																					</DraggableCell>
																				) : (
																					<div key={idx}>
																						<div className="font-medium">{c.subject_name}</div>
																						<div className="text-muted-foreground">{c.teacher_name}</div>
																					</div>
																				);
																			})}
																		</div>
																	) : null}
																</DroppableCell>
															);
														})
													)}
												</tr>
											))}
										</tbody>
									</table>
									</div>
								</div>
							</TabsContent>
								</Tabs>
							<DragOverlay>
								{activeId ? (() => {
									const entryMatch = activeId.match(/^entry-(\d+)$/);
									if (!entryMatch) return null;
									const entryIndex = parseInt(entryMatch[1], 10);
									const entry = entries[entryIndex];
									if (!entry) return null;
									return (
										<div className="bg-background border rounded p-2 shadow-lg">
											<div className="font-medium">{entry.class_name}</div>
											<div className="text-sm text-muted-foreground">{entry.subject_name}</div>
										</div>
									);
								})() : null}
							</DragOverlay>
						</DndContext>
					</CardContent>
				</Card>
			)}

			<Separator />

			<TeacherPreferencesDialog
				open={prefOpen}
				onOpenChange={setPrefOpen}
				organizationId={organizationId}
				academicYearId={selectedAcademicYearId || null}
			/>

			<SaveTimetableDialog
				open={saveOpen}
				onOpenChange={setSaveOpen}
				entries={saveEntries}
				organizationId={organizationId || null}
				academicYearId={selectedAcademicYearId || null}
				defaultName={`Timetable ${new Date().toLocaleDateString()}`}
			/>

			<LoadTimetableDialog
				open={loadOpen}
				onOpenChange={setLoadOpen}
				organizationId={organizationId}
				academicYearId={selectedAcademicYearId || null}
				onLoaded={(id) => {
					setLoadOpen(false);
					setLoadedTimetableId(id);
				}}
			/>
		</div>
	);
}


