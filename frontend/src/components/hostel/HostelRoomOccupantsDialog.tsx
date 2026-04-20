import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import type { HostelRoom } from '@/types/domain/hostel';

export interface HostelRoomOccupantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: HostelRoom | null;
}

function formatCell(value: string | null | undefined, fallback: string): string {
  const s = value?.trim();
  return s ? s : fallback;
}

export function HostelRoomOccupantsDialog({ open, onOpenChange, room }: HostelRoomOccupantsDialogProps) {
  const { t } = useLanguage();

  const studentFallback = t('hostel.student');
  const dash = '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>
            {room ? t('hostel.roomOccupantsTitle', { room: room.roomNumber }) : ''}
          </DialogTitle>
          {room ? (
            <DialogDescription className="text-left">
              {[
                formatCell(room.buildingName, t('hostel.unassigned')),
                room.staffName
                  ? `${t('hostel.warden')}: ${room.staffName}`
                  : `${t('hostel.warden')}: ${t('hostel.notAssigned')}`,
                room.capacity != null && room.capacity > 0
                  ? `${t('hostel.capacity')}: ${room.occupants.length} / ${room.capacity}`
                  : `${t('hostel.capacity')}: ${room.occupants.length}`,
              ].join(' · ')}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <ScrollArea className="h-[min(52vh,480px)] px-6 py-4">
          {!room ? null : room.occupants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('hostel.roomOccupantsEmpty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">{t('hostel.student')}</TableHead>
                  <TableHead className="text-left">{t('hostel.fatherName')}</TableHead>
                  <TableHead className="text-left">{t('hostel.reports.classColumn')}</TableHead>
                  <TableHead className="text-left">{t('hostel.reports.academicYearColumn')}</TableHead>
                  <TableHead className="text-left">{t('hostel.reports.admissionNumberColumn')}</TableHead>
                  <TableHead className="text-left">{t('hostel.reports.admissionYearHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {room.occupants.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-left font-medium">
                      {formatCell(o.studentName, studentFallback)}
                    </TableCell>
                    <TableCell className="text-left">{formatCell(o.fatherName, dash)}</TableCell>
                    <TableCell className="text-left">{formatCell(o.className, dash)}</TableCell>
                    <TableCell className="text-left">
                      {formatCell(o.academicYearName || o.admissionYear, dash)}
                    </TableCell>
                    <TableCell className="text-left">{formatCell(o.admissionNumber, dash)}</TableCell>
                    <TableCell className="text-left">{formatCell(o.admissionYear, dash)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
