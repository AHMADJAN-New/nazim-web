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
        [$user, $profile, $schoolIds] = $context;

        $term = $request->input('q');
        if (!$term) {
            return [];
        }

        $clearanceRank = $this->userClearanceRank($user, $profile->organization_id);

        $incoming = IncomingDocument::where('organization_id', $profile->organization_id)
            ->when(!empty($schoolIds), function ($q) use ($schoolIds) {
                $q->where(function ($nested) use ($schoolIds) {
                    $nested->whereIn('school_id', $schoolIds)->orWhereNull('school_id');
                });
            })
            ->where(function ($q) use ($clearanceRank, $profile) {
                $q->whereNull('security_level_key')
                    ->orWhereExists(function ($sub) use ($clearanceRank, $profile) {
                        $sub->select(DB::raw(1))
                            ->from('security_levels')
                            ->whereColumn('security_levels.key', 'incoming_documents.security_level_key')
                            ->where('security_levels.organization_id', $profile->organization_id)
                            ->whereRaw('? >= security_levels.rank', [$clearanceRank]);
                    });
            })
            ->where(function ($q) use ($term) {
                $q->where('full_indoc_number', 'ilike', "%{$term}%")
                    ->orWhere('subject', 'ilike', "%{$term}%")
                    ->orWhere('sender_org', 'ilike', "%{$term}%");
            })
            ->limit(10)
            ->get(['id', 'full_indoc_number as reference', 'subject', 'received_date', 'security_level_key', 'status']);

        $outgoing = OutgoingDocument::where('organization_id', $profile->organization_id)
            ->when(!empty($schoolIds), function ($q) use ($schoolIds) {
                $q->where(function ($nested) use ($schoolIds) {
                    $nested->whereIn('school_id', $schoolIds)->orWhereNull('school_id');
                });
            })
            ->where(function ($q) use ($clearanceRank, $profile) {
                $q->whereNull('security_level_key')
                    ->orWhereExists(function ($sub) use ($clearanceRank, $profile) {
                        $sub->select(DB::raw(1))
                            ->from('security_levels')
                            ->whereColumn('security_levels.key', 'outgoing_documents.security_level_key')
                            ->where('security_levels.organization_id', $profile->organization_id)
                            ->whereRaw('? >= security_levels.rank', [$clearanceRank]);
                    });
            })
            ->where(function ($q) use ($term) {
                $q->where('full_outdoc_number', 'ilike', "%{$term}%")
                    ->orWhere('subject', 'ilike', "%{$term}%")
                    ->orWhere('recipient_address', 'ilike', "%{$term}%");
            })
            ->limit(10)
            ->get(['id', 'full_outdoc_number as reference', 'subject', 'issue_date', 'security_level_key', 'status']);

        return [
            'incoming' => $incoming,
            'outgoing' => $outgoing,
        ];
    }
}
