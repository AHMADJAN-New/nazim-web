export type WebsiteAuditAction = 'created' | 'updated';

export interface WebsiteAuditLogEntry {
  id: string;
  action: WebsiteAuditAction;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  status?: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail?: string | null;
  occurredAt: Date;
}
