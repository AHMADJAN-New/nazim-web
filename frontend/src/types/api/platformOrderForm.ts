export type OrderFormStatus = 'draft' | 'pending_review' | 'sent' | 'signed';
export type OrderFormBillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type OrderFormTrainingMode = 'in_person' | 'online' | 'hybrid';
export type OrderFormDocumentCategory =
  | 'signed_order_form'
  | 'contract'
  | 'signed_contract'
  | 'order_form_template'
  | 'identity_document'
  | 'payment_receipt'
  | 'supporting_document'
  | 'other';

export interface PlatformOrderForm {
  id: string | null;
  organization_id: string;
  subscription_id: string | null;
  plan_id: string | null;
  status: OrderFormStatus;
  form_number: string | null;
  issue_date: string | null;
  currency: 'AFN' | 'USD';
  customer_organization_name: string | null;
  customer_address: string | null;
  customer_contact_name: string | null;
  customer_contact_title: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  customer_notes: string | null;
  provider_organization_name: string | null;
  provider_address: string | null;
  provider_contact_name: string | null;
  provider_contact_title: string | null;
  provider_email: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  provider_notes: string | null;
  plan_name_override: string | null;
  plan_description: string | null;
  billing_cycle: OrderFormBillingCycle | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  license_fee: number;
  maintenance_fee: number;
  additional_services_fee: number;
  tax_amount: number;
  discount_name: string | null;
  discount_percentage: number | null;
  discount_amount: number;
  total_amount: number;
  payment_terms: string | null;
  payment_notes: string | null;
  max_students: number | null;
  max_staff: number | null;
  max_system_users: number | null;
  max_storage_gb: number | null;
  limits_notes: string | null;
  implementation_date: string | null;
  training_mode: OrderFormTrainingMode | null;
  special_requirements: string | null;
  additional_modules: string | null;
  important_terms: string | null;
  acceptance_notes: string | null;
  acceptance_confirmed: boolean;
  customer_signatory_name: string | null;
  customer_signatory_title: string | null;
  customer_signed_at: string | null;
  provider_signatory_name: string | null;
  provider_signatory_title: string | null;
  provider_signed_at: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformOrderFormDocument {
  id: string;
  document_category: OrderFormDocumentCategory;
  title: string;
  notes: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string | null;
}

export interface OrderFormSubscriptionContext {
  license_paid: boolean;
  license_paid_at: string | null;
  license_payment_amount: number | null;
  license_payment_currency: string | null;
}

export interface PlatformOrderFormResponse {
  order_form: PlatformOrderForm;
  documents: PlatformOrderFormDocument[];
  subscription_context?: OrderFormSubscriptionContext;
  from_subscription?: PlatformOrderForm | null;
}
