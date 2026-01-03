import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useTimetables, useTimetable } from '@/hooks/useTimetables';
import { formatDate, formatDateTime } from '@/lib/utils';

interface LoadTimetableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId?: string;
	academicYearId?: string | null;
	onLoaded: (timetableId: string) => void;
}

export function LoadTimetableDialog({ open, onOpenChange, organizationId, academicYearId, onLoaded }: LoadTimetableDialogProps) {
	const { t } = useLanguage();
	const { data: profile } = useProfile();
	const orgId = organizationId || profile?.organization_id || undefined;

	// Load ALL timetables for the organization (don't filter by academic year in the dialog)
	// This allows users to see all their saved timetables regardless of academic year
	const { data: timetables, isLoading, error, refetch } = useTimetables(orgId, undefined);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	// Preload detail when selection changes
	const { data: previewTimetable } = useTimetable(selectedId || undefined);
	
	// Reset selection when dialog closes and refetch when dialog opens
	useEffect(() => {
		if (!open) {
			setSelectedId(null);
		} else {
			// Refetch timetables when dialog opens to ensure fresh data
			refetch();
		}
	}, [open, refetch]);

	const sorted = useMemo(() => {
		return (timetables || [])
			.filter(t => t && t.created_at)
			.slice()
			.sort((a, b) => {
				if (!a || !b || !a.created_at || !b.created_at) return 0;
				return (b.created_at || '').toString().localeCompare((a.created_at || '').toString());
			});
	}, [timetables]);

	// Debug logging to help troubleshoot
	useEffect(() => {
		if (open && !isLoading && import.meta.env.DEV) {
			console.log('LoadTimetableDialog - Timetables loaded:', {
				count: timetables?.length || 0,
				timetables: timetables,
				orgId,
				academicYearId,
				error
			});
		}
	}, [open, timetables, isLoading, orgId, academicYearId, error]);

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
					{error ? (
						<div className="text-center py-8 text-destructive">{(t('timetable.loadError') || 'Error loading timetables: {error}').replace('{error}', error.message)}</div>
					) : isLoading ? (
						<div className="text-center py-8 text-muted-foreground">{t('timetable.loadingTimetables') || 'Loading timetables...'}</div>
					) : sorted.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							{t('timetable.noSavedTimetables') || 'No saved timetables found for this organization.'}
						</div>
					) : (
						<ScrollArea className="h-80 border rounded-md p-2">
							<div className="space-y-2">
								{sorted.map((tt) => (
									<label key={tt.id} className={`flex items-start gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50 ${selectedId === tt.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
										<input
											type="radio"
											name="tt"
											checked={selectedId === tt.id}
											onChange={() => setSelectedId(tt.id)}
											className="mt-1"
										/>
										<div className="text-sm flex-1">
											<div className="font-medium">{tt.name}</div>
											<div className="text-muted-foreground text-xs">{formatDateTime(tt.created_at)}</div>
											{tt.description && <div className="mt-1 text-xs">{tt.description}</div>}
											{previewTimetable && selectedId === tt.id && (
												<div className="mt-2 text-xs text-muted-foreground">
													{previewTimetable.entries?.length || 0} {t('timetable.entries') || 'entries'}
												</div>
											)}
										</div>
									</label>
								))}
							</div>
						</ScrollArea>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel') || 'Cancel'}</Button>
					<Button onClick={handleLoad} disabled={!selectedId}>{t('timetable.load') || 'Load'}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


