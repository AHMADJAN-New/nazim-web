import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ClassYearUrlFilterValues {
    academicYearId?: string;
    classId?: string;
    classAcademicYearId?: string;
    tab?: string;
}

/**
 * Applies class-year deep-link query params once when present in the URL.
 */
export function useClassYearUrlFilters(apply: (values: ClassYearUrlFilterValues) => void): void {
    const [searchParams] = useSearchParams();
    const applyRef = useRef(apply);
    applyRef.current = apply;

    useEffect(() => {
        const academicYearId = searchParams.get('academicYearId') ?? undefined;
        const classId = searchParams.get('classId') ?? undefined;
        const classAcademicYearId = searchParams.get('classAcademicYearId') ?? undefined;
        const tab = searchParams.get('tab') ?? undefined;

        if (!academicYearId && !classId && !classAcademicYearId && !tab) {
            return;
        }

        applyRef.current({ academicYearId, classId, classAcademicYearId, tab });
    }, [searchParams]);
}
