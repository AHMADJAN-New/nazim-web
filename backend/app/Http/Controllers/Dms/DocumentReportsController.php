<?php

namespace App\Http\Controllers\Dms;

use App\Models\IncomingDocument;
use App\Models\OutgoingDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentReportsController extends BaseDmsController
{
    public function dashboard(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.reports.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $orgId = $profile->organization_id;
        $startOfWeek = now()->startOfWeek();
        $startOfMonth = now()->startOfMonth();

        return [
            'incoming' => [
                'week' => IncomingDocument::where('organization_id', $orgId)->whereDate('received_date', '>=', $startOfWeek)->count(),
                'month' => IncomingDocument::where('organization_id', $orgId)->whereDate('received_date', '>=', $startOfMonth)->count(),
            ],
            'outgoing' => [
                'week' => OutgoingDocument::where('organization_id', $orgId)->whereDate('issue_date', '>=', $startOfWeek)->count(),
                'month' => OutgoingDocument::where('organization_id', $orgId)->whereDate('issue_date', '>=', $startOfMonth)->count(),
            ],
            'pending_routed' => IncomingDocument::where('organization_id', $orgId)
                ->whereIn('status', ['pending', 'under_review'])
                ->count(),
            'confidential_plus' => IncomingDocument::where('organization_id', $orgId)
                ->whereIn('security_level_key', ['confidential', 'secret', 'top_secret'])
                ->count(),
        ];
    }

    public function distribution(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.reports.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $orgId = $profile->organization_id;

        $incomingByDepartment = IncomingDocument::select('routing_department_id', DB::raw('count(*) as total'))
            ->where('organization_id', $orgId)
            ->groupBy('routing_department_id')
            ->get();

        $outgoingByTemplate = OutgoingDocument::select(DB::raw("coalesce(outdoc_prefix, 'OUT') as template"), DB::raw('count(*) as total'))
            ->where('organization_id', $orgId)
            ->groupBy('template')
            ->get();

        $securityBreakdown = IncomingDocument::select('security_level_key', DB::raw('count(*) as total'))
            ->where('organization_id', $orgId)
            ->groupBy('security_level_key')
            ->get();

        $aging = IncomingDocument::select(DB::raw('status'), DB::raw('avg(extract(epoch from (now() - created_at))/86400) as average_days'))
            ->where('organization_id', $orgId)
            ->groupBy('status')
            ->get();

        return [
            'incoming_by_department' => $incomingByDepartment,
            'outgoing_by_template' => $outgoingByTemplate,
            'security_breakdown' => $securityBreakdown,
            'pending_aging' => $aging,
        ];
    }
}
