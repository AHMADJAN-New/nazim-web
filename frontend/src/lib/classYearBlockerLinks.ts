import type { TranslationKey } from '@/lib/translations/types';

export interface ClassYearBlockerContext {
    classAcademicYearId?: string;
    academicYearId?: string;
    classId?: string;
}

export const CLASS_YEAR_URL_PARAMS = {
    academicYearId: 'academicYearId',
    classId: 'classId',
    classAcademicYearId: 'classAcademicYearId',
    tab: 'tab',
} as const;

export const CLASS_YEAR_BLOCKER_KEYS: Record<string, TranslationKey> = {
    student_admissions: 'academic.classes.blockerStudentAdmissions',
    exam_classes: 'academic.classes.blockerExamClasses',
    class_subjects: 'academic.classes.blockerClassSubjects',
    teacher_subject_assignments: 'academic.classes.blockerTeacherSubjectAssignments',
    timetable_entries: 'academic.classes.blockerTimetableEntries',
    fee_structures: 'academic.classes.blockerFeeStructures',
    fee_assignments: 'academic.classes.blockerFeeAssignments',
    exam_paper_templates: 'academic.classes.blockerExamPaperTemplates',
    questions: 'academic.classes.blockerQuestions',
};

function buildSearchParams(ctx: ClassYearBlockerContext, extra?: Record<string, string>): string {
    const params = new URLSearchParams();
    if (ctx.academicYearId) {
        params.set(CLASS_YEAR_URL_PARAMS.academicYearId, ctx.academicYearId);
    }
    if (ctx.classId) {
        params.set(CLASS_YEAR_URL_PARAMS.classId, ctx.classId);
    }
    if (ctx.classAcademicYearId) {
        params.set(CLASS_YEAR_URL_PARAMS.classAcademicYearId, ctx.classAcademicYearId);
    }
    if (extra) {
        Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    }
    const query = params.toString();
    return query ? `?${query}` : '';
}

const BLOCKER_ROUTES: Record<string, (ctx: ClassYearBlockerContext) => string> = {
    student_admissions: (ctx) => `/admissions${buildSearchParams(ctx)}`,
    exam_classes: (ctx) => `/exams/enrollment${buildSearchParams(ctx)}`,
    class_subjects: (ctx) =>
        `/settings/subjects${buildSearchParams(ctx, { tab: 'classSubjects' })}`,
    teacher_subject_assignments: (ctx) =>
        `/settings/teacher-subject-assignments${buildSearchParams(ctx)}`,
    timetable_entries: (ctx) => `/academic/timetable-generation${buildSearchParams(ctx)}`,
    fee_structures: (ctx) => `/finance/fees/structures${buildSearchParams(ctx)}`,
    fee_assignments: (ctx) => `/finance/fees/assignments${buildSearchParams(ctx)}`,
    exam_paper_templates: (ctx) => `/exams/paper-templates${buildSearchParams(ctx)}`,
    questions: (ctx) => `/exams/question-bank${buildSearchParams(ctx)}`,
};

export function buildAdmissionsDeepLink(
    ctx: ClassYearBlockerContext,
    extra?: { search?: string; placement?: string }
): string {
    const params: Record<string, string> = {};
    if (extra?.search) {
        params.search = extra.search;
    }
    if (extra?.placement) {
        params.placement = extra.placement;
    }
    return `/admissions${buildSearchParams(ctx, params)}`;
}

export function buildAcademicYearClassesLink(
    academicYearId: string,
    classAcademicYearId?: string
): string {
    const params = new URLSearchParams();
    params.set(CLASS_YEAR_URL_PARAMS.academicYearId, academicYearId);
    params.set(CLASS_YEAR_URL_PARAMS.tab, 'year');
    if (classAcademicYearId) {
        params.set(CLASS_YEAR_URL_PARAMS.classAcademicYearId, classAcademicYearId);
    }
    return `/settings/classes?${params.toString()}`;
}

export function buildClassYearBlockerLink(
    blockerKey: string,
    ctx: ClassYearBlockerContext
): string | null {
    const build = BLOCKER_ROUTES[blockerKey];
    if (!build || !ctx.classAcademicYearId) {
        return null;
    }
    return build(ctx);
}

export function hasClassYearBlockerLink(blockerKey: string): boolean {
    return blockerKey in BLOCKER_ROUTES;
}
