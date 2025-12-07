import { DayName } from '@/lib/timetableSolver';
import { useLanguage } from '@/hooks/useLanguage';

export interface TeacherTimetableCell {
	className: string;
	subjectName: string;
}

export interface TeacherTimetableTableProps {
	teacherIds: string[];
	teacherNameById: Record<string, string>;
	days: DayName[];
	allYear: boolean;
	slots: Array<{ id: string; name: string; start_time: string; end_time: string }>;
	// entries indexed by teacherId -> day -> slotId
	getCell: (teacherId: string, day: DayName, slotId: string) => TeacherTimetableCell | null;
}

export function TeacherTimetableTable({
	teacherIds,
	teacherNameById,
	days,
	allYear,
	slots,
	getCell,
}: TeacherTimetableTableProps) {
	const { t } = useLanguage();
	const dayHeaders = allYear ? (['all_year'] as DayName[]) : days;
	return (
		<div className="overflow-auto">
			<table className="min-w-full border">
				<thead>
					<tr className="bg-primary text-primary-foreground">
						<th className="p-2 border">{t('timetable.teacher') || 'Teacher'}</th>
						{dayHeaders.flatMap((day) =>
							slots.map((s) => (
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
					{teacherIds.map((tid) => (
						<tr key={tid} className="hover:bg-muted/50">
							<td className="p-2 border font-medium">{teacherNameById[tid] || tid}</td>
							{dayHeaders.flatMap((day) =>
								slots.map((s) => {
									const cell = getCell(tid, day, s.id);
									return (
										<td key={`${tid}-${day}-${s.id}`} className="p-2 border align-top text-sm">
											{cell ? (
												<div className="space-y-1">
													<div className="font-medium">{cell.className}</div>
													<div className="text-muted-foreground">{cell.subjectName}</div>
												</div>
											) : null}
										</td>
									);
								})
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}


