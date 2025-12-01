<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StatsController extends Controller
{
    /**
     * Get students count
     */
    public function studentsCount()
    {
        try {
            // Check if table exists before querying
            if (!Schema::hasTable('students')) {
                return response()->json(['count' => 0]);
            }

            $count = DB::table('students')
                ->whereNull('deleted_at')
                ->count();

            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            // Return 0 if table doesn't exist or query fails
            return response()->json(['count' => 0]);
        }
    }

    /**
     * Get staff count
     */
    public function staffCount()
    {
        try {
            // Check if table exists before querying
            if (!Schema::hasTable('staff')) {
                return response()->json(['count' => 0]);
            }

            $count = DB::table('staff')
                ->whereNull('deleted_at')
                ->count();

            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            // Return 0 if table doesn't exist or query fails
            return response()->json(['count' => 0]);
        }
    }
}
