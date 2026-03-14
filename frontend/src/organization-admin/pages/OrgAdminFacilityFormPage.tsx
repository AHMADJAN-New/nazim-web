/**
 * Org Admin Facility Form – create or edit facility
 */

import { ArrowLeft, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function OrgAdminFacilityFormPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const facilityId = id ?? '';

  const { data: facility, isLoading: facilityLoading } = useOrgFacility(isEdit ? facilityId : undefined);
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
    }
  }, [facility]);

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
    if (isEdit && facilityId) {
      await updateFacility.mutateAsync({ id: facilityId, ...payload });
      navigate(`/org-admin/facilities/${facilityId}`);
    } else {
      const created = await createFacility.mutateAsync(payload);
      navigate(`/org-admin/facilities/${created.id}`);
    }
  };

  if (isEdit && facilityLoading) {
    return (
      <div className="container mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center overflow-x-hidden p-4 md:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEdit ? `/org-admin/facilities/${facilityId}` : '/org-admin/facilities'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={isEdit ? (t('organizationAdmin.editFacility') ?? 'Edit facility') : (t('organizationAdmin.addFacility') ?? 'Add facility')}
          description={isEdit ? facility?.name : undefined}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? (t('common.edit') ?? 'Edit') : (t('common.create') ?? 'Create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('organizationAdmin.facilityName') ?? 'Name'} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('organizationAdmin.facilityNamePlaceholder') ?? 'Facility name'}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t('organizationAdmin.facilityType') ?? 'Type'}</Label>
              <Select value={facilityTypeId || 'none'} onValueChange={(v) => setFacilityTypeId(v === 'none' ? '' : v)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder={t('organizationAdmin.selectType') ?? 'Select type'} />
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
              <Label htmlFor="address">{t('common.address') ?? 'Address'}</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('organizationAdmin.addressPlaceholder') ?? 'Address'}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">{t('organizationAdmin.areaSqm') ?? 'Area (m²)'}</Label>
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
                <Label htmlFor="city">{t('organizationAdmin.city') ?? 'City'}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('organizationAdmin.cityPlaceholder') ?? 'City'}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="district">{t('organizationAdmin.district') ?? 'District'}</Label>
                <Input
                  id="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={t('organizationAdmin.districtPlaceholder') ?? 'District'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landmark">{t('organizationAdmin.landmark') ?? 'Landmark'}</Label>
                <Input
                  id="landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={t('organizationAdmin.landmarkPlaceholder') ?? 'Landmark'}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">{t('organizationAdmin.latitude') ?? 'Latitude'}</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 34.5553"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">{t('organizationAdmin.longitude') ?? 'Longitude'}</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 69.2075"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">{t('organizationAdmin.linkAccount') ?? 'Link to account'}</Label>
              <Select value={financeAccountId || 'none'} onValueChange={(v) => setFinanceAccountId(v === 'none' ? '' : v)}>
                <SelectTrigger id="account">
                  <SelectValue placeholder={t('organizationAdmin.selectAccount') ?? 'Select account'} />
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
              <p className="text-xs text-muted-foreground">
                {t('organizationAdmin.linkAccountHelp') ?? 'Optional. Link this facility to an org finance account for expenses and income.'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="active">{t('common.active') ?? 'Active'}</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createFacility.isPending || updateFacility.isPending}>
                {createFacility.isPending || updateFacility.isPending ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  t('common.save') ?? 'Save'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={isEdit ? `/org-admin/facilities/${facilityId}` : '/org-admin/facilities'}>
                  {t('common.cancel') ?? 'Cancel'}
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
