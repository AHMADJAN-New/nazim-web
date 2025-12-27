<?php

namespace App\Http\Controllers\Dms;

use App\Models\IncomingDocument;
use App\Models\OutgoingDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArchiveSearchController extends BaseDmsController
{
    public function __invoke(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.archive.search');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $currentSchoolId] = $context;

        $clearanceRank = $this->userClearanceRank($user, $profile->organization_id);

        // Get search term (optional - if not provided, return all documents)
        $term = $request->input('q', '');

        // Build incoming documents query
        $incomingQuery = IncomingDocument::query()
            ->with(['routingDepartment', 'academicYear'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where(function ($q) use ($clearanceRank, $profile) {
                $q->whereNull('security_level_key')
                    ->orWhereExists(function ($sub) use ($clearanceRank, $profile) {
                        $sub->select(DB::raw(1))
                            ->from('security_levels')
                            ->whereColumn('security_levels.key', 'incoming_documents.security_level_key')
                            ->where('security_levels.organization_id', $profile->organization_id)
                            ->whereRaw('? >= security_levels.rank', [$clearanceRank]);
                    });
            });

        // Build outgoing documents query
        $outgoingQuery = OutgoingDocument::query()
            ->with(['academicYear'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where(function ($q) use ($clearanceRank, $profile) {
                $q->whereNull('security_level_key')
                    ->orWhereExists(function ($sub) use ($clearanceRank, $profile) {
                        $sub->select(DB::raw(1))
                            ->from('security_levels')
                            ->whereColumn('security_levels.key', 'outgoing_documents.security_level_key')
                            ->where('security_levels.organization_id', $profile->organization_id)
                            ->whereRaw('? >= security_levels.rank', [$clearanceRank]);
                    });
            });

        // Apply search term (if provided)
        if (!empty($term)) {
            $incomingQuery->where(function ($q) use ($term) {
                $q->where('full_indoc_number', 'ilike', "%{$term}%")
                    ->orWhere('subject', 'ilike', "%{$term}%")
                    ->orWhere('sender_org', 'ilike', "%{$term}%")
                    ->orWhere('sender_name', 'ilike', "%{$term}%")
                    ->orWhere('external_doc_number', 'ilike', "%{$term}%")
                    ->orWhere('description', 'ilike', "%{$term}%")
                    ->orWhere('notes', 'ilike', "%{$term}%");
            });

            $outgoingQuery->where(function ($q) use ($term) {
                $q->where('full_outdoc_number', 'ilike', "%{$term}%")
                    ->orWhere('subject', 'ilike', "%{$term}%")
                    ->orWhere('description', 'ilike', "%{$term}%")
                    ->orWhere('body_html', 'ilike', "%{$term}%")
                    ->orWhere('external_doc_number', 'ilike', "%{$term}%");
            });
        }

        // Apply filters
        if ($request->filled('document_type')) {
            $docType = $request->input('document_type');
            if ($docType === 'incoming') {
                $outgoingQuery->whereRaw('1 = 0'); // Exclude outgoing
            } elseif ($docType === 'outgoing') {
                $incomingQuery->whereRaw('1 = 0'); // Exclude incoming
            }
        }

        if ($request->filled('status')) {
            $incomingQuery->where('status', $request->input('status'));
            $outgoingQuery->where('status', $request->input('status'));
        }

        if ($request->filled('security_level_key')) {
            $incomingQuery->where('security_level_key', $request->input('security_level_key'));
            $outgoingQuery->where('security_level_key', $request->input('security_level_key'));
        }

        if ($request->filled('academic_year_id')) {
            $incomingQuery->where('academic_year_id', $request->input('academic_year_id'));
            $outgoingQuery->where('academic_year_id', $request->input('academic_year_id'));
        }

        if ($request->filled('from_date')) {
            $incomingQuery->whereDate('received_date', '>=', $request->input('from_date'));
            $outgoingQuery->whereDate('issue_date', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $incomingQuery->whereDate('received_date', '<=', $request->input('to_date'));
            $outgoingQuery->whereDate('issue_date', '<=', $request->input('to_date'));
        }

        // Order and paginate
        $incomingQuery->orderByDesc('received_date')->orderByDesc('created_at');
        $outgoingQuery->orderByDesc('issue_date')->orderByDesc('created_at');

        $perPage = min(50, $request->integer('per_page', 20));
        $incomingPage = $request->integer('incoming_page', 1);
        $outgoingPage = $request->integer('outgoing_page', 1);

        $incoming = $incomingQuery->paginate($perPage, ['*'], 'incoming_page', $incomingPage);
        $outgoing = $outgoingQuery->paginate($perPage, ['*'], 'outgoing_page', $outgoingPage);

        return [
            'incoming' => [
                'data' => $incoming->items(),
                'meta' => [
                    'current_page' => $incoming->currentPage(),
                    'last_page' => $incoming->lastPage(),
                    'per_page' => $incoming->perPage(),
                    'total' => $incoming->total(),
                    'from' => $incoming->firstItem(),
                    'to' => $incoming->lastItem(),
                ],
            ],
            'outgoing' => [
                'data' => $outgoing->items(),
                'meta' => [
                    'current_page' => $outgoing->currentPage(),
                    'last_page' => $outgoing->lastPage(),
                    'per_page' => $outgoing->perPage(),
                    'total' => $outgoing->total(),
                    'from' => $outgoing->firstItem(),
                    'to' => $outgoing->lastItem(),
                ],
            ],
        ];
    }
}
