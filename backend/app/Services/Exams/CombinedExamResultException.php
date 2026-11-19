<?php

namespace App\Services\Exams;

use RuntimeException;

/**
 * Scope rejection for a two-exam result card.
 * errorCode is a stable token the API returns as the error message.
 */
class CombinedExamResultException extends RuntimeException
{
    public function __construct(public readonly string $errorCode)
    {
        parent::__construct($errorCode);
    }
}
