// Domain Types for Desktop License System

export interface LicenseKey {
  id: string;
  kid: string;
  publicKeyB64: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DesktopLicense {
  id: string;
  kid: string;
  customer: string;
  edition: LicenseEdition;
  expires: Date;
  issuedAt: Date;
  validityDays: number;
  seats: number;
  notes: string | null;
  fingerprintId: string;
  payloadB64: string;
  signatureB64: string;
  licenseFilePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  validityDays: number;
  seats: number;
  notes?: string | null;
  fingerprintId: string;
}

export interface VerifyLicenseRequest {
  payloadB64: string;
  signatureB64: string;
  publicKeyB64: string;
}

export interface UpdateKeyRequest {
  notes?: string | null;
}

// Response types
export interface SignedLicenseResponse {
  payloadB64: string;
  signatureB64: string;
  licenseJson: string; // Full license JSON for display
}

export interface VerifyLicenseResponse {
  valid: boolean;
  payload?: {
    kid: string;
    customer: string;
    edition: LicenseEdition;
    expires: string;
    issuedAt: string;
    seats: number;
    notes?: string | null;
    fingerprint: {
      fingerprintId: string;
    };
  };
  error?: string;
}

