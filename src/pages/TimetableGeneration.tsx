import { TimetableGenerator } from '@/components/timetable/TimetableGenerator';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useLanguage } from '@/hooks/useLanguage';

export default function TimetableGeneration() {
	const { t } = useLanguage();
	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">{t('timetable.title') || 'Timetable Generation'}</h1>
			<PermissionGuard permission="academic.timetables.read">
				<TimetableGenerator />
			</PermissionGuard>
		</div>
	);
}


