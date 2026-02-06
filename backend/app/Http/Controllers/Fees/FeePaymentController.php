<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeePaymentStoreRequest;
use App\Models\FeeAssignment;
use App\Models\FeePayment;
use App\Models\FinanceAccount;
use App\Services\Notifications\NotificationService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FeePaymentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService
    ) {
    }
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('fees.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for fees.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'fee_assignment_id' => 'nullable|uuid|exists:fee_assignments,id',
            'student_id' => 'nullable|uuid|exists:students,id',
            'payment_date_from' => 'nullable|date',
            'payment_date_to' => 'nullable|date|after_or_equal:payment_date_from',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = FeePayment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->with(['feeAssignment', 'student', 'account', 'incomeEntry', 'currency']);

        if (!empty($validated['fee_assignment_id'])) {
            $query->where('fee_assignment_id', $validated['fee_assignment_id']);
        }

        if (!empty($validated['student_id'])) {
            $query->where('student_id', $validated['student_id']);
        }

        if (!empty($validated['payment_date_from'])) {
            $query->where('payment_date', '>=', $validated['payment_date_from']);
        }

        if (!empty($validated['payment_date_to'])) {
            $query->where('payment_date', '<=', $validated['payment_date_to']);
        }

        $query->orderBy('payment_date', 'desc');

        // Check if pagination is requested
        if (!empty($validated['page']) || !empty($validated['per_page'])) {
            $perPage = $validated['per_page'] ?? 25;
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function store(FeePaymentStoreRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('fees.payments.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['fee_assignment_id']);

        if (!$assignment) {
            return response()->json(['error' => 'Invalid fee assignment for organization'], 400);
        }

        if ($assignment->student_id !== $validated['student_id']) {
            return response()->json(['error' => 'Payment student mismatch'], 400);
        }

        $account = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['account_id']);

        if (!$account) {
            return response()->json(['error' => 'Invalid finance account for organization'], 400);
        }

        // Enforce organization context
        $payload = array_merge($validated, [
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
        ]);

        $payment = FeePayment::create($payload);

        // Load relationships for notification
        $payment->load(['feeAssignment.feeStructure', 'student', 'account', 'currency']);

        // Notify about payment received
        try {
            $feeStructureName = $payment->feeAssignment?->feeStructure?->name ?? 'Fee';
            $studentName = $payment->student?->full_name ?? 'Student';
            $amount = number_format((float) $payment->amount, 2);
            $currencyCode = $payment->currency?->code ?? '';

            $this->notificationService->notify(
                'fee.payment.received',
                $payment,
                $user,
                [
                    'title' => '💰 Fee Payment Received',
                    'body' => "Payment of {$amount} {$currencyCode} received from {$studentName} for {$feeStructureName}.",
                    'url' => "/fees/payments/{$payment->id}",
                ]
            );

            // Also notify using generic payment.received event for finance module compatibility
            $this->notificationService->notify(
                'payment.received',
                $payment,
                $user,
                [
                    'title' => '💰 Payment Received',
                    'body' => "Payment of {$amount} {$currencyCode} received for {$feeStructureName}.",
                    'url' => "/fees/payments/{$payment->id}",
                ]
            );

            // Check if fee assignment is now fully paid
            $assignment = $payment->feeAssignment;
            if ($assignment) {
                $assignment->refresh();
                if ($assignment->status === 'paid' && (float) $assignment->remaining_amount <= 0) {
                    $this->notificationService->notify(
                        'fee.assignment.paid',
                        $assignment,
                        $user,
                        [
                            'title' => '✅ Fee Fully Paid',
                            'body' => "Fee assignment for {$studentName} ({$feeStructureName}) has been fully paid.",
                            'url' => "/fees/assignments/{$assignment->id}",
                        ]
                    );
                }

                // Check if status changed
                $oldStatus = $assignment->getOriginal('status') ?? 'pending';
                if ($assignment->status !== $oldStatus) {
                    $this->notificationService->notify(
                        'fee.assignment.status_changed',
                        $assignment,
                        $user,
                        [
                            'title' => '📊 Fee Status Changed',
                            'body' => "Fee assignment for {$studentName} ({$feeStructureName}) status changed from {$oldStatus} to {$assignment->status}.",
                            'url' => "/fees/assignments/{$assignment->id}",
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to send fee payment notification', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log fee payment creation
        try {
            $studentName = $payment->student?->full_name ?? 'Unknown';
            $amount = number_format((float) $payment->amount, 2);
            $currencyCode = $payment->currency?->code ?? '';
            $this->activityLogService->logCreate(
                subject: $payment,
                description: "Created fee payment: {$amount} {$currencyCode} for {$studentName}",
                properties: [
                    'payment_id' => $payment->id,
                    'student_id' => $payment->student_id,
                    'fee_assignment_id' => $payment->fee_assignment_id,
                    'amount' => $payment->amount,
                    'currency_id' => $payment->currency_id,
                    'payment_date' => $payment->payment_date,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log fee payment creation: ' . $e->getMessage());
        }

        return response()->json($payment->fresh(['feeAssignment', 'incomeEntry', 'account']), 201);
    }
}

