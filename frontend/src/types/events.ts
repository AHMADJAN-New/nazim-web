// Events & Guests Management Types

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type GuestType = 'student' | 'parent' | 'teacher' | 'staff' | 'vip' | 'external';
export type GuestStatus = 'invited' | 'checked_in' | 'blocked';
export type FieldType =
  | 'text'
  | 'textarea'
  | 'phone'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'toggle'
  | 'email'
  | 'id_number'
  | 'address'
  | 'photo'
  | 'file';

// Event Type (template for events)
export interface EventType {
  id: string;
  organization_id: string;
  school_id?: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  field_groups?: EventTypeFieldGroup[];
  fields?: EventTypeField[];
}

// Event Type Field Group (for organizing form fields)
export interface EventTypeFieldGroup {
  id: string;
  event_type_id: string;
  title: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  fields?: EventTypeField[];
}

// Event Type Field (dynamic form field definition)
export interface EventTypeField {
  id: string;
  event_type_id: string;
  field_group_id?: string | null;
  key: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  is_enabled: boolean;
  sort_order: number;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: FieldValidationRules | null;
  options?: FieldOption[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface FieldValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FieldOption {
  value: string;
  label: string;
}

// Event
export interface Event {
  id: string;
  organization_id: string;
  school_id: string;
  event_type_id?: string | null;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
  capacity?: number | null;
  status: EventStatus;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  event_type?: EventType | null;
  school?: { id: string; school_name: string } | null;
  creator?: { id: string; email: string } | null;
  // Aggregates
  total_invited?: number;
  total_arrived?: number;
  guest_count?: number;
}

// Event Guest
export interface EventGuest {
  id: string;
  event_id: string;
  organization_id: string;
  school_id: string;
  guest_code: string;
  guest_type: GuestType;
  full_name: string;
  phone?: string | null;
  invite_count: number;
  arrived_count: number;
  status: GuestStatus;
  photo_path?: string | null;
  photo_url?: string | null;
  photo_thumb_url?: string | null;
  qr_token: string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  field_values?: GuestFieldValue[];
  checkins?: EventCheckin[];
}

// Guest Field Value (dynamic field data)
export interface GuestFieldValue {
  field_id: string;
  field_key?: string;
  field_label?: string;
  field_type?: FieldType;
  field_group_id?: string | null;
  value: string | string[] | null;
}

// Event Check-in
export interface EventCheckin {
  id: string;
  event_id: string;
  guest_id: string;
  scanned_at: string;
  arrived_increment: number;
  device_id?: string | null;
  user_id: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Relationships
  guest?: EventGuest;
  user?: { id: string; email: string };
}

// API Request/Response Types

export interface CreateEventTypeRequest {
  name: string;
  school_id: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateEventTypeRequest {
  name?: string;
  description?: string;
  school_id?: string;
  is_active?: boolean;
}

export interface SaveFieldsRequest {
  field_groups: Omit<EventTypeFieldGroup, 'event_type_id' | 'created_at' | 'updated_at'>[];
  fields: Omit<EventTypeField, 'event_type_id' | 'created_at' | 'updated_at'>[];
}

export interface CreateEventRequest {
  title: string;
  school_id: string;
  event_type_id?: string;
  starts_at: string;
  ends_at?: string;
  venue?: string;
  capacity?: number;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  school_id?: string;
  event_type_id?: string;
  starts_at?: string;
  ends_at?: string;
  venue?: string;
  capacity?: number;
  status?: EventStatus;
}

export interface CreateGuestRequest {
  full_name: string;
  phone?: string;
  guest_type: GuestType;
  invite_count?: number;
  status?: GuestStatus;
  field_values?: { field_id: string; value: string | string[] | null }[];
}

export interface UpdateGuestRequest {
  full_name?: string;
  phone?: string;
  guest_type?: GuestType;
  invite_count?: number;
  status?: GuestStatus;
  field_values?: { field_id: string; value: string | string[] | null }[];
}

export interface CheckinRequest {
  qr_token?: string;
  guest_code?: string;
  arrived_increment?: number;
  device_id?: string;
  notes?: string;
  override_limit?: boolean;
}

export interface CheckinResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  guest?: {
    id: string;
    guest_code: string;
    full_name: string;
    guest_type: GuestType;
    invite_count: number;
    arrived_count: number;
    remaining: number;
    status: GuestStatus;
    photo_url?: string | null;
  };
  checkin?: {
    arrived_increment: number;
    scanned_at: string;
  };
}

export interface EventStats {
  totals: {
    guest_count: number;
    total_invited: number;
    total_arrived: number;
    invited_count: number;
    checked_in_count: number;
    blocked_count: number;
  };
  by_type: {
    guest_type: GuestType;
    count: number;
    invited: number;
    arrived: number;
  }[];
  capacity: number | null;
  remaining_capacity: number | null;
}

// Query/Filter Types

export interface EventsQuery {
  school_id?: string;
  status?: EventStatus;
  event_type_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface GuestsQuery {
  q?: string;
  status?: GuestStatus;
  guest_type?: GuestType;
  page?: number;
  per_page?: number;
  sort_by?: 'full_name' | 'guest_code' | 'created_at' | 'status' | 'arrived_count';
  sort_dir?: 'asc' | 'desc';
}

// Form Designer State Types

export interface FormDesignerState {
  eventType: EventType | null;
  fieldGroups: EventTypeFieldGroup[];
  fields: EventTypeField[];
  isDirty: boolean;
  selectedFieldId: string | null;
  selectedGroupId: string | null;
}

// Guest Type Labels (for UI)
export const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  staff: 'Staff',
  vip: 'VIP',
  external: 'External',
};

export const GUEST_TYPE_LABELS_FA: Record<GuestType, string> = {
  student: 'محصل',
  parent: 'ولی',
  teacher: 'استاد',
  staff: 'کارمند',
  vip: 'مهمان ویژه',
  external: 'مهمان خارجی',
};

// Status Labels
// Event User
export interface EventUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventUserRequest {
  email: string;
  full_name: string;
  phone?: string | null;
  password: string;
  permissions: string[];
}

export interface UpdateEventUserRequest {
  full_name?: string;
  phone?: string | null;
  password?: string;
  is_active?: boolean;
  permissions?: string[];
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  invited: 'Invited',
  checked_in: 'Checked In',
  blocked: 'Blocked',
};

// Field Type Labels
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  phone: 'Phone',
  number: 'Number',
  select: 'Dropdown',
  multiselect: 'Multi-select',
  date: 'Date',
  toggle: 'Toggle',
  email: 'Email',
  id_number: 'ID Number',
  address: 'Address',
  photo: 'Photo',
  file: 'File',
};
