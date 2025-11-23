import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTimetables, useTimetable } from '@/hooks/useTimetables';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';

interface LoadTimetableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId?: string;
	onLoaded: (timetableId: string) => void;
}

export function LoadTimetableDialog({ open, onOpenChange, organizationId, onLoaded }: LoadTimetableDialogProps) {
	const { t } = useLanguage();
	const { data: profile } = useProfile();
	const orgId = organizationId || profile?.organization_id || undefined;

	const { data: timetables } = useTimetables(orgId);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	// Preload detail when selection changes
	useTimetable(selectedId || undefined);

	const sorted = useMemo(() => {
		return (timetables || []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
	}, [timetables]);

	const handleLoad = () => {
		if (!selectedId) return;
		onLoaded(selectedId);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t('timetable.load') || 'Load Timetable'}</DialogTitle>
					<DialogDescription>
						{t('timetable.loadDesc') || 'Select a saved timetable to load.'}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<ScrollArea className="h-80 border rounded-md p-2">
						<div className="space-y-2">
							{sorted.map((tt) => (
								<label key={tt.id} className={`flex items-start gap-2 border rounded-md p-2 cursor-pointer ${selectedId === tt.id ? 'ring-2 ring-primary' : ''}`}>
									<input
										type="radio"
										name="tt"
										checked={selectedId === tt.id}
										onChange={() => setSelectedId(tt.id)}
										className="mt-1"
									/>
									<div className="text-sm">
										<div className="font-medium">{tt.name}</div>
										<div className="text-muted-foreground">{new Date(tt.created_at).toLocaleString()}</div>
										{tt.description && <div className="mt-1">{tt.description}</div>}
									</div>
								</label>
							))}
						</div>
					</ScrollArea>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel') || 'Cancel'}</Button>
					<Button onClick={handleLoad} disabled={!selectedId}>{t('timetable.load') || 'Load'}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


