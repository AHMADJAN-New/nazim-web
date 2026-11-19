/** Kashf al-Darajat wording. Follows the app language so it matches stored exam names. */

export type KashfResult = 'pass' | 'fail' | 'incomplete';

export type KashfCardText = {
  title: string;
  subject: string;
  marks: string;
  combined: string;
  fullName: string;
  fatherName: string;
  rollNumber: string;
  className: string;
  admissionNo: string;
  dateOfBirth: string;
  examA: string;
  examB: string;
  minimumMarks: string;
  maximumMarks: string;
  obtainedMarks: string;
  totalMarks: string;
  passingTotal: string;
  overallPercentage: string;
  overallGrade: string;
  overallResult: string;
  absenceCount: string;
  marksCut: string;
  totalRaw: string;
  missingMark: string;
  notInExam: string;
  absent: string;
  incomplete: string;
  pass: string;
  fail: string;
  principal: string;
  schoolSeal: string;
  dateIssued: string;
  notEnrolledSecond: string;
  conduct: string;
  attestationLead: (school: string) => string;
  attestationBetween: string;
  attestationEnding: (result: KashfResult, exam: string, grade: string) => string;
};

const arabic: KashfCardText = {
  title: 'كشف الدرجات',
  subject: 'المادة',
  marks: 'الدرجات',
  combined: 'المجموع',
  fullName: 'الاسم',
  fatherName: 'اسم الأب',
  rollNumber: 'رقم الجلوس',
  className: 'الدرجة',
  admissionNo: 'رقم القيد',
  dateOfBirth: 'تاريخ الميلاد',
  examA: 'الامتحان الأول',
  examB: 'الامتحان الثاني',
  minimumMarks: 'الدرجات الصغرى',
  maximumMarks: 'الدرجات الكبرى',
  obtainedMarks: 'الدرجات المحصلة',
  totalMarks: 'مجموع الدرجات',
  passingTotal: 'مجموع درجات النجاح',
  overallPercentage: 'النسبة',
  overallGrade: 'التقدير',
  overallResult: 'النتيجة',
  absenceCount: 'الغيابات',
  marksCut: 'الدرجات المخصومة',
  totalRaw: 'المجموع قبل الخصم',
  missingMark: 'درجة غير مسجلة',
  notInExam: 'غير مشترك',
  absent: 'غائب',
  incomplete: 'غير مكتمل',
  pass: 'ناجح',
  fail: 'راسب',
  principal: 'توقيع مدير الجامعة',
  schoolSeal: 'ختم الجامعة',
  dateIssued: 'تاريخ الإصدار',
  notEnrolledSecond: 'هذا الطالب غير مسجل في الامتحان الثاني.',
  conduct:
    'وهو من الطلبة المجتهدين وحسن السيرة والسلوك. سائلين الله تعالى أن يوفقه بتوفيق العمل الصالح وإتمام جميع الأمور.',
  attestationLead: (school) => `تشهد إدارة ${school} بأن الطالب `,
  attestationBetween: ' ابن ',
  attestationEnding: (result, exam, grade) => {
    if (result === 'pass') return ` قد نجح في ${exam} بتقدير ${grade}.`;
    if (result === 'fail') return ` لم ينجح في ${exam} بتقدير ${grade}.`;
    return ` لم تكتمل نتيجته في ${exam}.`;
  },
};

const pashto: KashfCardText = {
  title: 'کشف الدرجات',
  subject: 'مضمون',
  marks: 'نمرې',
  combined: 'ګډ',
  fullName: 'بشپړ نوم',
  fatherName: 'د پلار نوم',
  rollNumber: 'رول نمبر',
  className: 'ټولګی',
  admissionNo: 'د شمولیت شمېره',
  dateOfBirth: 'د زیږون نېټه',
  examA: 'لومړۍ ازموینه',
  examB: 'دویمه ازموینه',
  minimumMarks: 'کمې نمرې',
  maximumMarks: 'زیاتې نمرې',
  obtainedMarks: 'ترلاسه شوې نمرې',
  totalMarks: 'ټولې نمرې',
  passingTotal: 'د کامیابۍ ټولټال',
  overallPercentage: 'ټوله سلنه',
  overallGrade: 'ټوله درجه',
  overallResult: 'ټوله پایله',
  absenceCount: 'غیر حاضري',
  marksCut: 'کمې شوې نمرې',
  totalRaw: 'ټولټال له کمولو مخکې',
  missingMark: 'نمره نشته',
  notInExam: 'په دې ازموینه کې نشته',
  absent: 'غیر حاضر',
  incomplete: 'نیمګړی',
  pass: 'کامیاب',
  fail: 'ناکام',
  principal: 'د رئیس لاسلیک',
  schoolSeal: 'د ښوونځي مهر',
  dateIssued: 'د صادرولو نېټه',
  notEnrolledSecond: 'دا زده کوونکی په دویمه ازموینه کې شامل نه دی.',
  conduct:
    'هغه له هڅاندو زده کوونکو او د ښه سلوک خاوند دی. له الله تعالی څخه د نیک عمل توفیق غواړو.',
  attestationLead: (school) => `د ${school} اداره تصدیق کوي چې زده کوونکی `,
  attestationBetween: ' د ',
  attestationEnding: (result, exam, grade) => {
    if (result === 'pass') return ` زوی په ${exam} کې کامیاب شوی او درجه یې ${grade} ده.`;
    if (result === 'fail') return ` زوی په ${exam} کې ناکام شوی او درجه یې ${grade} ده.`;
    return ` زوی پایله په ${exam} کې لا نیمګړې ده.`;
  },
};

const dari: KashfCardText = {
  title: 'کشف الدرجات',
  subject: 'مضمون',
  marks: 'درجات',
  combined: 'ترکیبی',
  fullName: 'نام کامل',
  fatherName: 'نام پدر',
  rollNumber: 'نمبر رول',
  className: 'صنف',
  admissionNo: 'شماره شمولیت',
  dateOfBirth: 'تاریخ تولد',
  examA: 'امتحان اول',
  examB: 'امتحان دوم',
  minimumMarks: 'درجات صغری',
  maximumMarks: 'درجات کبری',
  obtainedMarks: 'درجات محصله',
  totalMarks: 'مجموع درجات',
  passingTotal: 'مجموع نمره کامیابی',
  overallPercentage: 'فیصدی کلی',
  overallGrade: 'درجه کلی',
  overallResult: 'نتیجه کلی',
  absenceCount: 'غیر حاضری',
  marksCut: 'نمرات کسرشده',
  totalRaw: 'مجموع قبل از کسر',
  missingMark: 'نمره موجود نیست',
  notInExam: 'در این امتحان نیست',
  absent: 'غیر حاضر',
  incomplete: 'ناتمام',
  pass: 'کامیاب',
  fail: 'ناکام',
  principal: 'امضای رئیس',
  schoolSeal: 'مهر مکتب',
  dateIssued: 'تاریخ صدور',
  notEnrolledSecond: 'این شاگرد در امتحان دوم شامل نیست.',
  conduct:
    'او از شاگردان کوشا و دارای سیرت و سلوک نیک است. از خداوند تعالی توفیق عمل صالح را خواهانیم.',
  attestationLead: (school) => `اداره ${school} تصدیق می‌کند که شاگرد `,
  attestationBetween: ' فرزند ',
  attestationEnding: (result, exam, grade) => {
    if (result === 'pass') return ` در ${exam} کامیاب شده و درجه او ${grade} است.`;
    if (result === 'fail') return ` در ${exam} ناکام شده و درجه او ${grade} است.`;
    return ` نتیجه او در ${exam} هنوز تکمیل نشده است.`;
  },
};

const english: KashfCardText = {
  title: 'Kashf al-Darajat',
  subject: 'Subject',
  marks: 'Marks',
  combined: 'Combined',
  fullName: 'Full name',
  fatherName: 'Father name',
  rollNumber: 'Roll number',
  className: 'Class',
  admissionNo: 'Admission no',
  dateOfBirth: 'Date of birth',
  examA: 'First exam',
  examB: 'Second exam',
  minimumMarks: 'Minimum marks',
  maximumMarks: 'Full marks',
  obtainedMarks: 'Marks obtained',
  totalMarks: 'Total marks',
  passingTotal: 'Passing total',
  overallPercentage: 'Percentage',
  overallGrade: 'Grade',
  overallResult: 'Result',
  absenceCount: 'Absences',
  marksCut: 'Marks cut',
  totalRaw: 'Total before deduction',
  missingMark: 'Missing mark',
  notInExam: 'Not in this exam',
  absent: 'Absent',
  incomplete: 'Incomplete',
  pass: 'Pass',
  fail: 'Fail',
  principal: 'Principal',
  schoolSeal: 'School seal',
  dateIssued: 'Date issued',
  notEnrolledSecond: 'This student is not enrolled in the second exam.',
  conduct:
    'He is among the diligent students and of good conduct. We ask God to grant him success in righteous work.',
  attestationLead: (school) => `The administration of ${school} certifies that `,
  attestationBetween: ', son of ',
  attestationEnding: (result, exam, grade) => {
    if (result === 'pass') return `, passed ${exam} with the grade ${grade}.`;
    if (result === 'fail') return `, did not pass ${exam} with the grade ${grade}.`;
    return `, has an incomplete result in ${exam}.`;
  },
};

const packs: Record<string, KashfCardText> = {
  ar: arabic,
  ps: pashto,
  fa: dari,
  en: english,
};

export function kashfCardTextFor(language: string): KashfCardText {
  return packs[language] ?? arabic;
}

/** Arabic wording, kept for callers that have not picked a language yet. */
export const kashfCardText = arabic;
