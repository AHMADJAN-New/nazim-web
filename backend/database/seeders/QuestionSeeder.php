<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ClassAcademicYear;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class QuestionSeeder extends Seeder
{
    /**
     * Seed the questions table.
     *
     * Creates questions for each organization:
     * - For current academic year
     * - For last 2 exams of current academic year
     * - For each subject: 5 MCQ, 5 Essay, 5 other types (short, descriptive, true_false)
     * - All questions in RTL languages (Pashto, Farsi, Arabic)
     * - All questions are easy difficulty
     * - Simple format: "سوال 1", "جواب 1", etc.
     */
    public function run(): void
    {
        $this->command->info('Seeding questions...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating questions for {$organization->name}...");

            // Get current academic year and one previous year (2 academic years total)
            $academicYears = AcademicYear::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->orderBy('start_date', 'desc')
                ->limit(2)
                ->get();

            if ($academicYears->isEmpty()) {
                $this->command->warn("  ⚠ No academic years found for {$organization->name}. Skipping.");
                continue;
            }

            $this->command->info("  Using {$academicYears->count()} academic year(s)");

            // Get all subjects for this organization
            $subjects = Subject::where('organization_id', $organization->id)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->get();

            if ($subjects->isEmpty()) {
                $this->command->warn("  ⚠ No active subjects found for {$organization->name}. Skipping.");
                continue;
            }

            // Get first school for this organization
            $school = SchoolBranding::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->first();

            if (!$school) {
                $this->command->warn("  ⚠ No school found for {$organization->name}. Skipping.");
                continue;
            }

            // Create questions for each academic year
            foreach ($academicYears as $academicYear) {
                $this->command->info("  Processing academic year: {$academicYear->name}...");

                // Get last 2 exams of this academic year (ordered by end_date desc)
                $exams = Exam::where('organization_id', $organization->id)
                    ->where('academic_year_id', $academicYear->id)
                    ->whereNull('deleted_at')
                    ->orderBy('end_date', 'desc')
                    ->limit(2)
                    ->get();

                if ($exams->isEmpty()) {
                    $this->command->warn("    ⚠ No exams found for {$academicYear->name}. Skipping this year.");
                    continue;
                }

                $this->command->info("    Found {$exams->count()} exam(s) for {$academicYear->name}");

                // Get class academic years for this academic year
                $classAcademicYears = ClassAcademicYear::where('academic_year_id', $academicYear->id)
                    ->whereNull('deleted_at')
                    ->get();

                if ($classAcademicYears->isEmpty()) {
                    $this->command->warn("    ⚠ No class academic years found for {$academicYear->name}. Creating questions without class assignment.");
                }

                // Create questions for each subject
                foreach ($subjects as $subject) {
                    $this->command->info("    Creating questions for subject: {$subject->name}...");

                    $created = 0;

                    // Distribute questions across the 2 exams
                    // First exam gets: 3 MCQ, 3 Essay, 1 Short, 1 Descriptive, 1 True/False (9 questions)
                    // Second exam gets: 2 MCQ, 2 Essay, 1 Short, 1 Descriptive (6 questions)
                    $firstExam = $exams->first();
                    $secondExam = $exams->count() > 1 ? $exams->last() : $firstExam;
                    
                    $this->command->info("      → Linking questions to exams: {$firstExam->name}" . ($exams->count() > 1 ? " and {$secondExam->name}" : ""));

                    // Create 5 MCQ questions (with 4 options each) - 3 for first exam, 2 for second
                    for ($i = 1; $i <= 5; $i++) {
                        $classAcademicYearId = $classAcademicYears->isNotEmpty() 
                            ? $classAcademicYears->random()->id 
                            : null;
                        
                        $examId = $i <= 3 ? $firstExam->id : $secondExam->id;

                        $question = $this->createMCQQuestion(
                            $organization->id,
                            $school->id,
                            $subject->id,
                            $classAcademicYearId,
                            $examId,
                            $i,
                            $academicYear->name
                        );

                        if ($question) {
                            $created++;
                        }
                    }

                    // Create 5 Essay questions - 3 for first exam, 2 for second
                    for ($i = 1; $i <= 5; $i++) {
                        $classAcademicYearId = $classAcademicYears->isNotEmpty() 
                            ? $classAcademicYears->random()->id 
                            : null;
                        
                        $examId = $i <= 3 ? $firstExam->id : $secondExam->id;

                        $question = $this->createEssayQuestion(
                            $organization->id,
                            $school->id,
                            $subject->id,
                            $classAcademicYearId,
                            $examId,
                            $i,
                            $academicYear->name
                        );

                        if ($question) {
                            $created++;
                        }
                    }

                    // Create 2 Short Answer questions - 1 for first exam, 1 for second
                    for ($i = 1; $i <= 2; $i++) {
                        $classAcademicYearId = $classAcademicYears->isNotEmpty() 
                            ? $classAcademicYears->random()->id 
                            : null;
                        
                        $examId = $i === 1 ? $firstExam->id : $secondExam->id;

                        $question = $this->createShortQuestion(
                            $organization->id,
                            $school->id,
                            $subject->id,
                            $classAcademicYearId,
                            $examId,
                            $i,
                            $academicYear->name
                        );

                        if ($question) {
                            $created++;
                        }
                    }

                    // Create 2 Descriptive questions - 1 for first exam, 1 for second
                    for ($i = 1; $i <= 2; $i++) {
                        $classAcademicYearId = $classAcademicYears->isNotEmpty() 
                            ? $classAcademicYears->random()->id 
                            : null;
                        
                        $examId = $i === 1 ? $firstExam->id : $secondExam->id;

                        $question = $this->createDescriptiveQuestion(
                            $organization->id,
                            $school->id,
                            $subject->id,
                            $classAcademicYearId,
                            $examId,
                            $i,
                            $academicYear->name
                        );

                        if ($question) {
                            $created++;
                        }
                    }

                    // Create 1 true_false question - for first exam
                    $classAcademicYearId = $classAcademicYears->isNotEmpty() 
                        ? $classAcademicYears->random()->id 
                        : null;

                    $question = $this->createTrueFalseQuestion(
                        $organization->id,
                        $school->id,
                        $subject->id,
                        $classAcademicYearId,
                        $firstExam->id,
                        1,
                        $academicYear->name
                    );

                    if ($question) {
                        $created++;
                    }

                    $this->command->info("      → Created {$created} question(s) for {$subject->name} in {$academicYear->name}");
                    $totalCreated += $created;
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} question(s)");
        }

        $this->command->info('✅ Questions seeded successfully!');
    }

    /**
     * Create an MCQ question with 4 options
     */
    protected function createMCQQuestion(
        string $organizationId,
        string $schoolId,
        string $subjectId,
        ?string $classAcademicYearId,
        ?string $examId,
        int $number,
        string $academicYearName = ''
    ): ?Question {
        // RTL question text in Pashto
        $questionText = "سوال {$number}";
        
        // Get exam name for reference
        $examName = $examId ? Exam::find($examId)?->name : null;
        $reference = $academicYearName 
            ? ($examName ? "{$academicYearName} - {$examName} - فصل {$number}" : "{$academicYearName} - فصل {$number}")
            : ($examName ? "{$examName} - فصل {$number}" : "فصل {$number}");

        // Create 4 options
        $options = [];
        for ($optNum = 1; $optNum <= 4; $optNum++) {
            $options[] = [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'label' => chr(64 + $optNum), // A, B, C, D
                'text' => "جواب {$optNum}",
                'is_correct' => $optNum === 1, // First option is correct
            ];
        }

        return Question::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_id' => $subjectId,
            'class_academic_year_id' => $classAcademicYearId,
            'exam_id' => $examId,
            'type' => Question::TYPE_MCQ,
            'difficulty' => Question::DIFFICULTY_EASY,
            'marks' => 5.0,
            'text' => $questionText,
            'text_rtl' => true,
            'options' => $options,
            'correct_answer' => null,
            'reference' => $reference,
            'tags' => ['mcq', 'easy'],
            'is_active' => true,
        ]);
    }

    /**
     * Create an Essay question
     */
    protected function createEssayQuestion(
        string $organizationId,
        string $schoolId,
        string $subjectId,
        ?string $classAcademicYearId,
        ?string $examId,
        int $number,
        string $academicYearName = ''
    ): ?Question {
        // RTL question text in Pashto
        $questionText = "سوال {$number}";
        
        // Get exam name for reference
        $examName = $examId ? Exam::find($examId)?->name : null;
        $reference = $academicYearName 
            ? ($examName ? "{$academicYearName} - {$examName} - فصل {$number}" : "{$academicYearName} - فصل {$number}")
            : ($examName ? "{$examName} - فصل {$number}" : "فصل {$number}");

        return Question::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_id' => $subjectId,
            'class_academic_year_id' => $classAcademicYearId,
            'exam_id' => $examId,
            'type' => Question::TYPE_ESSAY,
            'difficulty' => Question::DIFFICULTY_EASY,
            'marks' => 10.0,
            'text' => $questionText,
            'text_rtl' => true,
            'options' => null,
            'correct_answer' => "جواب {$number}",
            'reference' => $reference,
            'tags' => ['essay', 'easy'],
            'is_active' => true,
        ]);
    }

    /**
     * Create a Short Answer question
     */
    protected function createShortQuestion(
        string $organizationId,
        string $schoolId,
        string $subjectId,
        ?string $classAcademicYearId,
        ?string $examId,
        int $number,
        string $academicYearName = ''
    ): ?Question {
        // RTL question text in Pashto
        $questionText = "سوال {$number}";
        
        // Get exam name for reference
        $examName = $examId ? Exam::find($examId)?->name : null;
        $reference = $academicYearName 
            ? ($examName ? "{$academicYearName} - {$examName} - فصل {$number}" : "{$academicYearName} - فصل {$number}")
            : ($examName ? "{$examName} - فصل {$number}" : "فصل {$number}");

        return Question::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_id' => $subjectId,
            'class_academic_year_id' => $classAcademicYearId,
            'exam_id' => $examId,
            'type' => Question::TYPE_SHORT,
            'difficulty' => Question::DIFFICULTY_EASY,
            'marks' => 3.0,
            'text' => $questionText,
            'text_rtl' => true,
            'options' => null,
            'correct_answer' => "جواب {$number}",
            'reference' => $reference,
            'tags' => ['short', 'easy'],
            'is_active' => true,
        ]);
    }

    /**
     * Create a Descriptive question
     */
    protected function createDescriptiveQuestion(
        string $organizationId,
        string $schoolId,
        string $subjectId,
        ?string $classAcademicYearId,
        ?string $examId,
        int $number,
        string $academicYearName = ''
    ): ?Question {
        // RTL question text in Pashto
        $questionText = "سوال {$number}";
        
        // Get exam name for reference
        $examName = $examId ? Exam::find($examId)?->name : null;
        $reference = $academicYearName 
            ? ($examName ? "{$academicYearName} - {$examName} - فصل {$number}" : "{$academicYearName} - فصل {$number}")
            : ($examName ? "{$examName} - فصل {$number}" : "فصل {$number}");

        return Question::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_id' => $subjectId,
            'class_academic_year_id' => $classAcademicYearId,
            'exam_id' => $examId,
            'type' => Question::TYPE_DESCRIPTIVE,
            'difficulty' => Question::DIFFICULTY_EASY,
            'marks' => 8.0,
            'text' => $questionText,
            'text_rtl' => true,
            'options' => null,
            'correct_answer' => "جواب {$number}",
            'reference' => $reference,
            'tags' => ['descriptive', 'easy'],
            'is_active' => true,
        ]);
    }

    /**
     * Create a True/False question
     */
    protected function createTrueFalseQuestion(
        string $organizationId,
        string $schoolId,
        string $subjectId,
        ?string $classAcademicYearId,
        ?string $examId,
        int $number,
        string $academicYearName = ''
    ): ?Question {
        // RTL question text in Pashto
        $questionText = "سوال {$number}";
        
        // Get exam name for reference
        $examName = $examId ? Exam::find($examId)?->name : null;
        $reference = $academicYearName 
            ? ($examName ? "{$academicYearName} - {$examName} - فصل {$number}" : "{$academicYearName} - فصل {$number}")
            : ($examName ? "{$examName} - فصل {$number}" : "فصل {$number}");

        // True/False options
        $options = [
            [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'label' => 'A',
                'text' => 'سم',
                'is_correct' => true,
            ],
            [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'label' => 'B',
                'text' => 'غلط',
                'is_correct' => false,
            ],
        ];

        return Question::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_id' => $subjectId,
            'class_academic_year_id' => $classAcademicYearId,
            'exam_id' => $examId,
            'type' => Question::TYPE_TRUE_FALSE,
            'difficulty' => Question::DIFFICULTY_EASY,
            'marks' => 2.0,
            'text' => $questionText,
            'text_rtl' => true,
            'options' => $options,
            'correct_answer' => 'سم',
            'reference' => $reference,
            'tags' => ['true_false', 'easy'],
            'is_active' => true,
        ]);
    }
}

