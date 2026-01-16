/**
 * Desktop License Mapper
 * Converts between API (snake_case) and Domain (camelCase) desktop license types
 */

import type * as DesktopLicenseApi from '@/types/api/desktopLicense';
import type {
  LicenseKey,
  DesktopLicense,
  GenerateKeyPairRequest,
  SignLicenseRequest,
  VerifyLicenseRequest,
  UpdateKeyRequest,
  SignedLicenseResponse,
  VerifyLicenseResponse,
} from '@/types/domain/desktopLicense';

/**
 * Convert API LicenseKey model to Domain LicenseKey model
 */
export function mapLicenseKeyApiToDomain(api: DesktopLicenseApi.LicenseKey): LicenseKey {
  return {
    id: api.id,
    kid: api.kid,
    publicKeyB64: api.public_key_b64,
    notes: api.notes,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert API DesktopLicense model to Domain DesktopLicense model
 */
export function mapDesktopLicenseApiToDomain(api: DesktopLicenseApi.DesktopLicense): DesktopLicense {
  return {
    id: api.id,
    kid: api.kid,
    customer: api.customer,
    edition: api.edition,
    expires: api.expires ? new Date(api.expires) : new Date(),
    issuedAt: api.issued_at ? new Date(api.issued_at) : new Date(),
    validityDays: api.validity_days,
    seats: api.seats,
    notes: api.notes,
    fingerprintId: api.fingerprint_id,
    payloadB64: api.payload_b64,
    signatureB64: api.signature_b64,
    licenseFilePath: api.license_file_path,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain GenerateKeyPairRequest to API GenerateKeyPairRequest
 */
export function mapGenerateKeyPairRequestDomainToApi(
  domain: GenerateKeyPairRequest
): DesktopLicenseApi.GenerateKeyPairRequest {
  return {
    kid: domain.kid,
    notes: domain.notes ?? null,
  };
}

/**
 * Convert Domain SignLicenseRequest to API SignLicenseRequest
 */
export function mapSignLicenseRequestDomainToApi(
  domain: SignLicenseRequest
): DesktopLicenseApi.SignLicenseRequest {
  return {
    kid: domain.kid,
    customer: domain.customer,
    edition: domain.edition,
    validity_days: domain.validityDays,
    seats: domain.seats,
    notes: domain.notes ?? null,
    fingerprint_id: domain.fingerprintId,
  };
}

/**
 * Convert Domain VerifyLicenseRequest to API VerifyLicenseRequest
 */
export function mapVerifyLicenseRequestDomainToApi(
  domain: VerifyLicenseRequest
): DesktopLicenseApi.VerifyLicenseRequest {
  return {
    payload_b64: domain.payloadB64,
    signature_b64: domain.signatureB64,
    public_key_b64: domain.publicKeyB64,
  };
}

/**
 * Convert Domain UpdateKeyRequest to API UpdateKeyRequest
 */
export function mapUpdateKeyRequestDomainToApi(
  domain: UpdateKeyRequest
): DesktopLicenseApi.UpdateKeyRequest {
  return {
    notes: domain.notes ?? null,
  };
}

/**
 * Convert API SignedLicenseResponse to Domain SignedLicenseResponse
 */
export function mapSignedLicenseResponseApiToDomain(
  api: DesktopLicenseApi.SignedLicenseResponse
): SignedLicenseResponse {
  return {
    payloadB64: api.payload_b64,
    signatureB64: api.signature_b64,
    licenseJson: api.license_json,
  };
}

/**
 * Convert API VerifyLicenseResponse to Domain VerifyLicenseResponse
 */
export function mapVerifyLicenseResponseApiToDomain(
  api: DesktopLicenseApi.VerifyLicenseResponse
): VerifyLicenseResponse {
  return {
    valid: api.valid,
    payload: api.payload
      ? {
          kid: api.payload.kid,
          customer: api.payload.customer,
          edition: api.payload.edition,
          expires: api.payload.expires,
          issuedAt: api.payload.issued_at,
          seats: api.payload.seats,
          notes: api.payload.notes ?? null,
          fingerprint: {
            fingerprintId: api.payload.fingerprint.fingerprint_id,
          },
        }
      : undefined,
    error: api.error,
  };
}

