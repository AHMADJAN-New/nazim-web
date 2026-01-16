<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Crypt;

class LicenseKey extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'license_keys';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'kid',
        'private_key_encrypted',
        'public_key_b64',
        'notes',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the decrypted private key
     */
    public function getPrivateKey(): string
    {
        if (empty($this->private_key_encrypted)) {
            return '';
        }

        try {
            return Crypt::decryptString($this->private_key_encrypted);
        } catch (\Exception $e) {
            throw new \RuntimeException('Failed to decrypt private key: ' . $e->getMessage());
        }
    }

    /**
     * Get the public key (base64 decoded)
     */
    public function getPublicKey(): string
    {
        if (empty($this->public_key_b64)) {
            return '';
        }

        return base64_decode($this->public_key_b64, true);
    }

    /**
     * Set the private key (encrypts before storing)
     */
    public function setPrivateKey(string $privateKey): void
    {
        $this->private_key_encrypted = Crypt::encryptString($privateKey);
    }

    /**
     * Set the public key (stores as base64)
     */
    public function setPublicKey(string $publicKey): void
    {
        $this->public_key_b64 = base64_encode($publicKey);
    }

    /**
     * Encrypt private key and store
     */
    public function encryptPrivateKey(string $privateKey): void
    {
        $this->setPrivateKey($privateKey);
    }
}

