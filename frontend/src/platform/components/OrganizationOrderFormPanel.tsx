import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { z } from 'zod';

import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import {
  useDeletePlatformOrganizationOrderFormDocument,
  useDownloadPlatformOrganizationOrderFormDocument,
  useDownloadPlatformOrganizationOrderFormPdf,
  usePlatformOrganizationOrderForm,
  useSavePlatformOrganizationOrderForm,
  useUploadPlatformOrganizationOrderFormDocument,
} from '@/platform/hooks/usePlatformOrganizationOrderForm';
import { platformApi, type PlatformFile } from '@/platform/lib/platformApi';
import { useQuery, useMutation } from '@tanstack/react-query';
import type {
  OrderFormBillingCycle,
  OrderFormDocumentCategory,
  OrderFormStatus,
  OrderFormTrainingMode,
  PlatformOrderForm,
} from '@/types/api/platformOrderForm';
import type { SubscriptionPlan } from '@/types/domain/subscription';

const ORDER_FORM_STATUSES = ['draft', 'pending_review', 'sent', 'signed'] as const;
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'custom'] as const;
const TRAINING_MODES = ['in_person', 'online', 'hybrid'] as const;
const DOCUMENT_CATEGORIES = [
  'signed_order_form',
  'contract',
  'signed_contract',
  'order_form_template',
  'identity_document',
  'payment_receipt',
  'supporting_document',
  'other',
] as const;

const NONE_VALUE = '__none__';

const CONTRACT_PLATFORM_CATEGORIES = ['contract_template', 'signed_contract'];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const optionalStringSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalEmailSchema = optionalStringSchema.refine(
  (value) => !value || z.string().email().safeParse(value).success,
  'Enter a valid email address'
);

const optionalUrlSchema = optionalStringSchema.refine(
  (value) => !value || z.string().url().safeParse(value).success,
  'Enter a valid URL'
);

const optionalNumberSchema = z
  .union([z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }

    return value;
  });

const orderFormSchema = z.object({
  status: z.enum(ORDER_FORM_STATUSES),
  form_number: optionalStringSchema,
  issue_date: optionalStringSchema,
  currency: z.enum(['AFN', 'USD']),
  customer_organization_name: optionalStringSchema,
  customer_address: optionalStringSchema,
  customer_contact_name: optionalStringSchema,
  customer_contact_title: optionalStringSchema,
  customer_email: optionalEmailSchema,
  customer_phone: optionalStringSchema,
  customer_whatsapp: optionalStringSchema,
  customer_notes: optionalStringSchema,
  provider_organization_name: optionalStringSchema,
  provider_address: optionalStringSchema,
  provider_contact_name: optionalStringSchema,
  provider_contact_title: optionalStringSchema,
  provider_email: optionalEmailSchema,
  provider_phone: optionalStringSchema,
  provider_website: optionalUrlSchema,
  provider_notes: optionalStringSchema,
  plan_id: optionalStringSchema,
  plan_name_override: optionalStringSchema,
  plan_description: optionalStringSchema,
  billing_cycle: z.union([z.enum(BILLING_CYCLES), z.null(), z.undefined()]).transform((value) => value ?? null),
  subscription_start_date: optionalStringSchema,
  subscription_end_date: optionalStringSchema,
  license_fee: optionalNumberSchema,
  maintenance_fee: optionalNumberSchema,
  additional_services_fee: optionalNumberSchema,
  tax_amount: optionalNumberSchema,
  discount_name: optionalStringSchema,
  discount_percentage: optionalNumberSchema.refine(
    (value) => value === null || (value >= 0 && value <= 100),
    'Discount percentage must be between 0 and 100'
  ),
  discount_amount: optionalNumberSchema,
  payment_terms: optionalStringSchema,
  payment_notes: optionalStringSchema,
  max_students: optionalNumberSchema,
  max_staff: optionalNumberSchema,
  max_system_users: optionalNumberSchema,
  max_storage_gb: optionalNumberSchema,
  limits_notes: optionalStringSchema,
  implementation_date: optionalStringSchema,
  training_mode: z.union([z.enum(TRAINING_MODES), z.null(), z.undefined()]).transform((value) => value ?? null),
  special_requirements: optionalStringSchema,
  additional_modules: optionalStringSchema,
  important_terms: optionalStringSchema,
  acceptance_notes: optionalStringSchema,
  acceptance_confirmed: z.boolean(),
  customer_signatory_name: optionalStringSchema,
  customer_signatory_title: optionalStringSchema,
  customer_signed_at: optionalStringSchema,
  provider_signatory_name: optionalStringSchema,
  provider_signatory_title: optionalStringSchema,
  provider_signed_at: optionalStringSchema,
  internal_notes: optionalStringSchema,
});

type OrderFormFormValues = z.infer<typeof orderFormSchema>;

interface UsageInfo {
  name?: string;
  description?: string;
  current?: number;
  limit?: number | null;
  unit?: string;
}

interface OrganizationOrderFormPanelProps {
  organizationId: string;
  organizationName?: string | null;
  plans?: SubscriptionPlan[];
  subscription?: {
    plan_id?: string;
    plan?: SubscriptionPlan;
    currency?: 'AFN' | 'USD';
    discount_code_id?: string | null;
  } | null;
  usage?: Record<string, UsageInfo>;
}

const statusLabels: Record<OrderFormStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  sent: 'Sent',
  signed: 'Signed',
};

const billingCycleLabels: Record<OrderFormBillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const trainingModeLabels: Record<OrderFormTrainingMode, string> = {
  in_person: 'In person',
  online: 'Online',
  hybrid: 'Hybrid',
};

const documentCategoryLabels: Record<OrderFormDocumentCategory, string> = {
  signed_order_form: 'Signed order form',
  contract: 'Contract',
  signed_contract: 'Signed contract',
  order_form_template: 'Order form template',
  identity_document: 'Identity document',
  payment_receipt: 'Payment receipt',
  supporting_document: 'Supporting document',
  other: 'Other',
};

const orderFormFieldDefaults: OrderFormFormValues = {
  status: 'draft',
  form_number: null,
  issue_date: null,
  currency: 'AFN',
  customer_organization_name: null,
  customer_address: null,
  customer_contact_name: null,
  customer_contact_title: null,
  customer_email: null,
  customer_phone: null,
  customer_whatsapp: null,
  customer_notes: null,
  provider_organization_name: null,
  provider_address: null,
  provider_contact_name: null,
  provider_contact_title: null,
  provider_email: null,
  provider_phone: null,
  provider_website: null,
  provider_notes: null,
  plan_id: null,
  plan_name_override: null,
  plan_description: null,
  billing_cycle: null,
  subscription_start_date: null,
  subscription_end_date: null,
  license_fee: null,
  maintenance_fee: null,
  additional_services_fee: null,
  tax_amount: null,
  discount_name: null,
  discount_percentage: null,
  discount_amount: null,
  payment_terms: null,
  payment_notes: null,
  max_students: null,
  max_staff: null,
  max_system_users: null,
  max_storage_gb: null,
  limits_notes: null,
  implementation_date: null,
  training_mode: null,
  special_requirements: null,
  additional_modules: null,
  important_terms: null,
  acceptance_notes: null,
  acceptance_confirmed: false,
  customer_signatory_name: null,
  customer_signatory_title: null,
  customer_signed_at: null,
  provider_signatory_name: null,
  provider_signatory_title: null,
  provider_signed_at: null,
  internal_notes: null,
};

function mapOrderFormToFormValues(orderForm: PlatformOrderForm): OrderFormFormValues {
  return {
    status: orderForm.status,
    form_number: orderForm.form_number,
    issue_date: orderForm.issue_date,
    currency: orderForm.currency,
    customer_organization_name: orderForm.customer_organization_name,
    customer_address: orderForm.customer_address,
    customer_contact_name: orderForm.customer_contact_name,
    customer_contact_title: orderForm.customer_contact_title,
    customer_email: orderForm.customer_email,
    customer_phone: orderForm.customer_phone,
    customer_whatsapp: orderForm.customer_whatsapp,
    customer_notes: orderForm.customer_notes,
    provider_organization_name: orderForm.provider_organization_name,
    provider_address: orderForm.provider_address,
    provider_contact_name: orderForm.provider_contact_name,
    provider_contact_title: orderForm.provider_contact_title,
    provider_email: orderForm.provider_email,
    provider_phone: orderForm.provider_phone,
    provider_website: orderForm.provider_website,
    provider_notes: orderForm.provider_notes,
    plan_id: orderForm.plan_id,
    plan_name_override: orderForm.plan_name_override,
    plan_description: orderForm.plan_description,
    billing_cycle: orderForm.billing_cycle,
    subscription_start_date: orderForm.subscription_start_date,
    subscription_end_date: orderForm.subscription_end_date,
    license_fee: orderForm.license_fee,
    maintenance_fee: orderForm.maintenance_fee,
    additional_services_fee: orderForm.additional_services_fee,
    tax_amount: orderForm.tax_amount,
    discount_name: orderForm.discount_name,
    discount_percentage: orderForm.discount_percentage,
    discount_amount: orderForm.discount_amount,
    payment_terms: orderForm.payment_terms,
    payment_notes: orderForm.payment_notes,
    max_students: orderForm.max_students,
    max_staff: orderForm.max_staff,
    max_system_users: orderForm.max_system_users,
    max_storage_gb: orderForm.max_storage_gb,
    limits_notes: orderForm.limits_notes,
    implementation_date: orderForm.implementation_date,
    training_mode: orderForm.training_mode,
    special_requirements: orderForm.special_requirements,
    additional_modules: orderForm.additional_modules,
    important_terms: orderForm.important_terms,
    acceptance_notes: orderForm.acceptance_notes,
    acceptance_confirmed: orderForm.acceptance_confirmed,
    customer_signatory_name: orderForm.customer_signatory_name,
    customer_signatory_title: orderForm.customer_signatory_title,
    customer_signed_at: orderForm.customer_signed_at,
    provider_signatory_name: orderForm.provider_signatory_name,
    provider_signatory_title: orderForm.provider_signatory_title,
    provider_signed_at: orderForm.provider_signed_at,
    internal_notes: orderForm.internal_notes,
  };
}

function buildPayload(values: OrderFormFormValues): Partial<PlatformOrderForm> {
  return {
    ...values,
    license_fee: values.license_fee ?? 0,
    maintenance_fee: values.maintenance_fee ?? 0,
    additional_services_fee: values.additional_services_fee ?? 0,
    tax_amount: values.tax_amount ?? 0,
    discount_amount: values.discount_amount ?? 0,
  };
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

export function OrganizationOrderFormPanel({
  organizationId,
  organizationName,
  plans = [],
  subscription = null,
  usage = {},
}: OrganizationOrderFormPanelProps) {
  const orderFormQuery = usePlatformOrganizationOrderForm(organizationId);
  const saveMutation = useSavePlatformOrganizationOrderForm();
  const downloadPdfMutation = useDownloadPlatformOrganizationOrderFormPdf();
  const uploadDocumentMutation = useUploadPlatformOrganizationOrderFormDocument();
  const downloadDocumentMutation = useDownloadPlatformOrganizationOrderFormDocument();
  const deleteDocumentMutation = useDeletePlatformOrganizationOrderFormDocument();

  const [uploadCategory, setUploadCategory] = useState<OrderFormDocumentCategory>('contract');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const form = useForm<OrderFormFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: orderFormFieldDefaults,
  });

  useEffect(() => {
    const data = orderFormQuery.data;
    if (!data) return;

    const orderFormData = data.order_form;
    const fromSubscription = data.from_subscription;

    if (orderFormData?.id) {
      form.reset(mapOrderFormToFormValues(orderFormData));
    } else if (fromSubscription) {
      form.reset(mapOrderFormToFormValues(fromSubscription));
    } else if (orderFormData) {
      form.reset(mapOrderFormToFormValues(orderFormData));
    }
  }, [form, orderFormQuery.data]);

  const orderForm = orderFormQuery.data?.order_form ?? null;
  const documents = orderFormQuery.data?.documents ?? [];
  const subscriptionContext = orderFormQuery.data?.subscription_context ?? null;
  const contractDocument = documents.find(
    (d: { document_category: string }) =>
      d.document_category === 'contract' || d.document_category === 'signed_contract'
  );
  const fromSubscription = orderFormQuery.data?.from_subscription ?? null;

  // Platform files: contract for this org (linked) or global contract template
  const { data: platformFilesForOrg } = useQuery({
    queryKey: ['platform-files-org-contract', organizationId],
    queryFn: async () => {
      const res = await platformApi.platformFiles.list({ organization_id: organizationId });
      return (res as { data?: PlatformFile[] }).data ?? [];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
  const platformContractForOrg = (platformFilesForOrg ?? []).find((f: PlatformFile) =>
    CONTRACT_PLATFORM_CATEGORIES.includes(f.category)
  );

  const { data: platformFilesAll } = useQuery({
    queryKey: ['platform-files-global-contract'],
    queryFn: async () => {
      const res = await platformApi.platformFiles.list();
      return (res as { data?: PlatformFile[] }).data ?? [];
    },
    enabled:
      !!organizationId &&
      !!orderFormQuery.data &&
      !contractDocument &&
      !platformContractForOrg,
    staleTime: 2 * 60 * 1000,
  });
  const platformContractGlobal = (platformFilesAll ?? []).find(
    (f: PlatformFile) =>
      !f.organization_id && CONTRACT_PLATFORM_CATEGORIES.includes(f.category)
  );

  const effectiveContract =
    contractDocument != null
      ? { type: 'order_form' as const, document: contractDocument }
      : platformContractForOrg != null
        ? { type: 'platform' as const, file: platformContractForOrg }
        : platformContractGlobal != null
          ? { type: 'platform' as const, file: platformContractGlobal }
          : null;

  const platformFileDownloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { blob, filename } = await platformApi.platformFiles.download(fileId);
      downloadBlob(blob, filename || 'contract');
      return filename;
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'Download failed');
    },
  });

  const currency = form.watch('currency');
  const planId = form.watch('plan_id');
  const licenseFee = form.watch('license_fee') ?? 0;
  const maintenanceFee = form.watch('maintenance_fee') ?? 0;
  const additionalServicesFee = form.watch('additional_services_fee') ?? 0;
  const taxAmount = form.watch('tax_amount') ?? 0;
  const discountPercentage = form.watch('discount_percentage');
  const manualDiscountAmount = form.watch('discount_amount') ?? 0;

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? subscription?.plan ?? null;
  const liveSubtotalForDiscount = licenseFee + additionalServicesFee + taxAmount;
  const calculatedDiscountAmount =
    manualDiscountAmount > 0
      ? manualDiscountAmount
      : discountPercentage !== null && discountPercentage !== undefined
        ? Number(((liveSubtotalForDiscount * discountPercentage) / 100).toFixed(2))
        : 0;
  const liveTotal = Math.max(liveSubtotalForDiscount - calculatedDiscountAmount, 0);
  const licensePaid = subscriptionContext?.license_paid ?? false;
  const remainingDueWhenLicensePaid = Math.max(liveTotal - licenseFee, 0);

  const handleApplyPlanDefaults = () => {
    if (!selectedPlan) {
      return;
    }

    form.setValue('plan_name_override', selectedPlan.name, { shouldDirty: true });
    form.setValue('plan_description', selectedPlan.description, { shouldDirty: true });
    form.setValue('billing_cycle', selectedPlan.billingPeriod ?? 'yearly', { shouldDirty: true });
    form.setValue(
      'license_fee',
      currency === 'USD' ? selectedPlan.licenseFeeUsd : selectedPlan.licenseFeeAfn,
      { shouldDirty: true }
    );
    form.setValue(
      'maintenance_fee',
      currency === 'USD' ? selectedPlan.maintenanceFeeUsd : selectedPlan.maintenanceFeeAfn,
      { shouldDirty: true }
    );

    const limitsFromUsage = getLimitsFromUsage(usage);
    const limitsFromPlan = selectedPlan.limits ?? {};
    form.setValue(
      'max_students',
      limitsFromUsage.students ?? getPlanLimit(limitsFromPlan, ['students', 'max_students']),
      { shouldDirty: true }
    );
    form.setValue(
      'max_staff',
      limitsFromUsage.staff ?? getPlanLimit(limitsFromPlan, ['staff', 'max_staff']),
      { shouldDirty: true }
    );
    form.setValue(
      'max_system_users',
      limitsFromUsage.system_users ??
        getPlanLimit(limitsFromPlan, ['system_users', 'users', 'max_system_users']),
      { shouldDirty: true }
    );
    form.setValue(
      'max_storage_gb',
      limitsFromUsage.storage_gb ?? getPlanLimit(limitsFromPlan, ['storage_gb', 'max_storage_gb', 'storage']),
      { shouldDirty: true }
    );

    const offer = selectedPlan.landingOffer;
    if (offer) {
      form.setValue('discount_name', offer.name ?? offer.code ?? 'Plan discount', { shouldDirty: true });
      if (offer.discountType === 'percentage') {
        form.setValue('discount_percentage', offer.discountValue, { shouldDirty: true });
        form.setValue('discount_amount', null, { shouldDirty: true });
      } else {
        const discountVal = currency === 'USD' ? offer.discountAmountUsd : offer.discountAmountAfn;
        if (typeof discountVal === 'number' && discountVal > 0) {
          form.setValue('discount_amount', discountVal, { shouldDirty: true });
          form.setValue('discount_percentage', null, { shouldDirty: true });
        }
      }
    }
  };

  const handleReset = () => {
    if (orderForm) {
      form.reset(mapOrderFormToFormValues(orderForm));
    } else {
      form.reset(orderFormFieldDefaults);
    }
  };

  const handleLoadFromSubscription = () => {
    if (fromSubscription) {
      form.reset(mapOrderFormToFormValues(fromSubscription));
    }
  };

  const handleUploadDocument = () => {
    if (!uploadFile) {
      return;
    }

    uploadDocumentMutation.mutate(
      {
        organizationId,
        file: uploadFile,
        documentCategory: uploadCategory,
        title: uploadTitle.trim() || undefined,
        notes: uploadNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setUploadFile(null);
          setUploadTitle('');
          setUploadNotes('');
          setUploadCategory('contract');
        },
      }
    );
  };

  if (orderFormQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[280px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading order form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orderFormQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Form</CardTitle>
          <CardDescription>Failed to load the organization order form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">
            {orderFormQuery.error instanceof Error
              ? orderFormQuery.error.message
              : 'Unknown error'}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => orderFormQuery.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">Order Form Workspace</CardTitle>
                <Badge variant="secondary">
                  {statusLabels[form.watch('status')]}
                </Badge>
              </div>
              <CardDescription className="max-w-3xl">
                Collect the organization-side subscription details, prepare the Pashto RTL order
                form, upload signed contracts and supporting files, then export the final PDF
                through the reporting renderer.
              </CardDescription>
              {organizationName ? (
                <div className="text-sm text-muted-foreground">
                  Organization: <span className="font-medium text-foreground">{organizationName}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {subscriptionContext?.license_paid && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  License paid
                  {subscriptionContext.license_paid_at && (
                    <span className="ml-1.5 opacity-90">
                      ({formatDate(new Date(subscriptionContext.license_paid_at))})
                    </span>
                  )}
                </Badge>
              )}
              {fromSubscription && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadFromSubscription}
                  disabled={saveMutation.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load from subscription
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saveMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadPdfMutation.mutate({
                    organizationId,
                    orderForm: buildPayload(form.getValues()),
                  })
                }
                disabled={downloadPdfMutation.isPending}
              >
                {downloadPdfMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">Download Order Form</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                title={
                  effectiveContract
                    ? 'Download contract'
                    : 'Upload a contract in Attachments below or add one in Platform Files'
                }
                onClick={() => {
                  if (!effectiveContract) return;
                  if (effectiveContract.type === 'order_form') {
                    downloadDocumentMutation.mutate({
                      organizationId,
                      documentId: effectiveContract.document.id,
                      fileName: effectiveContract.document.file_name,
                    });
                  } else {
                    platformFileDownloadMutation.mutate(effectiveContract.file.id);
                  }
                }}
                disabled={
                  !effectiveContract ||
                  downloadDocumentMutation.isPending ||
                  platformFileDownloadMutation.isPending
                }
              >
                {downloadDocumentMutation.isPending || platformFileDownloadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">Download Contract</span>
              </Button>
              <Button
                type="submit"
                form="organization-order-form"
                size="sm"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save order form
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={licensePaid ? 'Remaining due (one-time)' : 'Live total (one-time)'}
              value={formatCurrency(licensePaid ? remainingDueWhenLicensePaid : liveTotal, currency)}
              hint={
                licensePaid
                  ? 'License paid ✓ — extras + tax − discount'
                  : 'License + extras + tax − discount'
              }
            />
            <SummaryCard
              label="Saved total"
              value={formatCurrency(orderForm?.total_amount ?? 0, currency)}
              hint="Last saved on the backend"
            />
            <SummaryCard
              label="Plan"
              value={selectedPlan?.name ?? form.watch('plan_name_override') ?? 'Not selected'}
              hint={
                form.watch('billing_cycle')
                  ? billingCycleLabels[form.watch('billing_cycle') as OrderFormBillingCycle]
                  : 'No billing cycle'
              }
            />
            <SummaryCard
              label="Attachments"
              value={String(documents.length)}
              hint={
                orderForm?.updated_at
                  ? `Updated ${formatDate(new Date(orderForm.updated_at))}`
                  : 'Not saved yet'
              }
            />
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          id="organization-order-form"
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => {
            saveMutation.mutate(
              {
                organizationId,
                data: buildPayload(values),
              },
              {
                onSuccess: (response) => {
                  form.reset(mapOrderFormToFormValues(response.order_form));
                },
              }
            );
          })}
        >
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <SectionCard
                icon={FileText}
                title="Order details"
                description="Control the generated form number, status, currency, plan selection, and billing dates."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SelectField
                    control={form.control}
                    name="status"
                    label="Status"
                    options={ORDER_FORM_STATUSES.map((status) => ({
                      value: status,
                      label: statusLabels[status],
                    }))}
                  />
                  <TextField
                    control={form.control}
                    name="form_number"
                    label="Form number"
                    placeholder="NAZM-20260315"
                  />
                  <CalendarFormField
                    control={form.control}
                    name="issue_date"
                    label="Issue date"
                    placeholder="Select issue date"
                  />
                  <SelectField
                    control={form.control}
                    name="currency"
                    label="Currency"
                    options={[
                      { value: 'AFN', label: 'AFN' },
                      { value: 'USD', label: 'USD' },
                    ]}
                  />
                  <SelectField
                    control={form.control}
                    name="plan_id"
                    label="Platform plan"
                    placeholder="No plan selected"
                    clearable
                    options={plans.map((plan) => ({
                      value: plan.id,
                      label: `${plan.name} (${formatCurrency(
                        currency === 'USD' ? plan.totalFeeUsd : plan.totalFeeAfn,
                        currency
                      )})`,
                    }))}
                  />
                  <SelectField
                    control={form.control}
                    name="billing_cycle"
                    label="Billing cycle"
                    placeholder="Select billing cycle"
                    clearable
                    options={BILLING_CYCLES.map((cycle) => ({
                      value: cycle,
                      label: billingCycleLabels[cycle],
                    }))}
                  />
                  <CalendarFormField
                    control={form.control}
                    name="subscription_start_date"
                    label="Subscription start"
                    placeholder="Select start date"
                  />
                  <CalendarFormField
                    control={form.control}
                    name="subscription_end_date"
                    label="Subscription end"
                    placeholder="Select end date"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Plan defaults</div>
                    <p className="text-sm text-muted-foreground">
                      Pull in plan name, description, fees, billing cycle, and common limits from
                      the selected platform plan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPlanDefaults}
                    disabled={!selectedPlan}
                  >
                    Use selected plan defaults
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextField
                    control={form.control}
                    name="plan_name_override"
                    label="Display plan name"
                    placeholder="Plan name shown on the PDF"
                  />
                  <TextareaField
                    control={form.control}
                    name="plan_description"
                    label="Plan summary"
                    placeholder="Short description for the printed order form"
                    rows={4}
                  />
                </div>
              </SectionCard>
              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard
                  icon={Building2}
                  title="Customer details"
                  description="Organization-side information that appears in the Pashto contract form."
                >
                  <div className="grid gap-4">
                    <TextField
                      control={form.control}
                      name="customer_organization_name"
                      label="Organization name"
                      placeholder="Customer organization"
                    />
                    <TextareaField
                      control={form.control}
                      name="customer_address"
                      label="Address"
                      placeholder="Full organization address"
                      rows={3}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        control={form.control}
                        name="customer_contact_name"
                        label="Representative name"
                        placeholder="Contact person"
                      />
                      <TextField
                        control={form.control}
                        name="customer_contact_title"
                        label="Representative title"
                        placeholder="Principal, director, etc."
                      />
                      <TextField
                        control={form.control}
                        name="customer_email"
                        label="Email"
                        type="email"
                        placeholder="contact@example.com"
                        dir="ltr"
                      />
                      <TextField
                        control={form.control}
                        name="customer_phone"
                        label="Phone"
                        placeholder="+93..."
                        dir="ltr"
                      />
                      <TextField
                        control={form.control}
                        name="customer_whatsapp"
                        label="WhatsApp"
                        placeholder="+93..."
                        dir="ltr"
                      />
                    </div>
                    <TextareaField
                      control={form.control}
                      name="customer_notes"
                      label="Customer notes"
                      placeholder="Extra identity or contracting notes"
                      rows={4}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Users}
                  title="Provider details"
                  description="Nazim-side information for sales, support, and signatory details."
                >
                  <div className="grid gap-4">
                    <TextField
                      control={form.control}
                      name="provider_organization_name"
                      label="Provider name"
                      placeholder="Nazim provider entity"
                    />
                    <TextareaField
                      control={form.control}
                      name="provider_address"
                      label="Provider address"
                      placeholder="Provider legal address"
                      rows={3}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        control={form.control}
                        name="provider_contact_name"
                        label="Representative name"
                        placeholder="Provider representative"
                      />
                      <TextField
                        control={form.control}
                        name="provider_contact_title"
                        label="Representative title"
                        placeholder="Sales, partnership, etc."
                      />
                      <TextField
                        control={form.control}
                        name="provider_email"
                        label="Email"
                        type="email"
                        placeholder="support@nazim.cloud"
                        dir="ltr"
                      />
                      <TextField
                        control={form.control}
                        name="provider_phone"
                        label="Phone"
                        placeholder="078..."
                        dir="ltr"
                      />
                      <TextField
                        control={form.control}
                        name="provider_website"
                        label="Website"
                        placeholder="https://nazim.cloud"
                        dir="ltr"
                      />
                    </div>
                    <TextareaField
                      control={form.control}
                      name="provider_notes"
                      label="Provider notes"
                      placeholder="Optional provider-specific notes"
                      rows={4}
                    />
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                icon={FileText}
                title="Fees, discount, and payment terms"
                description="Capture the commercial terms exactly as they should appear on the order form."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <NumberField
                    control={form.control}
                    name="license_fee"
                    label={`License fee (${currency})`}
                    min={0}
                  />
                  <NumberField
                    control={form.control}
                    name="maintenance_fee"
                    label={`Yearly maintenance fee (${currency})`}
                    min={0}
                    description="Recurring annual fee, shown separately from total"
                  />
                  <NumberField
                    control={form.control}
                    name="additional_services_fee"
                    label={`Additional services (${currency})`}
                    min={0}
                  />
                  <NumberField
                    control={form.control}
                    name="tax_amount"
                    label={`Tax / legal costs (${currency})`}
                    min={0}
                  />
                  <TextField
                    control={form.control}
                    name="discount_name"
                    label="Discount label"
                    placeholder="Discount code or special pricing reason"
                  />
                  <NumberField
                    control={form.control}
                    name="discount_percentage"
                    label="Discount %"
                    min={0}
                    max={100}
                    step="0.01"
                  />
                  <NumberField
                    control={form.control}
                    name="discount_amount"
                    label={`Manual discount amount (${currency})`}
                    min={0}
                    step="0.01"
                    description="If set, this amount takes priority over the percentage."
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard
                    label="Subtotal (one-time)"
                    value={formatCurrency(liveSubtotalForDiscount, currency)}
                    hint="License + extras + tax"
                  />
                  <SummaryCard
                    label="Discount"
                    value={formatCurrency(calculatedDiscountAmount, currency)}
                    hint={discountPercentage ? `${discountPercentage}%` : 'No percentage applied'}
                  />
                  <SummaryCard
                    label={licensePaid ? 'Remaining due (one-time)' : 'Total due (one-time)'}
                    value={formatCurrency(licensePaid ? remainingDueWhenLicensePaid : liveTotal, currency)}
                    hint={
                      licensePaid
                        ? 'License paid ✓ — extras + tax − discount'
                        : 'License + extras + tax − discount'
                    }
                  />
                  <SummaryCard
                    label="Yearly maintenance (recurring)"
                    value={formatCurrency(maintenanceFee, currency)}
                    hint="Paid annually, not in total"
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextareaField
                    control={form.control}
                    name="payment_terms"
                    label="Payment terms"
                    placeholder="Invoice and payment deadline terms"
                    rows={4}
                  />
                  <TextareaField
                    control={form.control}
                    name="payment_notes"
                    label="Payment notes"
                    placeholder="Bank details, tax notes, or approvals"
                    rows={4}
                  />
                </div>
              </SectionCard>

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard
                  icon={Users}
                  title="Limits and provisioning"
                  description="Capture plan limits that should appear in the signed commercial record."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField
                      control={form.control}
                      name="max_students"
                      label="Max students"
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="max_staff"
                      label="Max staff"
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="max_system_users"
                      label="Max system users"
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="max_storage_gb"
                      label="Storage (GB)"
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <div className="mt-4">
                    <TextareaField
                      control={form.control}
                      name="limits_notes"
                      label="Limits notes"
                      placeholder="Clarify what these limits cover and any exceptions"
                      rows={4}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={FileText}
                  title="Implementation and requirements"
                  description="Track onboarding dates, training mode, add-on modules, and special delivery notes."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <CalendarFormField
                      control={form.control}
                      name="implementation_date"
                      label="Implementation target"
                      placeholder="Select implementation date"
                    />
                    <SelectField
                      control={form.control}
                      name="training_mode"
                      label="Initial training mode"
                      placeholder="Select training mode"
                      clearable
                      options={TRAINING_MODES.map((mode) => ({
                        value: mode,
                        label: trainingModeLabels[mode],
                      }))}
                    />
                  </div>
                  <div className="mt-4 space-y-4">
                    <TextareaField
                      control={form.control}
                      name="special_requirements"
                      label="Special requirements"
                      placeholder="Custom setup, migration, timeline, or onboarding needs"
                      rows={4}
                    />
                    <TextareaField
                      control={form.control}
                      name="additional_modules"
                      label="Additional modules"
                      placeholder="Extra modules, services, or deliverables"
                      rows={4}
                    />
                    <TextareaField
                      control={form.control}
                      name="important_terms"
                      label="Important terms"
                      placeholder="Any important commercial or legal notes"
                      rows={4}
                    />
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-muted">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Payments moved to Invoice</CardTitle>
                  <CardDescription className="hidden sm:block text-xs sm:text-sm">
                    Payment tracking for one-time fees is now managed through the Sales Invoice tab.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 text-sm text-muted-foreground">
                  Use the <strong>Invoice</strong> tab to record payments and download the invoice PDF.
                </CardContent>
              </Card>

              <SectionCard
                icon={FileText}
                title="Acceptance and signatures"
                description="Mark acceptance, capture both signatories, and prepare the signed PDF record."
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="acceptance_confirmed"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">Acceptance confirmed</FormLabel>
                            <FormDescription>
                              Mark this after both sides confirm the commercial terms.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <TextareaField
                    control={form.control}
                    name="acceptance_notes"
                    label="Acceptance notes"
                    placeholder="Short note about approvals, contract scope, or follow-up"
                    rows={4}
                  />

                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="text-sm font-semibold">Customer signatory</div>
                    <TextField
                      control={form.control}
                      name="customer_signatory_name"
                      label="Name"
                      placeholder="Customer signatory name"
                    />
                    <TextField
                      control={form.control}
                      name="customer_signatory_title"
                      label="Title"
                      placeholder="Customer signatory title"
                    />
                    <CalendarFormField
                      control={form.control}
                      name="customer_signed_at"
                      label="Signed date"
                      placeholder="Select signed date"
                    />
                  </div>

                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="text-sm font-semibold">Provider signatory</div>
                    <TextField
                      control={form.control}
                      name="provider_signatory_name"
                      label="Name"
                      placeholder="Provider signatory name"
                    />
                    <TextField
                      control={form.control}
                      name="provider_signatory_title"
                      label="Title"
                      placeholder="Provider signatory title"
                    />
                    <CalendarFormField
                      control={form.control}
                      name="provider_signed_at"
                      label="Signed date"
                      placeholder="Select signed date"
                    />
                  </div>

                  <TextareaField
                    control={form.control}
                    name="internal_notes"
                    label="Internal notes"
                    placeholder="Platform-side follow-up notes not necessarily intended for the customer"
                    rows={5}
                  />
                </div>
              </SectionCard>
              <SectionCard
                icon={Upload}
                title="Contract and signed files"
                description="Upload the contract, signed order form, signed contract, receipts, and any supporting documents."
              >
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order-form-document-category">Document category</Label>
                      <Select
                        value={uploadCategory}
                        onValueChange={(value) => setUploadCategory(value as OrderFormDocumentCategory)}
                      >
                        <SelectTrigger id="order-form-document-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {documentCategoryLabels[category]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="order-form-document-title">Title</Label>
                      <Input
                        id="order-form-document-title"
                        value={uploadTitle}
                        onChange={(event) => setUploadTitle(event.target.value)}
                        placeholder="Optional title shown in the document list"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="order-form-document-notes">Notes</Label>
                      <Textarea
                        id="order-form-document-notes"
                        value={uploadNotes}
                        onChange={(event) => setUploadNotes(event.target.value)}
                        rows={3}
                        placeholder="Describe what this file contains"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="order-form-document-file">File</Label>
                      <Input
                        id="order-form-document-file"
                        type="file"
                        onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleUploadDocument}
                    disabled={!uploadFile || uploadDocumentMutation.isPending}
                  >
                    {uploadDocumentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload document
                  </Button>

                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No documents uploaded yet. Add the contract, signed order form, signed
                        contract, or any supporting files here.
                      </div>
                    ) : (
                      documents.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-medium">{document.title}</div>
                                  <Badge variant="outline">
                                    {documentCategoryLabels[document.document_category]}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {document.file_name} • {formatFileSize(document.file_size)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    downloadDocumentMutation.mutate({
                                      organizationId,
                                      documentId: document.id,
                                      fileName: document.file_name,
                                    })
                                  }
                                  disabled={downloadDocumentMutation.isPending}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    deleteDocumentMutation.mutate({
                                      organizationId,
                                      documentId: document.id,
                                    })
                                  }
                                  disabled={deleteDocumentMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {document.notes ? (
                              <div className="text-sm text-muted-foreground">{document.notes}</div>
                            ) : null}
                            <div className="text-xs text-muted-foreground">
                              Uploaded {formatDateTime(document.created_at)}
                              {document.uploaded_by_name ? ` by ${document.uploaded_by_name}` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  dir = 'auto',
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  description?: string;
  type?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={(field.value as string | null | undefined) ?? ''}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder={placeholder}
              type={type}
              dir={dir}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextareaField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  rows = 4,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={(field.value as string | null | undefined) ?? ''}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder={placeholder}
              rows={rows}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  min,
  max,
  step = '1',
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={min}
              max={max}
              step={step}
              value={field.value === null || field.value === undefined ? '' : String(field.value)}
              onChange={(event) => {
                const nextValue = event.target.value;
                field.onChange(nextValue === '' ? null : Number(nextValue));
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  clearable = false,
  options,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  clearable?: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={(field.value as string | null | undefined) ?? (clearable ? NONE_VALUE : undefined)}
            onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {clearable ? <SelectItem value={NONE_VALUE}>None</SelectItem> : null}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function getPlanLimit(limits: Record<string, number>, keys: string[]): number | null {
  for (const key of keys) {
    const value = limits[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function getLimitsFromUsage(usage: Record<string, UsageInfo>): {
  students: number | null;
  staff: number | null;
  system_users: number | null;
  storage_gb: number | null;
} {
  const getLimit = (keys: string[]): number | null => {
    for (const key of keys) {
      const info = usage[key];
      if (info && typeof info.limit === 'number' && Number.isFinite(info.limit) && info.limit >= 0) {
        return info.limit;
      }
    }
    return null;
  };
  return {
    students: getLimit(['students', 'max_students']),
    staff: getLimit(['staff', 'max_staff']),
    system_users: getLimit(['system_users', 'users', 'max_system_users']),
    storage_gb: getLimit(['storage_gb', 'max_storage_gb', 'storage']),
  };
}

function formatCurrency(amount: number, currency: 'AFN' | 'USD') {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
