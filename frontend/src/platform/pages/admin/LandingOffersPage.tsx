import { useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, Pencil, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { usePlatformPlans } from '@/platform/hooks/usePlatformAdmin';
import {
  usePlatformDiscountCodes,
  usePlatformUpdateDiscountCode,
} from '@/platform/hooks/usePlatformAdminComplete';
import type * as SubscriptionApi from '@/types/api/subscription';

interface LandingOfferForm {
  showOnLanding: boolean;
  landingLabel: string;
  landingMessage: string;
  validFrom: string | null;
  validUntil: string | null;
}

const emptyLandingForm: LandingOfferForm = {
  showOnLanding: false,
  landingLabel: '',
  landingMessage: '',
  validFrom: null,
  validUntil: null,
};

const formatCountdown = (validUntil?: string | null, expiredLabel?: string) => {
  if (!validUntil) return null;
  const expiresAt = new Date(validUntil).getTime();
  const now = Date.now();
  if (Number.isNaN(expiresAt) || expiresAt <= now) {
    return expiredLabel || 'Expired';
  }
  const diffMs = expiresAt - now;
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getLandingMetadata = (code: SubscriptionApi.DiscountCode) => {
  const metadata = (code.metadata ?? {}) as Record<string, unknown>;
  return {
    showOnLanding: metadata.show_on_landing === true,
    landingLabel: typeof metadata.landing_label === 'string' ? metadata.landing_label : '',
    landingMessage: typeof metadata.landing_message === 'string' ? metadata.landing_message : '',
  };
};

export default function LandingOffersPage() {
  const { t } = useLanguage();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');
  const { data: codesResponse, isLoading } = usePlatformDiscountCodes();
  const { data: plans } = usePlatformPlans();
  const updateCode = usePlatformUpdateDiscountCode();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeCode, setActiveCode] = useState<SubscriptionApi.DiscountCode | null>(null);
  const [formData, setFormData] = useState<LandingOfferForm>(emptyLandingForm);

  const codes = (codesResponse?.data || codesResponse || []) as SubscriptionApi.DiscountCode[];

  const planLookup = useMemo(() => {
    return new Map(plans?.map((plan) => [plan.id, plan.name]) ?? []);
  }, [plans]);

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const handleOpenDialog = (code: SubscriptionApi.DiscountCode) => {
    const metadata = getLandingMetadata(code);
    setActiveCode(code);
    setFormData({
      showOnLanding: metadata.showOnLanding,
      landingLabel: metadata.landingLabel,
      landingMessage: metadata.landingMessage,
      validFrom: code.valid_from,
      validUntil: code.valid_until,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeCode) return;
    await updateCode.mutateAsync({
      id: activeCode.id,
      valid_from: formData.validFrom ?? undefined,
      valid_until: formData.validUntil ?? undefined,
      metadata: {
        ...(activeCode.metadata ?? {}),
        show_on_landing: formData.showOnLanding,
        landing_label: formData.landingLabel,
        landing_message: formData.landingMessage,
      },
    });
    setIsDialogOpen(false);
  };

  const handleToggleLanding = async (code: SubscriptionApi.DiscountCode, enabled: boolean) => {
    await updateCode.mutateAsync({
      id: code.id,
      metadata: {
        ...(code.metadata ?? {}),
        show_on_landing: enabled,
      },
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('platformLandingOffers.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('platformLandingOffers.subtitle')}
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('platformLandingOffers.columns.code')}</TableHead>
              <TableHead>{t('platformLandingOffers.columns.plan')}</TableHead>
              <TableHead>{t('platformLandingOffers.columns.discount')}</TableHead>
              <TableHead>{t('platformLandingOffers.columns.validity')}</TableHead>
              <TableHead>{t('platformLandingOffers.columns.landing')}</TableHead>
              <TableHead className="text-right">{t('platformLandingOffers.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((code) => {
              const landing = getLandingMetadata(code);
              const countdown = formatCountdown(code.valid_until, t('platformLandingOffers.expired'));
              return (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {code.code}
                      </Badge>
                      {landing.showOnLanding && (
                        <Badge variant="default">{t('platformLandingOffers.live')}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{code.name}</div>
                  </TableCell>
                  <TableCell>
                    {code.applicable_plan_id ? (
                      <span>{planLookup.get(code.applicable_plan_id) || t('platformLandingOffers.specificPlan')}</span>
                    ) : (
                      <span className="text-muted-foreground">{t('platformLandingOffers.allPlans')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {code.discount_type === 'percentage'
                      ? `${code.discount_value}%`
                      : `${code.discount_value} ${code.currency || 'AFN'}`}
                  </TableCell>
                  <TableCell>
                    {code.valid_until ? (
                      <div className="space-y-1">
                        <div className="text-sm">
                          {t('platformLandingOffers.ends')} {new Date(code.valid_until).toLocaleDateString()}
                        </div>
                        {countdown && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <CalendarClock className="h-3 w-3" />
                            <span>{countdown}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('platformLandingOffers.noExpiry')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={landing.showOnLanding}
                        onCheckedChange={(checked) => handleToggleLanding(code, checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {landing.showOnLanding ? t('platformLandingOffers.visible') : t('platformLandingOffers.hidden')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(code)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('platformLandingOffers.configure')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {codes.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t('platformLandingOffers.empty')}
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t('platformLandingOffers.loading')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('platformLandingOffers.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('platformLandingOffers.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t('platformLandingOffers.dialog.showTitle')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('platformLandingOffers.dialog.showDescription')}
                </p>
              </div>
              <Switch
                checked={formData.showOnLanding}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, showOnLanding: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landingLabel">{t('platformLandingOffers.dialog.badgeLabel')}</Label>
              <Input
                id="landingLabel"
                placeholder={t('platformLandingOffers.dialog.badgePlaceholder')}
                value={formData.landingLabel}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, landingLabel: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landingMessage">{t('platformLandingOffers.dialog.messageLabel')}</Label>
              <Textarea
                id="landingMessage"
                placeholder={t('platformLandingOffers.dialog.messagePlaceholder')}
                value={formData.landingMessage}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, landingMessage: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom">{t('platformLandingOffers.dialog.validFrom')}</Label>
                <CalendarDatePicker
                  date={formData.validFrom ? new Date(formData.validFrom) : undefined}
                  onDateChange={(date) =>
                    setFormData((prev) => ({
                      ...prev,
                      validFrom: date ? date.toISOString().slice(0, 10) : null,
                    }))
                  }
                  placeholder={t('platformLandingOffers.dialog.noStartDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">{t('platformLandingOffers.dialog.validUntil')}</Label>
                <CalendarDatePicker
                  date={formData.validUntil ? new Date(formData.validUntil) : undefined}
                  onDateChange={(date) =>
                    setFormData((prev) => ({
                      ...prev,
                      validUntil: date ? date.toISOString().slice(0, 10) : null,
                    }))
                  }
                  placeholder={t('platformLandingOffers.dialog.noExpiryDate')}
                  minDate={formData.validFrom ? new Date(formData.validFrom) : undefined}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updateCode.isPending}>
              {t('platformLandingOffers.saveSettings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
