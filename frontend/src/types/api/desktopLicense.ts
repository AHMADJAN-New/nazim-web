// API Types for Desktop License System

export interface LicenseKey {
  id: string;
  kid: string;
  private_key_encrypted: string; // Encrypted private key (not returned in API)
  public_key_b64: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DesktopLicense {
  id: string;
  kid: string;
  customer: string;
  edition: LicenseEdition;
  expires: string; // ISO timestamp
  issued_at: string; // ISO timestamp
  validity_days: number;
  seats: number;
  notes: string | null;
  fingerprint_id: string;
  payload_b64: string;
  signature_b64: string;
  license_file_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type LicenseEdition = 'Standard' | 'Pro' | 'Enterprise' | 'Basic';

// Request types
export interface GenerateKeyPairRequest {
  kid: string;
  notes?: string | null;
}

export interface SignLicenseRequest {
  kid: string;
  customer: string;
  edition: LicenseEdition;
  validity_days: number;
  seats: number;
  notes?: string | null;
  fingerprint_id: string;
}

export interface VerifyLicenseRequest {
  payload_b64: string;
  signature_b64: string;
  public_key_b64: string;
}

export interface UpdateKeyRequest {
  notes?: string | null;
}

// Response types
export interface SignedLicenseResponse {
  payload_b64: string;
  signature_b64: string;
  license_json: string; // Full license JSON for display
}

export interface VerifyLicenseResponse {
  valid: boolean;
  payload?: {
    kid: string;
    customer: string;
    edition: LicenseEdition;
    expires: string;
    issued_at: string;
    seats: number;
    notes?: string | null;
    fingerprint: {
      fingerprint_id: string;
    };
  };
  error?: string;
}

