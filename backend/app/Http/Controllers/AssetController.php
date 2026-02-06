<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\StoreAssetAssignmentRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetCopy;
use App\Models\AssetHistory;
use App\Models\AssetMaintenanceRecord;
use App\Services\ActivityLogService;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssetController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService,
        private NotificationService $notificationService
    ) {
    }
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::index - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $orgId = $profile->organization_id;

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasTotalCopiesColumn = Schema::hasColumn('assets', 'total_copies');

        $withRelations = [
            'building',
            'room',
            'school',
            'category',
            'currency',
            'financeAccount',
            'activeAssignment',
            'assignments' => function ($q) {
                $q->orderByDesc('assigned_on');
            },
            'maintenanceRecords' => function ($q) {
                $q->orderByDesc('performed_on');
            },
        ];

        if ($hasCopiesTable) {
            $withRelations[] = 'copies';
        }

        $query = Asset::with($withRelations)
            ->withCount([
                'maintenanceRecords as maintenance_events_count',
            ]);

        if ($hasCopiesTable) {
            $query->withCount([
                'copies as total_copies_count',
            ])
            ->withCount([
                'copies as available_copies_count' => function ($q) {
                    $q->where('status', 'available')->whereNull('deleted_at');
                },
            ]);
        } else if ($hasTotalCopiesColumn) {
            // If total_copies column exists but copies table doesn't, use the column directly
            $query->addSelect(DB::raw('COALESCE(total_copies, 1) as total_copies_count'))
                  ->addSelect(DB::raw('COALESCE(total_copies, 1) as available_copies_count'));
        } else {
            // Default to 1 copy if neither exists
            $query->addSelect(DB::raw('1 as total_copies_count'))
                  ->addSelect(DB::raw('1 as available_copies_count'));
        }

        $query->withSum('maintenanceRecords as maintenance_cost_total', 'cost')
            ->where('organization_id', $orgId)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('status')) {
            $statuses = is_array($request->status) ? $request->status : [$request->status];
            $query->whereIn('status', $statuses);
        }

        if ($request->filled('building_id')) {
            $query->where('building_id', $request->building_id);
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(asset_tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(category) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int) $perPage, $allowedPerPage, true)) {
                $perPage = 25;
            }

            $assets = $query->orderByDesc('created_at')->paginate((int) $perPage);
            return response()->json($assets);
        }

        $assets = $query->orderByDesc('created_at')->get();
        return response()->json($assets);
    }

    public function store(StoreAssetRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::store - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.create',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();
        $data['organization_id'] = $profile->organization_id;
        // Strict school scoping: force school_id from middleware, never trust client input
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $data['school_id'] = $currentSchoolId;

        // Validate and set currency_id and finance_account_id
        if (isset($data['finance_account_id']) && $data['finance_account_id']) {
            // Validate finance account belongs to organization
            $account = DB::table('finance_accounts')
                ->where('id', $data['finance_account_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$account) {
                return response()->json(['error' => 'Finance account not found for this school'], 422);
            }

            // If currency_id not provided but account has currency, use account's currency
            if (!isset($data['currency_id']) || !$data['currency_id']) {
                if ($account->currency_id) {
                    $data['currency_id'] = $account->currency_id;
                }
            }
        }

        // Validate currency_id belongs to organization
        if (isset($data['currency_id']) && $data['currency_id']) {
            $currency = DB::table('currencies')
                ->where('id', $data['currency_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$currency) {
                return response()->json(['error' => 'Currency not found for this school'], 422);
            }
        }

        $locationValidation = $this->validateLocationWithDetails($data, $profile->organization_id, $currentSchoolId);
        if (!$locationValidation['valid']) {
            return response()->json(['error' => $locationValidation['message'] ?? 'Invalid building or room for organization'], 422);
        }

        $assetTagExists = DB::table('assets')
            ->where('asset_tag', $data['asset_tag'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->exists();

        if ($assetTagExists) {
            return response()->json(['error' => 'Asset tag must be unique per school'], 422);
        }

        // Get total_copies from request, default to 1
        $totalCopies = isset($data['total_copies']) && $data['total_copies'] > 0 ? (int) $data['total_copies'] : 1;
        
        $hasTotalCopiesColumn = Schema::hasColumn('assets', 'total_copies');
        if ($hasTotalCopiesColumn) {
            $data['total_copies'] = $totalCopies;
        }

        $asset = Asset::create($data);

        // Create asset copies if table exists
        $hasCopiesTable = Schema::hasTable('asset_copies');
        if ($hasCopiesTable) {
            $copies = [];
            for ($i = 1; $i <= $totalCopies; $i++) {
                $copyCode = $totalCopies > 1 ? $data['asset_tag'] . '-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT) : null;
                $copyPayload = [
                    'asset_id' => $asset->id,
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'copy_code' => $copyCode,
                    'status' => 'available',
                    'acquired_at' => $data['purchase_date'] ?? now()->toDateString(),
                ];
                // Backward compatibility if schema isn't migrated yet
                if (!Schema::hasColumn('asset_copies', 'school_id')) {
                    unset($copyPayload['school_id']);
                }
                $copies[] = AssetCopy::create($copyPayload);
            }
        }

        // Automatically set initial status based on copies
        self::updateAssetStatus($asset, $profile->organization_id);

        self::recordHistory($asset->id, $profile->organization_id, $currentSchoolId, 'created', 'Asset created', [
            'created_by' => $user->id,
            'total_copies' => $totalCopies,
        ]);

        $loadRelations = ['building', 'room', 'school', 'category', 'currency', 'financeAccount', 'activeAssignment'];
        if (Schema::hasTable('asset_copies')) {
            $loadRelations[] = 'copies';
        }

        // Log asset creation
        try {
            $categoryName = $asset->category?->name ?? 'Uncategorized';
            $this->activityLogService->logCreate(
                subject: $asset,
                description: "Created asset: {$asset->name} ({$asset->asset_tag}) in category {$categoryName}",
                properties: [
                    'asset_id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'category_id' => $asset->category_id,
                    'total_copies' => $totalCopies,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log asset creation: ' . $e->getMessage());
        }

        return response()->json($asset->load($loadRelations), 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::show - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasTotalCopiesColumn = Schema::hasColumn('assets', 'total_copies');

        $withRelations = [
            'building',
            'room',
            'school',
            'category',
            'currency',
            'financeAccount',
            'activeAssignment',
            'assignments' => function ($query) {
                $query->orderByDesc('assigned_on');
            },
            'maintenanceRecords' => function ($query) {
                $query->orderByDesc('performed_on');
            },
            'history' => function ($query) {
                $query->orderByDesc('created_at');
            },
        ];

        if ($hasCopiesTable) {
            $withRelations[] = 'copies';
        }

        $query = Asset::with($withRelations);

        if ($hasCopiesTable) {
            $query->withCount([
                'copies as total_copies_count',
                'copies as available_copies_count' => function ($q) {
                    $q->where('status', 'available')->whereNull('deleted_at');
                },
            ]);
        } else if ($hasTotalCopiesColumn) {
            $query->addSelect(DB::raw('COALESCE(total_copies, 1) as total_copies_count'))
                  ->addSelect(DB::raw('COALESCE(total_copies, 1) as available_copies_count'));
        } else {
            $query->addSelect(DB::raw('1 as total_copies_count'))
                  ->addSelect(DB::raw('1 as available_copies_count'));
        }

        $asset = $query->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        return response()->json($asset);
    }

    public function update(UpdateAssetRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::update - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        // Capture old values before update
        $oldValues = $asset->only([
            'name', 'asset_tag', 'description', 'category_id', 'purchase_date', 'purchase_price',
            'currency_id', 'finance_account_id', 'building_id', 'room_id', 'status', 'condition'
        ]);

        $data = $request->validated();
        // Prevent cross-school moves
        unset($data['school_id'], $data['organization_id']);

        // Validate and set currency_id and finance_account_id
        if (isset($data['finance_account_id']) && $data['finance_account_id']) {
            // Validate finance account belongs to organization
            $account = DB::table('finance_accounts')
                ->where('id', $data['finance_account_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$account) {
                return response()->json(['error' => 'Finance account not found for this school'], 422);
            }

            // If currency_id not provided but account has currency, use account's currency
            if (!isset($data['currency_id']) || !$data['currency_id']) {
                if ($account->currency_id) {
                    $data['currency_id'] = $account->currency_id;
                }
            }
        }

        // Validate currency_id belongs to organization
        if (isset($data['currency_id']) && $data['currency_id']) {
            $currency = DB::table('currencies')
                ->where('id', $data['currency_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$currency) {
                return response()->json(['error' => 'Currency not found for this school'], 422);
            }
        }

        if (isset($data['asset_tag']) && $data['asset_tag']) {
            $assetTagExists = DB::table('assets')
                ->where('asset_tag', $data['asset_tag'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', '!=', $asset->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($assetTagExists) {
                return response()->json(['error' => 'Asset tag must be unique per school'], 422);
            }
        }

        $locationValidation = $this->validateLocationWithDetails($data, $profile->organization_id, $currentSchoolId);
        if (!$locationValidation['valid']) {
            return response()->json(['error' => $locationValidation['message'] ?? 'Invalid building or room for organization'], 422);
        }

        $original = $asset->getOriginal();
        $asset->fill($data);
        $asset->save();

        // Automatically update status if copies or assignments changed
        self::updateAssetStatus($asset, $profile->organization_id);

        $changes = array_keys($asset->getChanges());
        if (!empty($changes)) {
        self::recordHistory($asset->id, $profile->organization_id, $currentSchoolId, 'updated', 'Asset updated', [
                'changed_fields' => $changes,
                'updated_by' => $user->id,
                'before' => array_intersect_key($original, array_flip($changes)),
                'after' => $asset->only($changes),
            ]);
        }

        // Log asset update
        try {
            $categoryName = $asset->category?->name ?? 'Uncategorized';
            $this->activityLogService->logUpdate(
                subject: $asset,
                description: "Updated asset: {$asset->name} ({$asset->asset_tag}) in category {$categoryName}",
                properties: [
                    'asset_id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'old_values' => $oldValues,
                    'new_values' => $asset->only([
                        'name', 'asset_tag', 'description', 'category_id', 'purchase_date', 'purchase_price',
                        'currency_id', 'finance_account_id', 'building_id', 'room_id', 'status', 'condition'
                    ]),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log asset update: ' . $e->getMessage());
        }

        return response()->json($asset->load(['building', 'room', 'school', 'category', 'currency', 'financeAccount', 'activeAssignment']));
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::destroy - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.delete',
                'error' => $e->getMessage(),
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        // Load relationships for logging
        $asset->load(['category']);

        // Log asset deletion
        try {
            $categoryName = $asset->category?->name ?? 'Uncategorized';
            $this->activityLogService->logDelete(
                subject: $asset,
                description: "Deleted asset: {$asset->name} ({$asset->asset_tag}) in category {$categoryName}",
                properties: [
                    'asset_id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'category_id' => $asset->category_id,
                    'deleted_entity' => $asset->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log asset deletion: ' . $e->getMessage());
        }

        $asset->delete();

        self::recordHistory($asset->id, $profile->organization_id, $currentSchoolId, 'deleted', 'Asset archived', [
            'deleted_by' => $user->id,
        ]);

        return response()->noContent();
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::stats - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $orgId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $baseQuery = Asset::where('organization_id', $orgId)
            ->where('school_id', $currentSchoolId);

        $statusCounts = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $assetIds = (clone $baseQuery)->pluck('id');
        
        // Calculate total value: purchase_price × total_copies (at least 1 copy)
        $assets = (clone $baseQuery)
            ->whereNotNull('purchase_price')
            ->where('purchase_price', '>', 0)
            ->get();
        
        $totalValue = 0;
        foreach ($assets as $asset) {
            $price = (float) $asset->purchase_price;
            $copies = max(1, (int) ($asset->total_copies ?? 1)); // At least 1 copy
            $totalValue += $price * $copies;
        }

        $maintenanceCost = 0;
        if ($assetIds->isNotEmpty()) {
            $maintenanceCost = (float) AssetMaintenanceRecord::where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->whereIn('asset_id', $assetIds)
                ->sum('cost');
        }

        // Calculate assets by finance account
        $assetsByAccount = [];
        $assetsWithAccounts = (clone $baseQuery)
            ->whereNotNull('finance_account_id')
            ->whereNotNull('purchase_price')
            ->where('purchase_price', '>', 0)
            ->with(['financeAccount', 'currency'])
            ->get();
        
        foreach ($assetsWithAccounts as $asset) {
            $price = (float) $asset->purchase_price;
            $copies = max(1, (int) ($asset->total_copies ?? 1));
            $assetValue = $price * $copies;
            
            $accountId = $asset->finance_account_id;
            if (!isset($assetsByAccount[$accountId])) {
                $assetsByAccount[$accountId] = [
                    'account_id' => $accountId,
                    'account_name' => $asset->financeAccount ? $asset->financeAccount->name : 'Unknown',
                    'total_value' => 0,
                    'asset_count' => 0,
                    'currency_code' => $asset->currency ? $asset->currency->code : ($asset->financeAccount && $asset->financeAccount->currency ? $asset->financeAccount->currency->code : 'N/A'),
                ];
            }
            $assetsByAccount[$accountId]['total_value'] += $assetValue;
            $assetsByAccount[$accountId]['asset_count']++;
        }
        $assetsByAccountArray = array_values($assetsByAccount);

        return response()->json([
            'status_counts' => $statusCounts,
            'total_purchase_value' => $totalValue,
            'maintenance_cost_total' => $maintenanceCost,
            'asset_count' => (clone $baseQuery)->count(),
            'assets_by_account' => $assetsByAccountArray,
        ]);
    }

    public function history(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $history = AssetHistory::where('asset_id', $asset->id)
            ->where('organization_id', $profile->organization_id)
            ->when(Schema::hasColumn('asset_histories', 'school_id'), function ($q) use ($currentSchoolId) {
                $q->where('school_id', $currentSchoolId);
            })
            ->orderByDesc('created_at')
            ->get();

        return response()->json($history);
    }

    public function assignments(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::assignments - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $query = AssetAssignment::where('asset_id', $id)
            ->where('organization_id', $profile->organization_id);
        if (Schema::hasColumn('asset_assignments', 'school_id')) {
            $query->where('school_id', $currentSchoolId);
        }

        if (Schema::hasTable('asset_copies') && Schema::hasColumn('asset_assignments', 'asset_copy_id')) {
            $query->with(['assetCopy']);
        }

        $assignments = $query->orderByDesc('assigned_on')->get();

        return response()->json($assignments);
    }

    public function createAssignment(StoreAssetAssignmentRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::createAssignment - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();

        if (!$this->validateAssignee($data['assigned_to_type'], $data['assigned_to_id'] ?? null, $profile->organization_id, $currentSchoolId)) {
            return response()->json(['error' => 'Assignee is not valid for this organization'], 422);
        }

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasCopyIdColumn = Schema::hasColumn('asset_assignments', 'asset_copy_id');

        if ($hasCopiesTable && $hasCopyIdColumn) {
            // Find an available copy to assign
            $availableCopy = AssetCopy::where('asset_id', $id)
                ->where('organization_id', $profile->organization_id)
                ->when(Schema::hasColumn('asset_copies', 'school_id'), function ($q) use ($currentSchoolId) {
                    $q->where('school_id', $currentSchoolId);
                })
                ->where('status', 'available')
                ->whereNull('deleted_at')
                ->first();

            if (!$availableCopy) {
                return response()->json(['error' => 'No available copies to assign'], 422);
            }

            $assignmentPayload = [
                'asset_id' => $id,
                'asset_copy_id' => $availableCopy->id,
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'assigned_to_type' => $data['assigned_to_type'],
                'assigned_to_id' => $data['assigned_to_id'] ?? null,
                'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
            ];
            if (!Schema::hasColumn('asset_assignments', 'school_id')) {
                unset($assignmentPayload['school_id']);
            }
            $assignment = AssetAssignment::create($assignmentPayload);

            // Update copy status
            $availableCopy->status = 'assigned';
            $availableCopy->save();

            // Automatically update asset status based on available copies
            self::updateAssetStatus($asset, $profile->organization_id);
        } else {
            // Fallback: assign asset directly (old behavior)
            $assignmentPayload = [
                'asset_id' => $id,
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'assigned_to_type' => $data['assigned_to_type'],
                'assigned_to_id' => $data['assigned_to_id'] ?? null,
                'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
            ];
            if (!Schema::hasColumn('asset_assignments', 'school_id')) {
                unset($assignmentPayload['school_id']);
            }
            $assignment = AssetAssignment::create($assignmentPayload);

            $asset->status = 'assigned';
            $asset->save();
        }

        self::recordHistory($asset->id, $profile->organization_id, $currentSchoolId, 'assigned', 'Asset assigned', [
            'assigned_to_type' => $data['assigned_to_type'],
            'assigned_to_id' => $data['assigned_to_id'] ?? null,
            'assigned_by' => $user->id,
        ]);

        // Reload asset with updated copy counts
        $asset->refresh();
        if ($hasCopiesTable) {
            $asset->loadCount([
                'copies as total_copies_count',
                'copies as available_copies_count' => function ($q) {
                    $q->where('status', 'available')->whereNull('deleted_at');
                },
            ]);
        }

        // Notify about asset assignment
        try {
            $assignment->refresh();
            $this->notificationService->notify(
                'asset.assigned',
                $assignment,
                $user,
                [
                    'title' => '📦 Asset Assigned',
                    'body' => "Asset '{$asset->name}' ({$asset->asset_tag}) has been assigned to you.",
                    'url' => "/assets/{$asset->id}",
                ]
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to send asset assignment notification', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($assignment, 201);
    }

    private function validateAssignee(string $type, ?string $id, string $organizationId, string $currentSchoolId): bool
    {
        if ($type === 'other') {
            return true;
        }

        if (!$id) {
            return false;
        }

        if ($type === 'staff') {
            return DB::table('staff')
                ->where('id', $id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
        }

        if ($type === 'student') {
            return DB::table('students')
                ->where('id', $id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
        }

        if ($type === 'room') {
            $room = DB::table('rooms')->where('id', $id)->whereNull('deleted_at')->first();
            if (!$room) {
                return false;
            }

            return $room->school_id === $currentSchoolId;
        }

        return false;
    }

    private function validateLocation(array $data, string $organizationId, string $currentSchoolId): bool
    {
        $result = $this->validateLocationWithDetails($data, $organizationId, $currentSchoolId);
        return $result['valid'];
    }

    private function validateLocationWithDetails(array $data, string $organizationId, string $currentSchoolId): array
    {
        // Normalize empty strings to null
        $buildingId = !empty($data['building_id']) && $data['building_id'] !== 'none' ? $data['building_id'] : null;
        $roomId = !empty($data['room_id']) && $data['room_id'] !== 'none' ? $data['room_id'] : null;
        // Strict school scoping: ignore any school_id in payload; use middleware-derived value
        $schoolId = $currentSchoolId;

        // If all are null, that's valid (asset not assigned to any location)
        if (!$buildingId && !$roomId && !$schoolId) {
            return ['valid' => true];
        }

        // Validate school exists in org (schoolId is always present here)
        $schoolExists = DB::table('school_branding')
            ->where('id', $schoolId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->exists();
        if (!$schoolExists) {
            return ['valid' => false, 'message' => 'School context is invalid for this organization'];
        }

        // Validate building_id if provided
        if ($buildingId) {
            $building = DB::table('buildings')
                ->where('id', $buildingId)
                ->whereNull('deleted_at')
                ->first();

            if (!$building) {
                return ['valid' => false, 'message' => 'Selected building does not exist or has been deleted'];
            }

            // If building has a school_id, validate it belongs to organization
            if ($building->school_id) {
                if ($schoolId !== $building->school_id) {
                    return ['valid' => false, 'message' => 'Selected building does not belong to the selected school'];
                }
            } else {
                return ['valid' => false, 'message' => 'Selected building is not assigned to a school'];
            }
        }

        // Validate room_id if provided
        if ($roomId) {
            $room = DB::table('rooms')
                ->where('id', $roomId)
                ->whereNull('deleted_at')
                ->first();

            if (!$room) {
                return ['valid' => false, 'message' => 'Selected room does not exist or has been deleted'];
            }

            // If room has a building_id and building_id is also provided, validate they match
            // If only room is provided without building, that's valid (room can exist independently)
            if ($room->building_id && $buildingId) {
                if ($room->building_id !== $buildingId) {
                    return ['valid' => false, 'message' => 'Selected room does not belong to the selected building'];
                }
            }

            // If room has a school_id, validate it belongs to organization
            if ($room->school_id) {
                if ($schoolId !== $room->school_id) {
                    return ['valid' => false, 'message' => 'Selected room does not belong to the selected school'];
                }
            } else {
                return ['valid' => false, 'message' => 'Selected room is not assigned to a school'];
            }
        }

        return ['valid' => true];
    }

    /**
     * Automatically update asset status based on available copies and active assignments
     * 
     * @param Asset $asset The asset to update
     * @param string $organizationId The organization ID
     * @return bool Whether the status was changed
     */
    public static function updateAssetStatus(Asset $asset, string $organizationId): bool
    {
        $hasCopiesTable = Schema::hasTable('asset_copies');
        $oldStatus = $asset->status;
        $newStatus = $oldStatus;

        if ($hasCopiesTable) {
            // Count total copies
            $totalCopiesCount = AssetCopy::where('asset_id', $asset->id)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->count();

            // Count available copies
            $availableCopiesCount = AssetCopy::where('asset_id', $asset->id)
                ->where('organization_id', $organizationId)
                ->where('status', 'available')
                ->whereNull('deleted_at')
                ->count();

            // Count active assignments
            $hasActiveAssignments = AssetAssignment::where('asset_id', $asset->id)
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->exists();

            // Determine status based on available copies and active assignments
            if ($totalCopiesCount === 0) {
                // No copies at all - keep current status or set to a default (e.g., 'available' for new assets)
                // Don't change status if asset has no copies yet
                $newStatus = $oldStatus ?: 'available';
            } else if ($availableCopiesCount > 0) {
                // Has available copies - status should be 'available'
                $newStatus = 'available';
            } else if ($hasActiveAssignments) {
                // No available copies but has active assignments - status should be 'assigned'
                $newStatus = 'assigned';
            } else {
                // No available copies and no active assignments - all copies returned or no copies exist
                // If we have total copies but none available and no assignments, something might be wrong
                // But for now, set to 'available' as all copies are back
                $newStatus = 'available';
            }
        } else {
            // Fallback: check active assignments only
            $hasActiveAssignments = AssetAssignment::where('asset_id', $asset->id)
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->exists();

            $newStatus = $hasActiveAssignments ? 'assigned' : 'available';
        }

        // Only update if status changed
        if ($newStatus !== $oldStatus) {
            $asset->status = $newStatus;
            $asset->save();

            // Record status change in history
            self::recordHistory($asset->id, $organizationId, 'status_changed', "Asset status changed from {$oldStatus} to {$newStatus}", [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason' => 'automatic_update',
            ]);

            return true;
        }

        return false;
    }

    public static function recordHistory(string $assetId, string $organizationId, string $schoolId, string $eventType, string $description, array $metadata = []): void
    {
        try {
            $payload = [
                'asset_id' => $assetId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'event_type' => $eventType,
                'description' => $description,
                'metadata' => $metadata,
            ];
            if (!Schema::hasColumn('asset_histories', 'school_id')) {
                unset($payload['school_id']);
            }
            AssetHistory::create($payload);
        } catch (\Exception $e) {
            \Log::warning('Failed to record asset history', [
                'asset_id' => $assetId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
