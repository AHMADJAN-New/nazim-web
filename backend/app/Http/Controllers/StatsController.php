<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * Get students count
     */
    public function studentsCount()
    {
        $count = DB::table('students')
            ->whereNull('deleted_at')
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Get staff count
     */
    public function staffCount()
    {
        $count = DB::table('staff')
            ->whereNull('deleted_at')
            ->count();

        return response()->json(['count' => $count]);
    }
}
