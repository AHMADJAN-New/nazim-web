import { DayName } from '@/lib/timetableSolver';

export interface ClassTimetableCell {
	teacherName: string;
	subjectName: string;
}

export interface ClassTimetableTableProps {
	classIds: string[];
	classNameById: Record<string, string>;
	days: DayName[];
	allYear: boolean;
	slots: Array<{ id: string; name: string; start_time: string; end_time: string }>;
	// entries indexed by classId -> day -> slotId -> array of rows
	getCellList: (classId: string, day: DayName, slotId: string) => ClassTimetableCell[];
}

export function ClassTimetableTable({
	classIds,
	classNameById,
	days,
	allYear,
	slots,
	getCellList,
}: ClassTimetableTableProps) {
	const dayHeaders = allYear ? (['all_year'] as DayName[]) : days;
	return (
		<div className="overflow-auto">
			<table className="min-w-full border">
				<thead>
					<tr className="bg-primary text-primary-foreground">
						<th className="p-2 border">Class</th>
						{dayHeaders.flatMap((day) =>
							slots.map((s) => (
								<th key={`${day}-${s.id}`} className="p-2 border">
									<div className="text-xs capitalize">{day}</div>
									<div className="text-xs">{s.name}</div>
									<div className="text-[10px]">{s.start_time} - {s.end_time}</div>
								</th>
							))
						)}
					</tr>
				</thead>
				<tbody>
					{classIds.map((cid) => (
						<tr key={cid} className="hover:bg-muted/50">
							<td className="p-2 border font-medium">{classNameById[cid] || cid}</td>
							{dayHeaders.flatMap((day) =>
								slots.map((s) => {
									const cellList = getCellList(cid, day, s.id);
									return (
										<td key={`${cid}-${day}-${s.id}`} className="p-2 border align-top text-sm">
											{cellList.length > 0 ? (
												<div className="space-y-1">
													{cellList.map((c, i) => (
														<div key={i}>
															<div className="font-medium">{c.subjectName}</div>
															<div className="text-muted-foreground">{c.teacherName}</div>
														</div>
													))}
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


