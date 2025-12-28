<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Student;
use App\Models\Staff;
use App\Models\Donor;
use App\Models\EventGuest;

class PhoneBookController extends Controller
{
    /**
     * Get phone book entries from all sources
     * 
     * Returns phone numbers from:
     * - Students (guardian_phone, emergency_contact_phone, zamin_phone)
     * - Staff (phone_number)
     * - Donors (phone)
     * - Event Guests (phone)
     * - Other members (if any)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Get category filter
        $category = $request->input('category', 'all'); // 'all', 'students', 'staff', 'donors', 'guests', 'others'
        $search = $request->input('search', '');

        // Check permissions for each category
        $hasStudentsPermission = false;
        $hasStaffPermission = false;
        $hasDonorsPermission = false;
        $hasGuestsPermission = false;

        try {
            $hasStudentsPermission = $user->hasPermissionTo('students.read');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for students.read: " . $e->getMessage());
        }

        try {
            $hasStaffPermission = $user->hasPermissionTo('staff.read');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for staff.read: " . $e->getMessage());
        }

        try {
            $hasDonorsPermission = $user->hasPermissionTo('donors.read');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for donors.read: " . $e->getMessage());
        }

        try {
            $hasGuestsPermission = $user->hasPermissionTo('event_guests.read');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for event_guests.read: " . $e->getMessage());
        }

        // If requesting specific category, check permission for that category
        if ($category === 'students' && !$hasStudentsPermission) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
        if ($category === 'staff' && !$hasStaffPermission) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
        if ($category === 'donors' && !$hasDonorsPermission) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
        if ($category === 'guests' && !$hasGuestsPermission) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // If requesting 'all', user must have at least one permission
        if ($category === 'all' && !$hasStudentsPermission && !$hasStaffPermission && !$hasDonorsPermission && !$hasGuestsPermission) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Build query for each category
        $entries = collect();

        // Students - Guardian Phone
        if (($category === 'all' || $category === 'students') && $hasStudentsPermission) {
            $studentQuery = Student::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('guardian_phone')
                ->where('guardian_phone', '!=', '');

            if ($search) {
                $studentQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('guardian_name', 'ilike', "%{$search}%")
                      ->orWhere('guardian_phone', 'ilike', "%{$search}%");
                });
            }

            $students = $studentQuery->get();
            foreach ($students as $student) {
                $entries->push([
                    'id' => $student->id,
                    'category' => 'student_guardian',
                    'name' => $student->guardian_name ?: $student->full_name . ' (Guardian)',
                    'phone' => $student->guardian_phone,
                    'email' => null,
                    'relation' => $student->guardian_relation ?? 'Guardian',
                    'student_name' => $student->full_name,
                    'admission_no' => $student->admission_no,
                    'address' => $student->home_address,
                ]);
            }

            // Students - Emergency Contact Phone
            $emergencyQuery = Student::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('emergency_contact_phone')
                ->where('emergency_contact_phone', '!=', '')
                ->where('emergency_contact_phone', '!=', DB::raw('guardian_phone')); // Avoid duplicates

            if ($search) {
                $emergencyQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('emergency_contact_name', 'ilike', "%{$search}%")
                      ->orWhere('emergency_contact_phone', 'ilike', "%{$search}%");
                });
            }

            $emergencyStudents = $emergencyQuery->get();
            foreach ($emergencyStudents as $student) {
                $entries->push([
                    'id' => $student->id,
                    'category' => 'student_emergency',
                    'name' => $student->emergency_contact_name ?: $student->full_name . ' (Emergency)',
                    'phone' => $student->emergency_contact_phone,
                    'email' => null,
                    'relation' => 'Emergency Contact',
                    'student_name' => $student->full_name,
                    'admission_no' => $student->admission_no,
                    'address' => $student->home_address,
                ]);
            }

            // Students - Zamin Phone
            $zaminQuery = Student::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('zamin_phone')
                ->where('zamin_phone', '!=', '');

            if ($search) {
                $zaminQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('zamin_name', 'ilike', "%{$search}%")
                      ->orWhere('zamin_phone', 'ilike', "%{$search}%");
                });
            }

            $zaminStudents = $zaminQuery->get();
            foreach ($zaminStudents as $student) {
                $entries->push([
                    'id' => $student->id,
                    'category' => 'student_zamin',
                    'name' => $student->zamin_name ?: $student->full_name . ' (Zamin)',
                    'phone' => $student->zamin_phone,
                    'email' => null,
                    'relation' => 'Zamin (Guarantor)',
                    'student_name' => $student->full_name,
                    'admission_no' => $student->admission_no,
                    'address' => $student->zamin_address,
                ]);
            }
        }

        // Staff
        if (($category === 'all' || $category === 'staff') && $hasStaffPermission) {
            $staffQuery = Staff::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('phone_number')
                ->where('phone_number', '!=', '');

            if ($search) {
                $staffQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('first_name', 'ilike', "%{$search}%")
                      ->orWhere('phone_number', 'ilike', "%{$search}%")
                      ->orWhere('employee_id', 'ilike', "%{$search}%");
                });
            }

            $staffMembers = $staffQuery->get();
            foreach ($staffMembers as $staff) {
                $entries->push([
                    'id' => $staff->id,
                    'category' => 'staff',
                    'name' => $staff->full_name,
                    'phone' => $staff->phone_number,
                    'email' => $staff->email,
                    'relation' => $staff->position ?? $staff->staff_type ?? 'Staff',
                    'employee_id' => $staff->employee_id,
                    'address' => $staff->home_address,
                ]);
            }
        }

        // Donors
        if (($category === 'all' || $category === 'donors') && $hasDonorsPermission) {
            $donorQuery = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('phone')
                ->where('phone', '!=', '');

            if ($search) {
                $donorQuery->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('phone', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%");
                });
            }

            $donors = $donorQuery->get();
            foreach ($donors as $donor) {
                $entries->push([
                    'id' => $donor->id,
                    'category' => 'donor',
                    'name' => $donor->name,
                    'phone' => $donor->phone,
                    'email' => $donor->email,
                    'relation' => $donor->type === 'organization' ? 'Organization' : 'Individual',
                    'contact_person' => $donor->contact_person,
                    'address' => $donor->address,
                ]);
            }
        }

        // Event Guests
        if (($category === 'all' || $category === 'guests') && $hasGuestsPermission) {
            $guestQuery = EventGuest::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNotNull('phone')
                ->where('phone', '!=', '');

            if ($search) {
                $guestQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('phone', 'ilike', "%{$search}%")
                      ->orWhere('guest_code', 'ilike', "%{$search}%");
                });
            }

            $guests = $guestQuery->get();
            foreach ($guests as $guest) {
                $entries->push([
                    'id' => $guest->id,
                    'category' => 'guest',
                    'name' => $guest->full_name,
                    'phone' => $guest->phone,
                    'email' => null,
                    'relation' => ucfirst($guest->guest_type ?? 'Guest'),
                    'guest_code' => $guest->guest_code,
                    'address' => null,
                ]);
            }
        }

        // Sort by name
        $entries = $entries->sortBy('name')->values();

        // Apply pagination
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25;
            }

            $currentPage = $request->input('page', 1);
            $total = $entries->count();
            $offset = ($currentPage - 1) * $perPage;
            $paginatedEntries = $entries->slice($offset, $perPage)->values();

            return response()->json([
                'data' => $paginatedEntries,
                'current_page' => (int)$currentPage,
                'per_page' => (int)$perPage,
                'total' => $total,
                'last_page' => (int)ceil($total / $perPage),
                'from' => $total > 0 ? $offset + 1 : null,
                'to' => $total > 0 ? min($offset + $perPage, $total) : null,
            ]);
        }

        // Return all results if no pagination
        return response()->json($entries->values());
    }
}

