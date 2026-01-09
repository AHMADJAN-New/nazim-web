import { Users, GraduationCap, UserCircle, BookOpen, Calendar, School } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useLanguage } from '@/hooks/useLanguage';

interface GlobalSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function GlobalSearchCommand({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
}: GlobalSearchCommandProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  // Use local state for command input to allow normal typing
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: results, isLoading, error } = useGlobalSearch(localQuery);
  
  // Sync local query with prop when dialog opens
  useEffect(() => {
    if (open) {
      setLocalQuery(searchQuery);
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }, [open, searchQuery]);
  
  // Always ensure results is defined (even if empty)
  const safeResults = results || {
    students: [],
    classes: [],
    staff: [],
    subjects: [],
    academic_years: [],
    schools: [],
  };
  
  // Debug logging in development
  if (import.meta.env.DEV && open) {
    console.log('[GlobalSearchCommand] Search query:', searchQuery, 'Length:', searchQuery.length);
    console.log('[GlobalSearchCommand] Results:', safeResults);
    console.log('[GlobalSearchCommand] Is loading:', isLoading);
    console.log('[GlobalSearchCommand] Error:', error);
  }
  
  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
        if (input) {
          input.focus();
          // If there's existing search query, select it so user can continue typing
          if (searchQuery) {
            input.setSelectionRange(0, searchQuery.length);
          }
        }
      }, 100);
    }
  }, [open, searchQuery]);

  const handleSelect = (result: { id: string; type: string }) => {
    let path = '';
    
    switch (result.type) {
      case 'student':
        path = `/students/${result.id}`;
        break;
      case 'class':
        path = `/classes/${result.id}`;
        break;
      case 'staff':
        path = `/staff/${result.id}`;
        break;
      case 'subject':
        path = `/settings/subjects/${result.id}`;
        break;
      case 'academic_year':
        path = `/settings/academic-years/${result.id}`;
        break;
      case 'school':
        path = `/settings/schools/${result.id}`;
        break;
      default:
        return;
    }

    navigate(path);
    onOpenChange(false);
    onSearchQueryChange('');
  };

  const hasResults = (
    safeResults.students.length > 0 ||
    safeResults.classes.length > 0 ||
    safeResults.staff.length > 0 ||
    safeResults.subjects.length > 0 ||
    safeResults.academic_years.length > 0 ||
    safeResults.schools.length > 0
  );

  return (
    <CommandDialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        // Clear both local and parent query when closing
        setLocalQuery('');
        onSearchQueryChange('');
      }
    }}>
      <CommandInput
        ref={inputRef}
        placeholder={t('search.placeholder')}
        value={localQuery}
        onValueChange={(value) => {
          // Update immediately - don't use function form to avoid stale closures
          setLocalQuery(value);
          onSearchQueryChange(value);
        }}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t('common.loading')}...
          </div>
        )}
        {!isLoading && !hasResults && localQuery.trim().length >= 2 && (
          <CommandEmpty>{t('events.noResults')}</CommandEmpty>
        )}
        {!isLoading && localQuery.trim().length < 2 && (
          <CommandEmpty>{t('search.startTyping')}</CommandEmpty>
        )}
        
        {safeResults.students.length > 0 && (
          <CommandGroup heading={t('table.students')}>
            {safeResults.students.map((student) => (
              <CommandItem
                key={student.id}
                value={`student-${student.id}-${student.name}`}
                onSelect={() => handleSelect(student)}
              >
                <Users className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{student.name}</span>
                  {student.admission_no && (
                    <span className="text-xs text-muted-foreground">
                      {t('examReports.admissionNo')}: {student.admission_no}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {safeResults.classes.length > 0 && (
          <CommandGroup heading={t('nav.classes')}>
            {safeResults.classes.map((classItem) => (
              <CommandItem
                key={classItem.id}
                value={`class-${classItem.id}-${classItem.name}`}
                onSelect={() => handleSelect(classItem)}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{classItem.name}</span>
                  {classItem.code && (
                    <span className="text-xs text-muted-foreground">
                      {t('events.code')}: {classItem.code}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {safeResults.staff.length > 0 && (
          <CommandGroup heading={t('settings.staff')}>
            {safeResults.staff.map((staff) => (
              <CommandItem
                key={staff.id}
                value={`staff-${staff.id}-${staff.name}`}
                onSelect={() => handleSelect(staff)}
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{staff.name}</span>
                  {staff.position && (
                    <span className="text-xs text-muted-foreground">
                      {staff.position}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {safeResults.subjects.length > 0 && (
          <CommandGroup heading={t('events.subjects')}>
            {safeResults.subjects.map((subject) => (
              <CommandItem
                key={subject.id}
                value={`subject-${subject.id}-${subject.name}`}
                onSelect={() => handleSelect(subject)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{subject.name}</span>
                  {subject.code && (
                    <span className="text-xs text-muted-foreground">
                      {t('events.code')}: {subject.code}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {safeResults.academic_years.length > 0 && (
          <CommandGroup heading={t('search.academicYears')}>
            {safeResults.academic_years.map((year) => (
              <CommandItem
                key={year.id}
                value={`academic-year-${year.id}-${year.name}`}
                onSelect={() => handleSelect(year)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>{year.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {safeResults.schools.length > 0 && (
          <CommandGroup heading={t('search.schools')}>
            {safeResults.schools.map((school) => (
              <CommandItem
                key={school.id}
                value={`school-${school.id}-${school.name}`}
                onSelect={() => handleSelect(school)}
              >
                <School className="mr-2 h-4 w-4" />
                <span>{school.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
