// Building Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as BuildingApi from '@/types/api/building';
import type { Building } from '@/types/domain/building';

/**
 * Convert API Building model to Domain Building model
 */
export function mapBuildingApiToDomain(api: BuildingApi.Building): Building {
    return {
        id: api.id,
        buildingName: api.building_name,
        schoolId: api.school_id,
        organizationId: api.organization_id,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain Building model to API BuildingInsert payload
 */
export function mapBuildingDomainToInsert(domain: Partial<Building>): BuildingApi.BuildingInsert {
    return {
        building_name: domain.buildingName || '',
        school_id: domain.schoolId || '',
    };
}

/**
 * Convert Domain Building model to API BuildingUpdate payload
 */
export function mapBuildingDomainToUpdate(domain: Partial<Building>): BuildingApi.BuildingUpdate {
    return mapBuildingDomainToInsert(domain);
}
