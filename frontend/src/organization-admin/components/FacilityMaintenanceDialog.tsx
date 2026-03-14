/**
 * Dialog to add a facility maintenance record.
 */

import { Wrench } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { useCreateOrgFacilityMaintenance } from '@/hooks/useOrgFacilities';
import { useOrgFinanceCurrencies } from '@/hooks/useOrgFinance';
import type { FacilityMaintenance } from '@/types/domain/facility';

const MAINTENANCE_STATUS_KEYS: Record<string, string> = {
  pending: 'organizationAdmin.maintenanceStatusPending',
  in_progress: 'organizationAdmin.maintenanceStatusInProgress',
  completed: 'organizationAdmin.maintenanceStatusCompleted',
  deferred: 'organizationAdmin.maintenanceStatusDeferred',
};

export interface FacilityMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onSuccess?: () => void;
}

export function FacilityMaintenanceDialog({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: FacilityMaintenanceDialogProps) {
  const { t } = useLanguage();
  const [maintainedAt, setMaintainedAt] = useState(() => dateToLocalYYYYMMDD(new Date()));
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [costAmount, setCostAmount] = useState('');
  const [currencyId, setCurrencyId] = useState<string>('');

  const { data: currencies = [] } = useOrgFinanceCurrencies({ isActive: true });
  const createMaintenance = useCreateOrgFacilityMaintenance(facilityId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<FacilityMaintenance> = {
      maintainedAt: parseLocalDate(maintainedAt),
      description: description.trim() || undefined,
      status,
      costAmount: costAmount ? parseFloat(costAmount) : undefined,
      currencyId: currencyId || undefined,
    };
    try {
      await createMaintenance.mutateAsync(payload);
      setMaintainedAt(dateToLocalYYYYMMDD(new Date()));
      setDescription('');
      setStatus('pending');
      setCostAmount('');
      setCurrencyId('');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // toasts in hook
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMaintainedAt(dateToLocalYYYYMMDD(new Date()));
      setDescription('');
      setStatus('pending');
      setCostAmount('');
      setCurrencyId('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t('organizationAdmin.addMaintenance')}
          </DialogTitle>
          <DialogDescription>
            {t('organizationAdmin.addMaintenanceDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maint-date">{t('common.date')} *</Label>
            <CalendarDatePicker
              date={maintainedAt ? parseLocalDate(maintainedAt) : undefined}
              onDateChange={(date) => setMaintainedAt(date ? dateToLocalYYYYMMDD(date) : '')}
              placeholder={t('common.date')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maint-desc">{t('common.description') ?? 'Description'}</Label>
            <Textarea
              id="maint-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('organizationAdmin.maintenanceDescriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maint-status">{t('common.status') ?? 'Status'}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="maint-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MAINTENANCE_STATUS_KEYS).map(([value, key]) => (
                  <SelectItem key={value} value={value}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maint-cost">{t('organizationAdmin.cost') ?? 'Cost'}</Label>
              <Input
                id="maint-cost"
                type="number"
                min={0}
                step={0.01}
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maint-currency">{t('finance.currency')}</Label>
              <Select value={currencyId || 'none'} onValueChange={(v) => setCurrencyId(v === 'none' ? '' : v)}>
                <SelectTrigger id="maint-currency">
                  <SelectValue placeholder={t('organizationAdmin.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ?? c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMaintenance.isPending || !maintainedAt.trim()}>
              {createMaintenance.isPending ? <LoadingSpinner size="sm" /> : t('organizationAdmin.addMaintenance')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
