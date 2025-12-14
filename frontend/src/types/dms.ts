export interface IncomingDocument {
  id: string;
  full_indoc_number?: string | null;
  subject?: string | null;
  sender_org?: string | null;
  received_date?: string | null;
  status?: string | null;
  security_level_key?: string | null;
}

export interface OutgoingDocument {
  id: string;
  full_outdoc_number?: string | null;
  subject?: string | null;
  recipient_type?: string | null;
  issue_date?: string | null;
  status?: string | null;
  security_level_key?: string | null;
  pdf_path?: string | null;
  page_layout?: string | null;
}

export interface LetterTemplate {
  id: string;
  name: string;
  category: string;
  page_layout?: string;
  active?: boolean;
  default_security_level_key?: string;
}

export interface Letterhead {
  id: string;
  name: string;
  default_for_layout?: string | null;
  active?: boolean;
}

export interface DmsDashboardStats {
  incoming: { week: number; month: number };
  outgoing: { week: number; month: number };
  pending_routed: number;
  confidential_plus: number;
}
