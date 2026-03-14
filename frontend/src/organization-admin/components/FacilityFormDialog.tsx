/**
 * Facility create/edit form in a dialog.
 */

import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFacility,
  useOrgFacilityTypes,
  useCreateOrgFacility,
  useUpdateOrgFacility,
} from '@/hooks/useOrgFacilities';
import { useOrgFinanceAccounts } from '@/hooks/useOrgFinance';
import type { OrgFacility } from '@/types/domain/facility';

export interface FacilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId?: string | null;
  onSuccess?: (facility: OrgFacility) => void;
}

export function FacilityFormDialog({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: FacilityFormDialogProps) {
  const { t } = useLanguage();
  const isEdit = Boolean(facilityId);
  const id = facilityId ?? '';

  const { data: facility, isLoading: facilityLoading } = useOrgFacility(isEdit ? id : undefined);
  const { data: types = [] } = useOrgFacilityTypes();
  const { data: accounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const createFacility = useCreateOrgFacility();
  const updateFacility = useUpdateOrgFacility();

  const [name, setName] = useState('');
  const [facilityTypeId, setFacilityTypeId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [areaSqm, setAreaSqm] = useState<string>('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [financeAccountId, setFinanceAccountId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (facility) {
      setName(facility.name);
      setFacilityTypeId(facility.facilityTypeId ?? '');
      setAddress(facility.address ?? '');
      setAreaSqm(facility.areaSqm != null ? String(facility.areaSqm) : '');
      setCity(facility.city ?? '');
      setDistrict(facility.district ?? '');
      setLandmark(facility.landmark ?? '');
      setLatitude(facility.latitude != null ? String(facility.latitude) : '');
      setLongitude(facility.longitude != null ? String(facility.longitude) : '');
      setFinanceAccountId(facility.financeAccountId ?? '');
      setIsActive(facility.isActive);
    } else if (!isEdit && open) {
      setName('');
      setFacilityTypeId('');
      setAddress('');
      setAreaSqm('');
      setCity('');
      setDistrict('');
      setLandmark('');
      setLatitude('');
      setLongitude('');
      setFinanceAccountId('');
      setIsActive(true);
    }
  }, [facility, isEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<OrgFacility> = {
      name: name.trim(),
      facilityTypeId: facilityTypeId || undefined,
      address: address.trim() || undefined,
      areaSqm: areaSqm ? parseFloat(areaSqm) : undefined,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      landmark: landmark.trim() || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      financeAccountId: financeAccountId || undefined,
      isActive,
    };
    try {
      if (isEdit && id) {
        const updated = await updateFacility.mutateAsync({ id, ...payload });
        onOpenChange(false);
        onSuccess?.(updated);
      } else {
        const created = await createFacility.mutateAsync(payload);
        onOpenChange(false);
        onSuccess?.(created);
      }
    } catch {
      // toasts handled in hooks
    }
  };

  const isPending = createFacility.isPending || updateFacility.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0 gap-0">
        <div className="border-b border-muted/50 bg-muted/20 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {isEdit ? t('organizationAdmin.editFacility') : t('organizationAdmin.addFacility')}
            </DialogTitle>
            <DialogDescription>
              {t('organizationAdmin.facilitiesDesc')}
            </DialogDescription>
          </DialogHeader>
        </div>
        {isEdit && facilityLoading ? (
          <div className="flex min-h-[200px] items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5">
            {/* Basic information */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('organizationAdmin.basicInfo')}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="name">{t('organizationAdmin.facilityName')} *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('organizationAdmin.facilityNamePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('organizationAdmin.facilityType')}</Label>
                <Select value={facilityTypeId || 'none'} onValueChange={(v) => setFacilityTypeId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('organizationAdmin.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('common.address')}</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('organizationAdmin.addressPlaceholder')}
                  rows={2}
                />
              </div>
            </section>

            {/* Location & coordinates */}
            <section className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('organizationAdmin.location')}
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="area">{t('organizationAdmin.areaSqm')}</Label>
                  <Input
                    id="area"
                    type="number"
                    min={0}
                    step={0.01}
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('organizationAdmin.city')}</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('organizationAdmin.cityPlaceholder')} />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="district">{t('organizationAdmin.district')}</Label>
                  <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('organizationAdmin.districtPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">{t('organizationAdmin.landmark')}</Label>
                  <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder={t('organizationAdmin.landmarkPlaceholder')} />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">{t('organizationAdmin.latitude')}</Label>
                  <Input id="latitude" type="number" step="any" min={-90} max={90} value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="34.5553" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">{t('organizationAdmin.longitude')}</Label>
                  <Input id="longitude" type="number" step="any" min={-180} max={180} value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="69.2075" />
                </div>
              </div>
            </section>

            {/* Finance & status */}
            <section className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('organizationAdmin.financeAndStatus')}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="account">{t('organizationAdmin.linkAccount')}</Label>
                <Select value={financeAccountId || 'none'} onValueChange={(v) => setFinanceAccountId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="account">
                    <SelectValue placeholder={t('organizationAdmin.selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} {acc.code ? `(${acc.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('organizationAdmin.linkAccountHelp')}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-muted/50 bg-muted/20 p-3">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="active" className="cursor-pointer font-normal">
                  {t('common.active')}
                </Label>
              </div>
            </section>

            <div className="mt-8 flex justify-end gap-2 border-t border-muted/50 pt-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoadingSpinner size="sm" /> : t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
