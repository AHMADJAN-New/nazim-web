---
name: Desktop License Generation System
overview: Create a platform admin page for generating Ed25519-signed licenses for the Nazim desktop application, with key management, license signing, verification, and repository features.
todos:
  - id: migrations
    content: Create database migrations for license_keys and desktop_licenses tables
    status: completed
  - id: models
    content: Create LicenseKey and DesktopLicense Eloquent models with encryption support
    status: completed
    dependencies:
      - migrations
  - id: service
    content: Create LicenseSigningService with Ed25519 key generation, signing, and verification
    status: completed
    dependencies:
      - models
  - id: controller
    content: Create DesktopLicenseController with all CRUD endpoints and file download
    status: completed
    dependencies:
      - service
  - id: routes
    content: Add platform admin routes for desktop license management
    status: completed
    dependencies:
      - controller
  - id: types
    content: Create TypeScript types and mappers for API and domain models
    status: completed
  - id: api-client
    content: Add desktop license methods to platformApi client
    status: completed
    dependencies:
      - types
  - id: hooks
    content: Create React hooks for license key and license management
    status: completed
    dependencies:
      - api-client
  - id: page-component
    content: Create DesktopLicenseGeneration page component with 4 tabs (Keys, Sign, Test, Repository)
    status: completed
    dependencies:
      - hooks
  - id: routing
    content: Register route in App.tsx and add to PlatformAdminLayout sidebar
    status: completed
    dependencies:
      - page-component
---

# Desktop License Generation System

## Overview

Create a web-based license generation system in the platform admin section that replicates the functionality of the Python `developer_license_manager.py` script. The system will generate Ed25519-signed licenses for the Nazim desktop application.

## Architecture

```javascript
Frontend (Platform Admin)
├── LicenseGenerationPage.tsx (main page with tabs)
│   ├── Keys Tab (generate, load, save keys)
│   ├── Sign License Tab (create signed licenses)
│   ├── Test License Tab (verify licenses)
│   └── Repository Tab (view saved keys/licenses)
└── platformApi.licenses.* (API client methods)

Backend (Laravel)
├── Migration: create_license_keys_table
├── Migration: create_desktop_licenses_table
├── Model: LicenseKey (Ed25519 key pairs)
├── Model: DesktopLicense (signed licenses)
├── Controller: DesktopLicenseController
├── Service: LicenseSigningService (Ed25519 operations)
└── Routes: /platform/desktop-licenses/*
```



## Database Schema

### license_keys Table

- `id` (UUID, primary key)
- `kid` (string, unique) - Key identifier (e.g., "root-v1", "root-v2")
- `private_key_encrypted` (text) - Encrypted private key (Laravel encryption)
- `public_key_b64` (string) - Base64 public key (for reference)
- `notes` (text, nullable) - Optional notes
- `created_at`, `updated_at`, `deleted_at`

### desktop_licenses Table

- `id` (UUID, primary key)
- `kid` (string) - Key ID used for signing
- `customer` (string) - Customer name
- `edition` (string) - License edition (Standard, Pro, Enterprise, Basic)
- `expires` (timestamp) - Expiration date
- `issued_at` (timestamp) - Issue date
- `validity_days` (integer) - Number of days the license is valid for (stored for reference)
- `seats` (integer) - Number of seats
- `notes` (text, nullable) - Optional notes
- `fingerprint_id` (string) - Hardware fingerprint ID
- `payload_b64` (text) - Base64 encoded payload
- `signature_b64` (text) - Base64 encoded signature
- `license_file_path` (string, nullable) - Path to saved .dat file
- `created_at`, `updated_at`, `deleted_at`

## Implementation Steps

### 1. Backend: Database Migrations

**File**: `backend/database/migrations/YYYY_MM_DD_HHMMSS_create_license_keys_table.php`

- Create `license_keys` table with UUID primary key
- Add indexes on `kid` and `deleted_at`
- No `organization_id` (platform-wide keys)

**File**: `backend/database/migrations/YYYY_MM_DD_HHMMSS_create_desktop_licenses_table.php`

- Create `desktop_licenses` table with UUID primary key
- Add `validity_days` integer field to store the number of days the license is valid for
- Add indexes on `kid`, `customer`, `fingerprint_id`, `expires`, `deleted_at`
- No `organization_id` (platform-wide licenses)

### 2. Backend: Models

**File**: `backend/app/Models/LicenseKey.php`

- Use UUID primary key
- Encrypt/decrypt `private_key_encrypted` using Laravel's `Crypt` facade
- Methods: `getPrivateKey()`, `getPublicKey()`, `encryptPrivateKey()`

**File**: `backend/app/Models/DesktopLicense.php`

- Use UUID primary key
- Relationships: `belongsTo(LicenseKey, 'kid', 'kid')`
- Methods: `getLicenseJson()`, `downloadAsDat()`

### 3. Backend: Service Layer

**File**: `backend/app/Services/LicenseSigningService.php`

- Use PHP's `sodium` extension for Ed25519 operations
- Methods:
- `generateKeyPair()`: Generate Ed25519 key pair
- `signLicense($payload, $privateKey)`: Sign license payload
- `verifyLicense($payload, $signature, $publicKey)`: Verify license signature
- `canonicalJson($data)`: Create deterministic JSON (sort keys, no whitespace)
- `validateFingerprint($fingerprintId)`: Validate fingerprint format (hex, 16 chars)

### 4. Backend: Controller

**File**: `backend/app/Http/Controllers/DesktopLicenseController.php`

- Protected by `platform.admin` middleware
- Clear team context: `setPermissionsTeamId(null)`
- Endpoints:
- `GET /platform/desktop-licenses/keys` - List all keys
- `POST /platform/desktop-licenses/keys` - Generate new key pair
- `GET /platform/desktop-licenses/keys/{id}` - Get key details
- `PUT /platform/desktop-licenses/keys/{id}` - Update key notes
- `DELETE /platform/desktop-licenses/keys/{id}` - Delete key
- `POST /platform/desktop-licenses/sign` - Sign a license
- `POST /platform/desktop-licenses/verify` - Verify a license
- `GET /platform/desktop-licenses` - List all licenses
- `GET /platform/desktop-licenses/{id}` - Get license details
- `GET /platform/desktop-licenses/{id}/download` - Download license as .dat file
- `DELETE /platform/desktop-licenses/{id}` - Delete license

### 5. Backend: Routes

**File**: `backend/routes/api.php`

- Add routes under `/platform/desktop-licenses/*` prefix
- Use `auth:sanctum` and `platform.admin` middleware

### 6. Frontend: Types

**File**: `frontend/src/types/api/desktopLicense.ts`

- `LicenseKey` interface (API response)
- `DesktopLicense` interface (API response)
- `GenerateKeyPairRequest`, `SignLicenseRequest`, `VerifyLicenseRequest`

**File**: `frontend/src/types/domain/desktopLicense.ts`

- Domain models with camelCase properties

**File**: `frontend/src/mappers/desktopLicenseMapper.ts`

- Map API ↔ Domain models

### 7. Frontend: API Client

**File**: `frontend/src/platform/lib/platformApi.ts`

- Add `desktopLicenses` section with all CRUD methods

### 8. Frontend: Hooks

**File**: `frontend/src/platform/hooks/useDesktopLicenses.tsx`

- `useLicenseKeys()` - List keys
- `useGenerateKeyPair()` - Generate new key pair
- `useSignLicense()` - Sign a license
- `useVerifyLicense()` - Verify a license
- `useDesktopLicenses()` - List licenses
- `useDownloadLicense()` - Download license file

### 9. Frontend: Main Page

**File**: `frontend/src/platform/pages/admin/DesktopLicenseGeneration.tsx`

- Use `usePlatformAdminPermissions()` for access control
- Tabs component with 4 tabs:

1. **Keys Tab**:

    - Generate new key pair button
    - Load keys from JSON file (file input)
    - Save keys to JSON file (download)
    - Table of saved keys (ID, KID, Created, Public Key preview, Notes)
    - Use selected key button
    - Update notes button

2. **Sign License Tab**:

    - Key selector (dropdown of available keys)
    - Customer name input
    - Edition selector (Standard, Pro, Enterprise, Basic)
    - Expires in days (number input, default 365)
    - Seats (number input, default 1)
    - Notes (textarea)
    - Fingerprint ID input (with validation)
    - Load fingerprint JSON button (file input)
    - Sign License button
    - Display signed license JSON (read-only textarea)
    - Download .dat file button

3. **Test License Tab**:

    - Load license file button (file input)
    - Verify button
    - Results display (valid/invalid, parsed fields)

4. **Repository Tab**:

    - Keys table (ID, Created, KID, Public Key preview, Notes)
    - Licenses table (ID, Created, Customer, Edition, Validity Days, Expires, Seats, Fingerprint ID)
    - View license JSON button
    - Export license button
    - Copy license JSON button

### 10. Frontend: Route Registration

**File**: `frontend/src/App.tsx`

- Add route: `<Route path="desktop-licenses" element={<DesktopLicenseGeneration />} />`

**File**: `frontend/src/components/LazyComponents.tsx`

- Add lazy import for `DesktopLicenseGeneration`

**File**: `frontend/src/platform/components/PlatformAdminLayout.tsx`

- Add navigation item for "Desktop Licenses" in sidebar

## Key Implementation Details

### Ed25519 Operations (PHP)

```php
// Generate key pair
$keyPair = sodium_crypto_sign_keypair();
$privateKey = sodium_crypto_sign_secretkey($keyPair);
$publicKey = sodium_crypto_sign_publickey($keyPair);

// Sign message
$signature = sodium_crypto_sign_detached($message, $privateKey);

// Verify signature
$valid = sodium_crypto_sign_verify_detached($signature, $message, $publicKey);
```



### License Payload Format

```json
{
  "kid": "root-v1",
  "customer": "School Name",
  "edition": "Pro",
  "expires": "2025-12-31T23:59:59Z",
  "issued_at": "2024-01-01T00:00:00Z",
  "seats": 5,
  "notes": "Optional notes",
  "fingerprint": {
    "fingerprint_id": "d915347b496bc42e"
  }
}
```



### Signed License Format

```json
{
  "payload": "base64_encoded_canonical_json",
  "signature": "base64_encoded_signature"
}
```



### Fingerprint Validation

- Format: Hexadecimal string
- Length: 16 characters (8 bytes)
- Pattern: `/^[0-9a-f]{16}$/i`

### File Downloads

- License files saved as `.dat` extension (contains JSON)
- Use Laravel's `Storage` facade for file storage
- Download endpoint returns file with proper headers

### Validity Days Storage

- When signing a license, store the `validity_days` value in the database
- Calculate `expires` from `issued_at + validity_days`
- Display `validity_days` in the Repository tab for easy reference
- Note: The license payload itself doesn't include `validity_days` (only `expires` and `issued_at`), but it's stored in the database for administrative purposes

## Security Considerations

1. **Private Key Encryption**: All private keys encrypted using Laravel's `Crypt::encrypt()`
2. **Access Control**: Only platform admins (`subscription.admin` permission) can access
3. **Key Rotation**: Support multiple keys with different `kid` values
4. **Fingerprint Validation**: Validate fingerprint format before signing
5. **No Organization Scoping**: Keys and licenses are platform-wide (no `organization_id`)

## Testing Checklist

- [ ] Generate new key pair
- [ ] Load keys from JSON file
- [ ] Save keys to JSON file
- [ ] Sign license with valid fingerprint
- [ ] Verify signed license
- [ ] Download license as .dat file
- [ ] View license repository
- [ ] Delete key (soft delete)
- [ ] Delete license (soft delete)
- [ ] Fingerprint validation (reject invalid formats)