import { TimetableGenerator } from '@/components/timetable/TimetableGenerator';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Calendar } from 'lucide-react';

export default function TimetableGeneration() {
	const { t } = useLanguage();
	return (
		<div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
			<PageHeader
				title={t('timetable.title') || 'Timetable Generation'}
				description={t('timetable.description') || 'Generate and manage class timetables'}
				icon={<Calendar className="h-5 w-5" />}
			/>
			<PermissionGuard permission="timetables.read">
				<TimetableGenerator />
			</PermissionGuard>
		</div>
	);
}


