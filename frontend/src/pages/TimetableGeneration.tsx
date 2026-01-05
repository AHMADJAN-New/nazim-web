import { Calendar } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { TimetableGenerator } from '@/components/timetable/TimetableGenerator';
import { useLanguage } from '@/hooks/useLanguage';


export default function TimetableGeneration() {
	const { t } = useLanguage();
	return (
		<div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
			<PageHeader
				title={t('events.title') || 'Timetable Generation'}
				description={t('events.description') || 'Generate and manage class timetables'}
				icon={<Calendar className="h-5 w-5" />}
			/>
			<PermissionGuard permission="timetables.read">
				<TimetableGenerator />
			</PermissionGuard>
		</div>
	);
}


