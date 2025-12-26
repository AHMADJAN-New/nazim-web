<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StatsController extends Controller
{
    /**
     * Get students count
     * Scoped to user's organization and school if authenticated
     */
    public function studentsCount(Request $request)
    {
        try {
            // Check if table exists before querying
            if (!Schema::hasTable('students')) {
                return response()->json(['count' => 0]);
            }

            $query = DB::table('students')->whereNull('deleted_at');

            // If user is authenticated, scope by organization and school
            if ($request->user()) {
                $profile = DB::table('profiles')->where('id', $request->user()->id)->first();
                
                if ($profile && $profile->organization_id) {
                    $query->where('organization_id', $profile->organization_id);
                    
                    // Scope by school if available
                    $currentSchoolId = $request->get('current_school_id');
                    if ($currentSchoolId) {
                        $query->where('school_id', $currentSchoolId);
                    } elseif ($profile->default_school_id) {
                        $query->where('school_id', $profile->default_school_id);
                    }
                }
            }

            $count = $query->count();

            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            // Return 0 if table doesn't exist or query fails
            return response()->json(['count' => 0]);
        }
    }

    /**
     * Get staff count
     * Scoped to user's organization and school if authenticated
     */
    public function staffCount(Request $request)
    {
        try {
            // Check if table exists before querying
            if (!Schema::hasTable('staff')) {
                return response()->json(['count' => 0]);
            }

            $query = DB::table('staff')->whereNull('deleted_at');

            // If user is authenticated, scope by organization and school
            if ($request->user()) {
                $profile = DB::table('profiles')->where('id', $request->user()->id)->first();
                
                if ($profile && $profile->organization_id) {
                    $query->where('organization_id', $profile->organization_id);
                    
                    // Scope by school if available
                    $currentSchoolId = $request->get('current_school_id');
                    if ($currentSchoolId) {
                        $query->where('school_id', $currentSchoolId);
                    } elseif ($profile->default_school_id) {
                        $query->where('school_id', $profile->default_school_id);
                    }
                }
            }

            $count = $query->count();

            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            // Return 0 if table doesn't exist or query fails
            return response()->json(['count' => 0]);
        }
    }
}
