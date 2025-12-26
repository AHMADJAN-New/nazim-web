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
        [, $profile, $currentSchoolId] = $context;

        $settings = DocumentSetting::firstOrCreate(
            ['organization_id' => $profile->organization_id, 'school_id' => $currentSchoolId]
        );

        return $settings;
    }

    public function update(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $data = $request->validate([
            'incoming_prefix' => ['nullable', 'string', 'max:20'],
            'outgoing_prefix' => ['nullable', 'string', 'max:20'],
            'year_mode' => ['nullable', 'string'],
            'reset_yearly' => ['boolean'],
        ]);

        $settings = DocumentSetting::firstOrCreate(
            ['organization_id' => $profile->organization_id, 'school_id' => $currentSchoolId]
        );

        $settings->fill($data);
        $settings->save();

        return $settings;
    }
}
