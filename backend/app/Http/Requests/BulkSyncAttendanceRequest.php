<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkSyncAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1|max:500',
            'items.*.client_ref' => 'nullable|string|max:100',
            'items.*.operation' => 'required|string|in:session.create,records.mark,session.close,session.update,session.delete',

            // session payload (used by session.* ops)
            'items.*.session' => 'nullable|array',
            'items.*.session.id' => 'nullable|uuid',
            'items.*.session.class_id' => 'nullable|uuid|exists:classes,id',
            'items.*.session.class_ids' => 'nullable|array|min:1',
            'items.*.session.class_ids.*' => 'required|uuid|exists:classes,id',
            'items.*.session.academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'items.*.session.session_date' => 'nullable|date',
            'items.*.session.session_label' => 'nullable|string|max:100',
            'items.*.session.attendance_round_name_id' => 'nullable|uuid|exists:attendance_round_names,id',
            'items.*.session.method' => 'nullable|string|in:manual,barcode',
            'items.*.session.status' => 'nullable|string|in:open,closed',
            'items.*.session.remarks' => 'nullable|string',
            'items.*.session.student_type' => 'nullable|string|in:all,boarders,day_scholars',
            'items.*.session.client_marked_at' => 'nullable|date',

            // session_id alone (for records.mark / session.close / session.update / session.delete)
            'items.*.session_id' => 'nullable|uuid',

            // records payload (used by session.create + records.mark)
            'items.*.records' => 'nullable|array',
            'items.*.records.*.student_id' => 'required_with:items.*.records|uuid|exists:students,id',
            'items.*.records.*.status' => 'required_with:items.*.records|string|in:present,absent,late,excused,sick,leave',
            'items.*.records.*.entry_method' => 'nullable|string|in:manual,barcode',
            'items.*.records.*.note' => 'nullable|string',
            'items.*.records.*.client_marked_at' => 'nullable|date',
        ];
    }
}
