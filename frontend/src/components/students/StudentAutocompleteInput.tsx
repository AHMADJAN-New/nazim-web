import React, { useId, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface StudentAutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    suggestions: string[];
    className?: string;
}

/**
 * Simple autocomplete using HTML datalist.
 * - Contains-style matching is handled by browser filtering and user typing.
 * - RTL direction is applied from language hook.
 */
export const StudentAutocompleteInput = React.forwardRef<HTMLInputElement, StudentAutocompleteInputProps>(
    ({ suggestions, className, ...inputProps }, ref) => {
        const listId = useId();
        const { isRTL } = useLanguage();

        // Deduplicate and limit to reasonable size
        const options = useMemo(() => Array.from(new Set(suggestions)).slice(0, 500), [suggestions]);

        return (
            <>
                <Input
                    ref={ref}
                    list={listId}
                    className={cn(isRTL ? 'text-right' : 'text-left', className)}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    {...inputProps}
                />
                <datalist id={listId}>
                    {options.map((opt, idx) => (
                        <option key={`${opt}-${idx}`} value={opt} />
                    ))}
                </datalist>
            </>
        );
    }
);

StudentAutocompleteInput.displayName = 'StudentAutocompleteInput';

export default StudentAutocompleteInput;


