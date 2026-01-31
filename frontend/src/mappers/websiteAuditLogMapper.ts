import type { WebsiteAuditLogEntry as WebsiteAuditLogApi } from '@/types/api/websiteAuditLog';
import type { WebsiteAuditLogEntry } from '@/types/domain/websiteAuditLog';

export const mapWebsiteAuditLogApiToDomain = (log: WebsiteAuditLogApi): WebsiteAuditLogEntry => ({
  id: log.id,
  action: log.action,
  entityType: log.entity_type,
  entityId: log.entity_id,
  entityTitle: log.entity_title ?? null,
  status: log.status ?? null,
  actorId: log.actor_id ?? null,
  actorName: log.actor_name ?? null,
  actorEmail: log.actor_email ?? null,
  occurredAt: new Date(log.occurred_at),
});
