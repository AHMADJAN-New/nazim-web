<?php

namespace App\Http\Controllers\Dms;

use App\Models\DocumentSetting;
use Illuminate\Http\Request;

class DocumentSettingsController extends BaseDmsController
{
    public function show(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $settings = DocumentSetting::firstOrCreate(
            ['organization_id' => $profile->organization_id, 'school_id' => $request->input('school_id')]
        );

        return $settings;
    }

    public function update(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $data = $request->validate([
            'incoming_prefix' => ['nullable', 'string', 'max:20'],
            'outgoing_prefix' => ['nullable', 'string', 'max:20'],
            'year_mode' => ['nullable', 'string'],
            'reset_yearly' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $settings = DocumentSetting::firstOrCreate(
            ['organization_id' => $profile->organization_id, 'school_id' => $data['school_id'] ?? null]
        );

        $settings->fill($data);
        $settings->save();

        return $settings;
    }
}
