<?php

namespace App\Services\Reports;

/**
 * Labels for student exam report card PDF.
 */
class StudentExamReportCardLabels
{
    /**
     * @return array<string, string>
     */
    public static function forLanguage(string $language): array
    {
        $maps = self::maps();
        $lang = strtolower(trim($language));

        if ($lang === 'dari') {
            $lang = 'fa';
        }

        $base = $maps[$lang] ?? $maps['en'];

        return array_merge($base, self::combinedMaps()[$lang] ?? self::combinedMaps()['en']);
    }

    public static function combinedReportTitle(string $language, ?string $examAName = null, ?string $examBName = null): string
    {
        $labels = self::forLanguage($language);
        $title = $labels['combinedReportTitle'];
        $names = array_values(array_filter([$examAName, $examBName], fn ($name) => is_string($name) && $name !== ''));

        if ($names === []) {
            return $title;
        }

        return $title.' - '.implode(' + ', $names);
    }

    public static function isRtl(string $language): bool
    {
        $lang = strtolower(trim($language));

        return in_array($lang, ['ps', 'fa', 'ar', 'dari'], true);
    }

    public static function reportTitle(string $language, ?string $examName = null): string
    {
        $labels = self::forLanguage($language);
        $title = $labels['reportTitle'];

        if ($examName !== null && $examName !== '') {
            return $title.' - '.$examName;
        }

        return $title;
    }

    /**
     * @return array<string, array<string, string>>
     */
    private static function maps(): array
    {
        return [
            'en' => [
                'reportTitle' => 'Student Report Card',
                'studentInformation' => 'Student Information',
                'fullName' => 'Full Name',
                'fatherName' => 'Father Name',
                'dateOfBirth' => 'Date of Birth',
                'admissionNo' => 'Admission No',
                'rollNumber' => 'Roll Number',
                'class' => 'Class',
                'section' => 'Section',
                'academicYear' => 'Academic Year',
                'examName' => 'Exam',
                'academicPerformance' => 'Academic Performance',
                'subjectName' => 'Subject',
                'maxMarks' => 'Max Marks',
                'marksObtained' => 'Marks Obtained',
                'percentage' => 'Percentage',
                'grade' => 'Grade',
                'result' => 'Result',
                'absent' => 'Absent',
                'grandTotal' => 'Grand Total',
                'overallResult' => 'Overall Result',
                'overallPercentage' => 'Overall Percentage',
                'overallGrade' => 'Overall Grade',
                'passedSubjects' => 'Passed',
                'failedSubjects' => 'Failed',
                'absentSubjects' => 'Absent',
                'marksCut' => 'Marks Cut',
                'absenceCount' => 'Absences',
                'pass' => 'Pass',
                'fail' => 'Fail',
                'incomplete' => 'Incomplete',
                'passedVerb' => 'passed',
                'failedVerb' => 'not passed',
                'incompleteVerb' => 'an incomplete result',
                'signatures' => 'Signatures',
                'classTeacher' => 'Class Teacher',
                'principal' => 'Principal',
                'parent' => 'Parent / Guardian',
                'dateIssued' => 'Date Issued',
                'studentPhoto' => 'Student Photo',
                'kashfTitle' => 'Kashf al-Darajat',
                'minimumMarks' => 'Minimum marks',
                'maximumMarks' => 'Full marks',
                'obtainedMarks' => 'Marks obtained',
                'totalMarks' => 'Total marks',
                'passingTotal' => 'Passing total',
                'marks' => 'Marks',
                'schoolSeal' => 'School seal',
                'attestation' => 'The administration of {school} certifies that {student}, son of {father}, passed {exam} with the grade {grade}.',
                'attestationFail' => 'The administration of {school} certifies that {student}, son of {father}, did not pass {exam} with the grade {grade}.',
                'attestationIncomplete' => 'The administration of {school} certifies that the result of {student}, son of {father}, in {exam} is not yet complete.',
                'attestationConduct' => 'He is among the diligent students and of good conduct. We ask God to grant him success in righteous work.',
            ],
            'ps' => [
                'reportTitle' => 'د زده کوونکي راپور کارت',
                'studentInformation' => 'د زده کوونکي معلومات',
                'fullName' => 'بشپړ نوم',
                'fatherName' => 'د پلار نوم',
                'dateOfBirth' => 'د زیږون نېټه',
                'admissionNo' => 'د شمولیت شمېره',
                'rollNumber' => 'رول نمبر',
                'class' => 'ټولګی',
                'section' => 'څانګه',
                'academicYear' => 'تحصیلي کال',
                'examName' => 'ازموینه',
                'academicPerformance' => 'تحصیلي فعالیت',
                'subjectName' => 'مضمون',
                'maxMarks' => 'اعظمي نمرې',
                'marksObtained' => 'ترلاسه شوې نمرې',
                'percentage' => 'سلنه',
                'grade' => 'درجه',
                'result' => 'پایله',
                'absent' => 'غیر حاضر',
                'grandTotal' => 'ټولټال',
                'overallResult' => 'ټوله پایله',
                'overallPercentage' => 'ټوله سلنه',
                'overallGrade' => 'ټوله درجه',
                'passedSubjects' => 'کامیاب',
                'failedSubjects' => 'ناکام',
                'absentSubjects' => 'غیر حاضر',
                'marksCut' => 'کمې شوې نمرې',
                'absenceCount' => 'غیر حاضري',
                'pass' => 'کامیاب',
                'fail' => 'ناکام',
                'incomplete' => 'نیمګړی',
                'passedVerb' => 'کامیاب',
                'failedVerb' => 'ناکام',
                'incompleteVerb' => 'نیمګړی',
                'signatures' => 'لاسلیکونه',
                'classTeacher' => 'ټولګي ښوونکی',
                'principal' => 'د رئیس لاسلیک',
                'parent' => 'پلار / سرپرست',
                'dateIssued' => 'د صادرولو نېټه',
                'studentPhoto' => 'د زده کوونکي عکس',
                'kashfTitle' => 'کشف الدرجات',
                'minimumMarks' => 'کمې نمرې',
                'maximumMarks' => 'زیاتې نمرې',
                'obtainedMarks' => 'ترلاسه شوې نمرې',
                'totalMarks' => 'ټولې نمرې',
                'passingTotal' => 'د کامیابۍ ټولټال',
                'marks' => 'نمرې',
                'schoolSeal' => 'د ښوونځي مهر',
                'attestation' => 'د {school} اداره تصدیق کوي چې زده کوونکی {student} د {father} زوی په {exam} کې کامیاب شوی او درجه یې {grade} ده.',
                'attestationFail' => 'د {school} اداره تصدیق کوي چې زده کوونکی {student} د {father} زوی په {exam} کې ناکام شوی او درجه یې {grade} ده.',
                'attestationIncomplete' => 'د {school} اداره تصدیق کوي چې د {student} د {father} زوی پایله په {exam} کې لا نیمګړې ده.',
                'attestationConduct' => 'هغه له هڅاندو زده کوونکو او د ښه سلوک خاوند دی. له الله تعالی څخه د نیک عمل توفیق غواړو.',
            ],
            'fa' => [
                'reportTitle' => 'کارت گزارش شاگرد',
                'studentInformation' => 'اطلاعات شاگرد',
                'fullName' => 'نام کامل',
                'fatherName' => 'نام پدر',
                'dateOfBirth' => 'تاریخ تولد',
                'admissionNo' => 'شماره شمولیت',
                'rollNumber' => 'نمبر رول',
                'class' => 'صنف',
                'section' => 'بخش',
                'academicYear' => 'سال تحصیلی',
                'examName' => 'امتحان',
                'academicPerformance' => 'عملکرد تحصیلی',
                'subjectName' => 'مضمون',
                'maxMarks' => 'نمرات اعظمی',
                'marksObtained' => 'نمرات حاصل‌شده',
                'percentage' => 'فیصدی',
                'grade' => 'درجه',
                'result' => 'نتیجه',
                'absent' => 'غیر حاضر',
                'grandTotal' => 'مجموع',
                'overallResult' => 'نتیجه کلی',
                'overallPercentage' => 'فیصدی کلی',
                'overallGrade' => 'درجه کلی',
                'passedSubjects' => 'کامیاب',
                'failedSubjects' => 'ناکام',
                'absentSubjects' => 'غیر حاضر',
                'marksCut' => 'نمرات کسرشده',
                'absenceCount' => 'غیر حاضری',
                'pass' => 'کامیاب',
                'fail' => 'ناکام',
                'incomplete' => 'ناتمام',
                'passedVerb' => 'کامیاب',
                'failedVerb' => 'ناکام',
                'incompleteVerb' => 'ناتمام',
                'signatures' => 'امضاها',
                'classTeacher' => 'معلم صنف',
                'principal' => 'امضای رئیس',
                'parent' => 'پدر / سرپرست',
                'dateIssued' => 'تاریخ صدور',
                'studentPhoto' => 'عکس شاگرد',
                'kashfTitle' => 'کشف الدرجات',
                'minimumMarks' => 'درجات صغری',
                'maximumMarks' => 'درجات کبری',
                'obtainedMarks' => 'درجات محصله',
                'totalMarks' => 'مجموع درجات',
                'passingTotal' => 'مجموع نمره کامیابی',
                'marks' => 'درجات',
                'schoolSeal' => 'مهر مکتب',
                'attestation' => 'اداره {school} تصدیق می‌کند که شاگرد {student} فرزند {father} در {exam} کامیاب شده و درجه او {grade} است.',
                'attestationFail' => 'اداره {school} تصدیق می‌کند که شاگرد {student} فرزند {father} در {exam} ناکام شده و درجه او {grade} است.',
                'attestationIncomplete' => 'اداره {school} تصدیق می‌کند که نتیجه {student} فرزند {father} در {exam} هنوز تکمیل نشده است.',
                'attestationConduct' => 'او از شاگردان کوشا و دارای سیرت و سلوک نیک است. از خداوند تعالی توفیق عمل صالح را خواهانیم.',
            ],
            'ar' => [
                'reportTitle' => 'بطاقة تقرير الطالب',
                'studentInformation' => 'معلومات الطالب',
                'fullName' => 'الاسم الكامل',
                'fatherName' => 'اسم الأب',
                'dateOfBirth' => 'تاريخ الميلاد',
                'admissionNo' => 'رقم القبول',
                'rollNumber' => 'رقم الجلوس',
                'class' => 'الصف',
                'section' => 'الشعبة',
                'academicYear' => 'العام الدراسي',
                'examName' => 'الامتحان',
                'academicPerformance' => 'الأداء الأكاديمي',
                'subjectName' => 'المادة',
                'maxMarks' => 'الدرجة الكاملة',
                'marksObtained' => 'الدرجة المحصلة',
                'percentage' => 'النسبة',
                'grade' => 'التقدير',
                'result' => 'النتيجة',
                'absent' => 'غائب',
                'grandTotal' => 'المجموع',
                'overallResult' => 'النتيجة الكلية',
                'overallPercentage' => 'النسبة الكلية',
                'overallGrade' => 'التقدير الكلي',
                'passedSubjects' => 'ناجح',
                'failedSubjects' => 'راسب',
                'absentSubjects' => 'غائب',
                'marksCut' => 'درجات مخصومة',
                'absenceCount' => 'الغيابات',
                'pass' => 'ناجح',
                'fail' => 'راسب',
                'incomplete' => 'غير مكتمل',
                'passedVerb' => 'نجح',
                'failedVerb' => 'لم ينجح',
                'incompleteVerb' => 'لم يكتمل',
                'signatures' => 'التوقيعات',
                'classTeacher' => 'معلم الصف',
                'principal' => 'توقيع مدير الجامعة',
                'parent' => 'ولي الأمر',
                'dateIssued' => 'تاريخ الإصدار',
                'studentPhoto' => 'صورة الطالب',
                'kashfTitle' => 'كشف الدرجات',
                'minimumMarks' => 'الدرجات الصغرى',
                'maximumMarks' => 'الدرجات الكبرى',
                'obtainedMarks' => 'الدرجات المحصلة',
                'totalMarks' => 'مجموع الدرجات',
                'passingTotal' => 'مجموع درجات النجاح',
                'marks' => 'الدرجات',
                'schoolSeal' => 'ختم الجامعة',
                'attestation' => 'تشهد إدارة {school} بأن الطالب {student} ابن {father} قد نجح في {exam} بتقدير {grade}.',
                'attestationFail' => 'تشهد إدارة {school} بأن الطالب {student} ابن {father} لم ينجح في {exam} بتقدير {grade}.',
                'attestationIncomplete' => 'تشهد إدارة {school} بأن الطالب {student} ابن {father} لم تكتمل نتيجته في {exam}.',
                'attestationConduct' => 'وهو من الطلبة المجتهدين وحسن السيرة والسلوك. سائلين الله تعالى أن يوفقه بتوفيق العمل الصالح وإتمام جميع الأمور.',
            ],
        ];
    }

    /**
     * Labels used only by the two-exam combined result card.
     *
     * @return array<string, array<string, string>>
     */
    private static function combinedMaps(): array
    {
        return [
            'en' => [
                'combinedReportTitle' => 'Combined result card',
                'examA' => 'Exam A',
                'examB' => 'Exam B',
                'passingMark' => 'Passing mark',
                'combined' => 'Combined',
                'combinedTotal' => 'Combined total',
                'combinedPassingMark' => 'Combined passing mark',
                'missingMark' => 'Missing mark',
                'notInExam' => 'Not in this exam',
                'incompleteCombined' => 'Incomplete — combined total is not final',
                'notEnrolledSecond' => 'This student is not enrolled in the second exam, so the combined total is incomplete.',
                'formulaHint' => 'Combined total = sum of the two exams’ total marks. Combined passing mark = sum of the two exams’ passing marks. A missing or absent mark is not added into a combined score.',
                'subjectsIncomplete' => 'Incomplete subjects',
            ],
            'ps' => [
                'combinedReportTitle' => 'ګډ راپور کارت',
                'examA' => 'لومړۍ ازموینه',
                'examB' => 'دویمه ازموینه',
                'passingMark' => 'د کامیابۍ نمره',
                'combined' => 'ګډ',
                'combinedTotal' => 'ګډ ټولټال',
                'combinedPassingMark' => 'ګډه د کامیابۍ نمره',
                'missingMark' => 'نمره نشته',
                'notInExam' => 'په دې ازموینه کې نشته',
                'incompleteCombined' => 'نیمګړی — ګډ ټولټال وروستی نه دی',
                'notEnrolledSecond' => 'دا زده کوونکی په دویمه ازموینه کې شامل نه دی، نو ګډ ټولټال نیمګړی دی.',
                'formulaHint' => 'ګډ ټولټال = د دواړو ازموینو د ټولو نمرو مجموعه. ګډه د کامیابۍ نمره = د دواړو ازموینو د کامیابۍ نمرو مجموعه. نشتې یا غیر حاضره نمره په ګډه نمره کې نه جمع کېږي.',
                'subjectsIncomplete' => 'نیمګړي مضامین',
            ],
            'fa' => [
                'combinedReportTitle' => 'کارت نتیجه ترکیبی',
                'examA' => 'امتحان اول',
                'examB' => 'امتحان دوم',
                'passingMark' => 'نمره کامیابی',
                'combined' => 'ترکیبی',
                'combinedTotal' => 'مجموع ترکیبی',
                'combinedPassingMark' => 'نمره کامیابی ترکیبی',
                'missingMark' => 'نمره موجود نیست',
                'notInExam' => 'در این امتحان نیست',
                'incompleteCombined' => 'ناتمام — مجموع ترکیبی نهایی نیست',
                'notEnrolledSecond' => 'این شاگرد در امتحان دوم شامل نیست، بنابراین مجموع ترکیبی ناتمام است.',
                'formulaHint' => 'مجموع ترکیبی = جمع نمرات کامل هر دو امتحان. نمره کامیابی ترکیبی = جمع نمرات کامیابی هر دو امتحان. نمره غایب یا ثبت‌نشده در نمره ترکیبی جمع نمی‌شود.',
                'subjectsIncomplete' => 'مضامین ناتمام',
            ],
            'ar' => [
                'combinedReportTitle' => 'بطاقة النتيجة المجمعة',
                'examA' => 'الامتحان الأول',
                'examB' => 'الامتحان الثاني',
                'passingMark' => 'درجة النجاح',
                'combined' => 'المجمّع',
                'combinedTotal' => 'المجموع المجمّع',
                'combinedPassingMark' => 'درجة النجاح المجمّعة',
                'missingMark' => 'درجة غير مسجلة',
                'notInExam' => 'غير موجود في هذا الامتحان',
                'incompleteCombined' => 'غير مكتمل — المجموع المجمّع ليس نهائياً',
                'notEnrolledSecond' => 'هذا الطالب غير مسجل في الامتحان الثاني، لذلك المجموع المجمّع غير مكتمل.',
                'formulaHint' => 'المجموع المجمّع = مجموع درجات الامتحانين الكاملة. درجة النجاح المجمّعة = مجموع درجتي النجاح. الدرجة الغائبة أو غير المسجلة لا تُضاف إلى الدرجة المجمّعة.',
                'subjectsIncomplete' => 'مواد غير مكتملة',
            ],
        ];
    }
}
