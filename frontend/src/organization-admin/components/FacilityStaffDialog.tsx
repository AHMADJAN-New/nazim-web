/**
 * Dialog to assign a staff member from the organization staff list to the facility.
 */

import { Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { useOrgHrStaff } from '@/hooks/orgHr/useOrgHr';
import { useCreateOrgFacilityStaff } from '@/hooks/useOrgFacilities';
import type { FacilityStaff } from '@/types/domain/facility';

export interface FacilityStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onSuccess?: () => void;
}

export function FacilityStaffDialog({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: FacilityStaffDialogProps) {
  const { t } = useLanguage();
  const [staffId, setStaffId] = useState<string>('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');

  const { data: staffData } = useOrgHrStaff({ perPage: 300, status: 'active' });
  const staffList = staffData?.data ?? [];
  const createStaff = useCreateOrgFacilityStaff(facilityId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<FacilityStaff> = {
      staffId: staffId || undefined,
      role: role.trim(),
      startDate: startDate ? new Date(startDate) : undefined,
    };
    try {
      await createStaff.mutateAsync(payload);
      setStaffId('');
      setRole('');
      setStartDate('');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // toasts in hook
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStaffId('');
      setRole('');
      setStartDate('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('organizationAdmin.addStaff')}
          </DialogTitle>
          <DialogDescription>
            {t('organizationAdmin.addStaffDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-select">{t('organizationAdmin.selectStaff')} *</Label>
            <Select
              value={staffId || 'none'}
              onValueChange={(v) => setStaffId(v === 'none' ? '' : v)}
              required
            >
              <SelectTrigger id="staff-select">
                <SelectValue placeholder={t('organizationAdmin.selectStaff')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('organizationAdmin.selectStaff')}</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {[s.firstName, s.fatherName].filter(Boolean).join(' ').trim() || s.employeeId}
                    {s.position ? ` · ${s.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staffList.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('organizationAdmin.noStaffToAssign')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-role">{t('organizationAdmin.role')} *</Label>
            <Input
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t('organizationAdmin.rolePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-start">{t('organizationAdmin.startDate')}</Label>
            <CalendarDatePicker
              date={startDate ? parseLocalDate(startDate) : undefined}
              onDateChange={(date) => setStartDate(date ? dateToLocalYYYYMMDD(date) : '')}
              placeholder={t('organizationAdmin.startDate')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createStaff.isPending || !role.trim() || !staffId || staffList.length === 0}
            >
              {createStaff.isPending ? <LoadingSpinner size="sm" /> : t('organizationAdmin.addStaff')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
