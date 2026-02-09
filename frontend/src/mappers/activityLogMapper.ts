import type * as ActivityLogApi from '@/types/api/activityLog';
import type {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogPagination,
} from '@/types/domain/activityLog';

/**
 * Map API ActivityLog to Domain ActivityLog
 */
export const mapActivityLogApiToDomain = (
  api: ActivityLogApi.ActivityLog
): ActivityLog => ({
  id: api.id,
  logName: api.log_name ?? null,
  description: api.description,
  subjectType: api.subject_type ?? null,
  subjectId: api.subject_id ?? null,
  event: api.event ?? null,
  causerType: api.causer_type ?? null,
  causerId: api.causer_id ?? null,
  // Use causer_name from top-level, fallback to causer.name if available
  causerName: api.causer_name ?? api.causer?.name ?? null,
  properties: api.properties ?? null,
  batchUuid: api.batch_uuid ?? null,
  organizationId: api.organization_id ?? null,
  schoolId: api.school_id ?? null,
  ipAddress: api.ip_address ?? null,
  userAgent: api.user_agent ?? null,
  requestMethod: api.request_method ?? null,
  route: api.route ?? null,
  statusCode: api.status_code ?? null,
  sessionId: api.session_id ?? null,
  requestId: api.request_id ?? null,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  causer: api.causer
    ? {
        id: api.causer.id,
        email: api.causer.email,
        name: api.causer.name,
      }
    : null,
  subject: api.subject
    ? {
        id: api.subject.id,
        ...api.subject,
      }
    : null,
});

/**
 * Map Domain filters to API filters
 */
export const mapFiltersToApi = (
  filters: ActivityLogFilters
): ActivityLogApi.ActivityLogFilters => ({
  log_name: filters.logName,
  event: filters.event,
  causer_id: filters.causerId,
  subject_id: filters.subjectId,
  start_date: filters.startDate,
  end_date: filters.endDate,
  search: filters.search,
  school_id: filters.schoolId,
  per_page: filters.perPage,
  page: filters.page,
});

/**
 * Map API pagination meta to Domain pagination
 */
export const mapPaginationApiToDomain = (
  api: ActivityLogApi.ActivityLogPaginatedResponse
): ActivityLogPagination => ({
  currentPage: api.meta.current_page,
  lastPage: api.meta.last_page,
  perPage: api.meta.per_page,
  total: api.meta.total,
  from: api.meta.from ?? null,
  to: api.meta.to ?? null,
});

/**
 * Map paginated API response to domain data and pagination
 */
export const mapPaginatedResponseToDomain = (
  api: ActivityLogApi.ActivityLogPaginatedResponse
): { data: ActivityLog[]; pagination: ActivityLogPagination } => ({
  data: api.data.map(mapActivityLogApiToDomain),
  pagination: mapPaginationApiToDomain(api),
});
