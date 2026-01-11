import { Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { SubscriptionPlan } from '@/hooks/useSubscription';

interface EnterpriseContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan;
}

interface EnterpriseContactFormData {
  organization_name: string;
  school_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_position: string;
  number_of_schools: number | null;
  student_count: number | null;
  staff_count: number | null;
  city: string;
  country: string;
  message: string;
}

export function EnterpriseContactDialog({
  open,
  onOpenChange,
  plan,
}: EnterpriseContactDialogProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EnterpriseContactFormData>({
    defaultValues: {
      organization_name: '',
      school_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      contact_whatsapp: '',
      contact_position: '',
      number_of_schools: null,
      student_count: null,
      staff_count: null,
      city: '',
      country: '',
      message: '',
    },
  });

  const onSubmit = async (data: EnterpriseContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/landing/plan-request', {
        requested_plan_id: plan.id,
        organization_name: data.organization_name,
        school_name: data.school_name,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        contact_whatsapp: data.contact_whatsapp || null,
        contact_position: data.contact_position || null,
        number_of_schools: data.number_of_schools || null,
        student_count: data.student_count || null,
        staff_count: data.staff_count || null,
        city: data.city || null,
        country: data.country || null,
        message: data.message || null,
      });

      showToast.success(t('subscription.enterpriseContact.submitted') || 'Thank you! We will contact you soon.');
      reset();
      onOpenChange(false);
    } catch (error: any) {
      showToast.error(
        error?.message ||
          t('subscription.enterpriseContact.submitFailed') ||
          'Failed to submit request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-500" />
            <DialogTitle>
              {t('subscription.enterpriseContact.title') || 'Contact Us for Enterprise Plan'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('subscription.enterpriseContact.description') ||
              'Fill out the form below and our team will contact you to discuss your Enterprise plan requirements and provide a customized quote.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization_name">
                {t('subscription.enterpriseContact.organizationName') || 'Organization Name'} *
              </Label>
              <Input
                id="organization_name"
                {...register('organization_name', { required: 'Organization name is required' })}
                placeholder={t('subscription.enterpriseContact.organizationNamePlaceholder') || 'Your organization name'}
              />
              {errors.organization_name && (
                <p className="text-sm text-destructive">{errors.organization_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">
                {t('subscription.enterpriseContact.schoolName') || 'School Name'} *
              </Label>
              <Input
                id="school_name"
                {...register('school_name', { required: 'School name is required' })}
                placeholder={t('subscription.enterpriseContact.schoolNamePlaceholder') || 'Main school name'}
              />
              {errors.school_name && (
                <p className="text-sm text-destructive">{errors.school_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">
                {t('subscription.enterpriseContact.contactName') || 'Contact Person Name'} *
              </Label>
              <Input
                id="contact_name"
                {...register('contact_name', { required: 'Contact name is required' })}
                placeholder={t('subscription.enterpriseContact.contactNamePlaceholder') || 'Your full name'}
              />
              {errors.contact_name && (
                <p className="text-sm text-destructive">{errors.contact_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">
                {t('subscription.enterpriseContact.contactEmail') || 'Email Address'} *
              </Label>
              <Input
                id="contact_email"
                type="email"
                {...register('contact_email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder={t('subscription.enterpriseContact.contactEmailPlaceholder') || 'your@email.com'}
              />
              {errors.contact_email && (
                <p className="text-sm text-destructive">{errors.contact_email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">
                {t('subscription.enterpriseContact.contactPhone') || 'Phone Number'}
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                {...register('contact_phone')}
                placeholder={t('subscription.enterpriseContact.contactPhonePlaceholder') || '+93-701234567'}
              />
              {errors.contact_phone && (
                <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_whatsapp">
                {t('subscription.enterpriseContact.contactWhatsApp') || 'WhatsApp Number'}
              </Label>
              <Input
                id="contact_whatsapp"
                type="tel"
                {...register('contact_whatsapp')}
                placeholder={t('subscription.enterpriseContact.contactWhatsAppPlaceholder') || '+93-701234567'}
              />
              {errors.contact_whatsapp && (
                <p className="text-sm text-destructive">{errors.contact_whatsapp.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_position">
                {t('subscription.enterpriseContact.contactPosition') || 'Position'}
              </Label>
              <Input
                id="contact_position"
                {...register('contact_position')}
                placeholder={t('subscription.enterpriseContact.contactPositionPlaceholder') || 'e.g., Principal, Administrator'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number_of_schools">
                {t('subscription.enterpriseContact.numberOfSchools') || 'Number of Schools'}
              </Label>
              <Input
                id="number_of_schools"
                type="number"
                min="1"
                {...register('number_of_schools', {
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' },
                })}
                placeholder={t('subscription.enterpriseContact.numberOfSchoolsPlaceholder') || '1'}
              />
              {errors.number_of_schools && (
                <p className="text-sm text-destructive">{errors.number_of_schools.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_count">
                {t('subscription.enterpriseContact.studentCount') || 'Estimated Student Count'}
              </Label>
              <Input
                id="student_count"
                type="number"
                min="0"
                {...register('student_count', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                placeholder={t('subscription.enterpriseContact.studentCountPlaceholder') || '500'}
              />
              {errors.student_count && (
                <p className="text-sm text-destructive">{errors.student_count.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_count">
                {t('subscription.enterpriseContact.staffCount') || 'Estimated Staff Count'}
              </Label>
              <Input
                id="staff_count"
                type="number"
                min="0"
                {...register('staff_count', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                placeholder={t('subscription.enterpriseContact.staffCountPlaceholder') || '50'}
              />
              {errors.staff_count && (
                <p className="text-sm text-destructive">{errors.staff_count.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t('subscription.enterpriseContact.city') || 'City'}</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder={t('subscription.enterpriseContact.cityPlaceholder') || 'Your city'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">
                {t('subscription.enterpriseContact.country') || 'Country'}
              </Label>
              <Input
                id="country"
                {...register('country')}
                placeholder={t('subscription.enterpriseContact.countryPlaceholder') || 'Your country'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              {t('subscription.enterpriseContact.organizationNeeds') ||
                'Organization Needs & Requirements'}
            </Label>
            <Textarea
              id="message"
              {...register('message')}
              placeholder={
                t('subscription.enterpriseContact.organizationNeedsPlaceholder') ||
                'Please describe your organization\'s specific needs, requirements, and any questions you have about the Enterprise plan...'
              }
              rows={6}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('subscription.enterpriseContact.submitting') || 'Submitting...'}
                </>
              ) : (
                t('subscription.enterpriseContact.submit') || 'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

