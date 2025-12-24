import type * as WatermarkApi from '@/types/api/watermark';
import type { Watermark, CreateWatermarkData, UpdateWatermarkData } from '@/types/domain/watermark';

/**
 * Convert API Watermark model to Domain Watermark model
 */
export function mapWatermarkApiToDomain(api: WatermarkApi.Watermark): Watermark {
  return {
    id: api.id,
    organizationId: api.organization_id,
    brandingId: api.branding_id,
    reportKey: api.report_key,
    type: api.wm_type,
    imageDataUri: api.image_data_uri || null,
    text: api.text,
    fontFamily: api.font_family,
    color: api.color,
    opacity: api.opacity,
    rotationDeg: api.rotation_deg,
    scale: api.scale,
    position: api.position,
    posX: api.pos_x,
    posY: api.pos_y,
    repeatPattern: api.repeat_pattern,
    sortOrder: api.sort_order,
    isActive: api.is_active,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

/**
 * Convert Domain Watermark model to API CreateWatermarkData payload
 */
export function mapWatermarkDomainToInsert(domain: CreateWatermarkData): WatermarkApi.CreateWatermarkData {
  return {
    branding_id: domain.brandingId,
    report_key: domain.reportKey ?? null,
    wm_type: domain.type,
    text: domain.text ?? null,
    font_family: domain.fontFamily ?? null,
    color: domain.color ?? '#000000',
    opacity: domain.opacity ?? 0.08,
    rotation_deg: domain.rotationDeg ?? 35,
    scale: domain.scale ?? 1.0,
    position: domain.position ?? 'center',
    pos_x: domain.posX ?? 50.0,
    pos_y: domain.posY ?? 50.0,
    repeat_pattern: domain.repeatPattern ?? 'none',
    sort_order: domain.sortOrder ?? 0,
    is_active: domain.isActive ?? true,
    image_binary: domain.imageBinary,
    image_mime: domain.imageMime ?? null,
  };
}

/**
 * Convert Domain Watermark model to API UpdateWatermarkData payload
 */
export function mapWatermarkDomainToUpdate(domain: UpdateWatermarkData): WatermarkApi.UpdateWatermarkData {
  const result: WatermarkApi.UpdateWatermarkData = {};

  if (domain.reportKey !== undefined) result.report_key = domain.reportKey ?? null;
  if (domain.type !== undefined) result.wm_type = domain.type;
  if (domain.text !== undefined) result.text = domain.text ?? null;
  if (domain.fontFamily !== undefined) result.font_family = domain.fontFamily ?? null;
  if (domain.color !== undefined) result.color = domain.color;
  if (domain.opacity !== undefined) result.opacity = domain.opacity;
  if (domain.rotationDeg !== undefined) result.rotation_deg = domain.rotationDeg;
  if (domain.scale !== undefined) result.scale = domain.scale;
  if (domain.position !== undefined) result.position = domain.position;
  if (domain.posX !== undefined) result.pos_x = domain.posX;
  if (domain.posY !== undefined) result.pos_y = domain.posY;
  if (domain.repeatPattern !== undefined) result.repeat_pattern = domain.repeatPattern;
  if (domain.sortOrder !== undefined) result.sort_order = domain.sortOrder;
  if (domain.isActive !== undefined) result.is_active = domain.isActive;
  if (domain.imageBinary !== undefined) result.image_binary = domain.imageBinary;
  if (domain.imageMime !== undefined) result.image_mime = domain.imageMime ?? null;

  return result;
}

