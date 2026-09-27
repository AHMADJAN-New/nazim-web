<?php

namespace App\Services\Library;

use Illuminate\Support\Facades\DB;

class LibraryBookNumberService
{
    /**
     * Next serial for a school. Counts every numeric book number, including
     * soft-deleted rows, so a number is not given out again.
     */
    public function nextNumber(string $organizationId, string $schoolId): string
    {
        $max = DB::table('library_books')
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereRaw("book_number ~ '^[0-9]+$'")
            ->max(DB::raw('book_number::bigint'));

        return (string) (((int) $max) + 1);
    }

    /**
     * Assign the next serial inside the caller's transaction.
     * The lock is released when that transaction commits or rolls back.
     */
    public function lockAndNext(string $organizationId, string $schoolId): string
    {
        $key = sprintf('%u', crc32($organizationId.'|'.$schoolId));
        DB::select('SELECT pg_advisory_xact_lock(?::bigint)', [$key]);

        return $this->nextNumber($organizationId, $schoolId);
    }
}
