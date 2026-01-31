export type WebsiteAuditAction = 'created' | 'updated';

export interface WebsiteAuditLogEntry {
  id: string;
  action: WebsiteAuditAction;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  status?: string | null;
  actor_id: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  occurred_at: string;
}
