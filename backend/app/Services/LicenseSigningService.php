<?php

namespace App\Services;

/**
 * Service for Ed25519 license signing and verification
 */
class LicenseSigningService
{
    /**
     * Check if sodium extension is available
     */
    public function isSodiumAvailable(): bool
    {
        return extension_loaded('sodium');
    }

    /**
     * Generate Ed25519 key pair
     *
     * @return array{privateKey: string, publicKey: string, keyPair: string}
     * @throws \RuntimeException If sodium extension is not available
     */
    public function generateKeyPair(): array
    {
        if (!$this->isSodiumAvailable()) {
            throw new \RuntimeException('PHP sodium extension is required for Ed25519 operations');
        }

        $keyPair = sodium_crypto_sign_keypair();
        $privateKey = sodium_crypto_sign_secretkey($keyPair);
        $publicKey = sodium_crypto_sign_publickey($keyPair);

        return [
            'privateKey' => $privateKey,
            'publicKey' => $publicKey,
            'keyPair' => $keyPair,
        ];
    }

    /**
     * Sign license payload with private key
     *
     * @param string $payload Canonical JSON payload
     * @param string $privateKey Private key (binary)
     * @return string Signature (binary)
     * @throws \RuntimeException If sodium extension is not available or signing fails
     */
    public function signLicense(string $payload, string $privateKey): string
    {
        if (!$this->isSodiumAvailable()) {
            throw new \RuntimeException('PHP sodium extension is required for Ed25519 operations');
        }

        try {
            $signature = sodium_crypto_sign_detached($payload, $privateKey);
            return $signature;
        } catch (\Exception $e) {
            throw new \RuntimeException('Failed to sign license: ' . $e->getMessage());
        }
    }

    /**
     * Verify license signature
     *
     * @param string $payload Canonical JSON payload
     * @param string $signature Signature (binary)
     * @param string $publicKey Public key (binary)
     * @return bool True if signature is valid
     * @throws \RuntimeException If sodium extension is not available
     */
    public function verifyLicense(string $payload, string $signature, string $publicKey): bool
    {
        if (!$this->isSodiumAvailable()) {
            throw new \RuntimeException('PHP sodium extension is required for Ed25519 operations');
        }

        try {
            return sodium_crypto_sign_verify_detached($signature, $payload, $publicKey);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Create canonical JSON (deterministic: sorted keys, no whitespace)
     *
     * @param array $data Data to encode
     * @return string Canonical JSON string
     */
    public function canonicalJson(array $data): string
    {
        // Sort keys recursively
        $sorted = $this->sortKeysRecursive($data);
        
        // Encode with no whitespace
        return json_encode($sorted, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Recursively sort array keys
     *
     * @param array $data Data to sort
     * @return array Sorted data
     */
    private function sortKeysRecursive(array $data): array
    {
        ksort($data);
        
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->sortKeysRecursive($value);
            }
        }
        
        return $data;
    }

    /**
     * Convert a 32-byte Ed25519 seed to a 64-byte secret key
     * 
     * Ed25519 keys can be stored as:
     * - 32-byte seed (needs conversion)
     * - 64-byte secret key (seed + public key, ready to use)
     * 
     * @param string $seed 32-byte seed
     * @param string $publicKey 32-byte public key (required to construct full secret key)
     * @return string 64-byte secret key
     * @throws \RuntimeException If sodium extension is not available or conversion fails
     */
    public function seedToSecretKey(string $seed, string $publicKey): string
    {
        if (!$this->isSodiumAvailable()) {
            throw new \RuntimeException('PHP sodium extension is required for Ed25519 operations');
        }

        if (strlen($seed) !== SODIUM_CRYPTO_SIGN_SEEDBYTES) {
            throw new \InvalidArgumentException('Seed must be exactly ' . SODIUM_CRYPTO_SIGN_SEEDBYTES . ' bytes');
        }

        if (strlen($publicKey) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
            throw new \InvalidArgumentException('Public key must be exactly ' . SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES . ' bytes');
        }

        // Derive keypair from seed
        $keyPair = sodium_crypto_sign_seed_keypair($seed);
        
        // Extract the 64-byte secret key
        $secretKey = sodium_crypto_sign_secretkey($keyPair);
        
        // Verify the public key matches
        $derivedPublicKey = sodium_crypto_sign_publickey($keyPair);
        if ($derivedPublicKey !== $publicKey) {
            throw new \RuntimeException('Public key does not match the seed');
        }

        return $secretKey;
    }

    /**
     * Validate fingerprint format
     *
     * @param string $fingerprintId Fingerprint ID to validate
     * @return bool True if valid
     */
    public function validateFingerprint(string $fingerprintId): bool
    {
        // Format: Hexadecimal string, 16 characters (8 bytes)
        // Pattern: /^[0-9a-f]{16}$/i
        return preg_match('/^[0-9a-f]{16}$/i', $fingerprintId) === 1;
    }

    /**
     * Decode base64 payload and return as array
     *
     * @param string $payloadB64 Base64 encoded payload
     * @return array Decoded payload
     * @throws \RuntimeException If decoding fails
     */
    public function decodePayload(string $payloadB64): array
    {
        $decoded = base64_decode($payloadB64, true);
        if ($decoded === false) {
            throw new \RuntimeException('Failed to decode base64 payload');
        }

        $json = json_decode($decoded, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Failed to decode JSON payload: ' . json_last_error_msg());
        }

        if (!is_array($json)) {
            throw new \RuntimeException('Payload is not an array');
        }

        return $json;
    }

    /**
     * Verify a complete license (payload + signature) with public key
     *
     * @param string $payloadB64 Base64 encoded payload
     * @param string $signatureB64 Base64 encoded signature
     * @param string $publicKeyB64 Base64 encoded public key
     * @return array{valid: bool, payload: array|null, error: string|null}
     */
    public function verifyCompleteLicense(string $payloadB64, string $signatureB64, string $publicKeyB64): array
    {
        try {
            // Decode base64 values
            $payload = base64_decode($payloadB64, true);
            $signature = base64_decode($signatureB64, true);
            $publicKey = base64_decode($publicKeyB64, true);

            if ($payload === false || $signature === false || $publicKey === false) {
                return [
                    'valid' => false,
                    'payload' => null,
                    'error' => 'Failed to decode base64 values',
                ];
            }

            // Verify signature
            $isValid = $this->verifyLicense($payload, $signature, $publicKey);

            if (!$isValid) {
                return [
                    'valid' => false,
                    'payload' => null,
                    'error' => 'Signature verification failed',
                ];
            }

            // Decode payload JSON
            $payloadData = $this->decodePayload($payloadB64);

            return [
                'valid' => true,
                'payload' => $payloadData,
                'error' => null,
            ];
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'payload' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}

