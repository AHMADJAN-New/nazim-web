<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\WebsiteDomain;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PlatformWebsiteDomainController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function index(Request $request, string $organizationId)
    {
        setPermissionsTeamId(null);

        $organization = Organization::whereNull('deleted_at')->findOrFail($organizationId);

        $query = WebsiteDomain::where('organization_id', $organization->id)
            ->whereNull('deleted_at');

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->school_id);
        }

        $domains = $query
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($domains);
    }

    public function store(Request $request, string $organizationId)
    {
        setPermissionsTeamId(null);

        $organization = Organization::whereNull('deleted_at')->findOrFail($organizationId);

        $data = $request->validate([
            'school_id' => 'required|uuid',
            'domain' => 'required|string|max:255|unique:website_domains,domain',
            'is_primary' => 'boolean',
            'verification_status' => 'nullable|string|max:30',
            'ssl_status' => 'nullable|string|max:30',
        ]);

        $school = SchoolBranding::where('organization_id', $organization->id)
            ->where('id', $data['school_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found for organization'], 422);
        }

        $domain = WebsiteDomain::create([
            'organization_id' => $organization->id,
            'school_id' => $data['school_id'],
            'domain' => strtolower($data['domain']),
            'is_primary' => $data['is_primary'] ?? false,
            'verification_status' => $data['verification_status'] ?? 'pending',
            'ssl_status' => $data['ssl_status'] ?? 'pending',
        ]);

        if ($domain->is_primary) {
            WebsiteDomain::where('organization_id', $organization->id)
                ->where('school_id', $domain->school_id)
                ->where('id', '!=', $domain->id)
                ->whereNull('deleted_at')
                ->update(['is_primary' => false]);
        }

        $this->clearPublicCaches($organization->id, $domain->school_id);

        return response()->json($domain, 201);
    }

    public function update(Request $request, string $organizationId, string $id)
    {
        setPermissionsTeamId(null);

        $organization = Organization::whereNull('deleted_at')->findOrFail($organizationId);

        $domain = WebsiteDomain::where('organization_id', $organization->id)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        $data = $request->validate([
            'school_id' => 'sometimes|required|uuid',
            'domain' => 'sometimes|required|string|max:255|unique:website_domains,domain,' . $domain->id,
            'is_primary' => 'boolean',
            'verification_status' => 'nullable|string|max:30',
            'ssl_status' => 'nullable|string|max:30',
        ]);

        if (isset($data['school_id'])) {
            $school = SchoolBranding::where('organization_id', $organization->id)
                ->where('id', $data['school_id'])
                ->whereNull('deleted_at')
                ->first();

            if (!$school) {
                return response()->json(['error' => 'School not found for organization'], 422);
            }
        }

        $domain->fill($data);
        if (isset($data['domain'])) {
            $domain->domain = strtolower($data['domain']);
        }
        $domain->save();

        if (!empty($data['is_primary'])) {
            WebsiteDomain::where('organization_id', $organization->id)
                ->where('school_id', $domain->school_id)
                ->where('id', '!=', $domain->id)
                ->whereNull('deleted_at')
                ->update(['is_primary' => false]);
        }

        $this->clearPublicCaches($organization->id, $domain->school_id);

        return response()->json($domain);
    }

    public function destroy(Request $request, string $organizationId, string $id)
    {
        setPermissionsTeamId(null);

        $organization = Organization::whereNull('deleted_at')->findOrFail($organizationId);

        $domain = WebsiteDomain::where('organization_id', $organization->id)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        $schoolId = $domain->school_id;
        $domain->delete();

        $this->clearPublicCaches($organization->id, $schoolId);

        return response()->noContent();
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
    }
}
