<?php

namespace App\Http\Controllers;

use App\Models\LandingContact;
use App\Models\LandingPlanRequest;
use Illuminate\Http\Request;

class LandingController extends Controller
{
    public function submitContact(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'school_name' => 'nullable|string|max:255',
            'student_count' => 'nullable|integer|min:0',
            'message' => 'nullable|string|max:2000',
        ]);

        $contact = LandingContact::create($validated);

        return response()->json([
            'data' => [
                'id' => $contact->id,
            ],
        ]);
    }

    public function submitPlanRequest(Request $request)
    {
        $validated = $request->validate([
            'requested_plan_id' => 'nullable|uuid|exists:subscription_plans,id',
            'organization_name' => 'required|string|max:255',
            'school_name' => 'required|string|max:255',
            'school_page_url' => 'nullable|url|max:500',
            'contact_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'contact_position' => 'nullable|string|max:100',
            'number_of_schools' => 'nullable|integer|min:1',
            'student_count' => 'nullable|integer|min:0',
            'staff_count' => 'nullable|integer|min:0',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'message' => 'nullable|string|max:2000',
        ]);

        $requestEntry = LandingPlanRequest::create($validated);

        return response()->json([
            'data' => [
                'id' => $requestEntry->id,
            ],
        ]);
    }
}
