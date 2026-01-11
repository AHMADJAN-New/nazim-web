<?php

namespace Tests\Feature\Concerns;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Currency;
use App\Models\FinanceAccount;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Illuminate\Support\Str;

trait CreatesSchoolData
{
    protected function createAcademicYearForSchool($organization, $school, array $overrides = []): AcademicYear
    {
        return AcademicYear::factory()->create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ], $overrides));
    }

    protected function createClassForSchool($organization, $school, array $overrides = []): ClassModel
    {
        return ClassModel::factory()->create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ], $overrides));
    }

    protected function createClassAcademicYearForSchool(
        $organization,
        $school,
        ClassModel $class,
        AcademicYear $academicYear,
        array $overrides = []
    ): ClassAcademicYear {
        $classAcademicYear = new ClassAcademicYear();
        $classAcademicYear->forceFill(array_merge([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'section_name' => 'A',
            'is_active' => true,
        ], $overrides));
        $classAcademicYear->save();

        return $classAcademicYear;
    }

    protected function createStudentForSchool($organization, $school, array $overrides = []): Student
    {
        return Student::factory()->create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ], $overrides));
    }

    protected function createStudentAdmissionForSchool(
        $organization,
        $school,
        Student $student,
        AcademicYear $academicYear,
        ClassModel $class,
        ?ClassAcademicYear $classAcademicYear = null,
        array $overrides = []
    ): StudentAdmission {
        return StudentAdmission::create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear?->id,
            'admission_year' => (string) now()->year,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
        ], $overrides));
    }

    protected function createCurrencyForSchool($organization, $school, array $overrides = []): Currency
    {
        return Currency::factory()->create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ], $overrides));
    }

    protected function createFinanceAccountForSchool($organization, $school, Currency $currency, array $overrides = []): FinanceAccount
    {
        return FinanceAccount::factory()->create(array_merge([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'currency_id' => $currency->id,
        ], $overrides));
    }
}
