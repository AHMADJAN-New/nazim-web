import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, UserCircle, BookOpen, Calendar, School } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface InlineSearchDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  anchorEl?: HTMLElement | null;
}

export function InlineSearchDropdown({
  open,
  onOpenChange,
  searchQuery,
  anchorEl,
}: InlineSearchDropdownProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: results, isLoading, error } = useGlobalSearch(searchQuery);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
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
    console.log('[InlineSearchDropdown] Search query:', searchQuery, 'Length:', searchQuery.length);
    console.log('[InlineSearchDropdown] Results:', safeResults);
    console.log('[InlineSearchDropdown] Is loading:', isLoading);
    console.log('[InlineSearchDropdown] Error:', error);
  }

  // Calculate position based on anchor element
  useEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, anchorEl]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking on the anchor element (search input)
      if (anchorEl && anchorEl.contains(target)) {
        return;
      }
      
      // Don't close if clicking inside the dropdown
      if (contentRef.current && contentRef.current.contains(target)) {
        return;
      }
      
      // Close if clicking outside both
      onOpenChange(false);
    };

    // Use mousedown instead of click to catch the event earlier
    // But add a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [open, anchorEl, onOpenChange]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

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
  };

  const hasResults = (
    safeResults.students.length > 0 ||
    safeResults.classes.length > 0 ||
    safeResults.staff.length > 0 ||
    safeResults.subjects.length > 0 ||
    safeResults.academic_years.length > 0 ||
    safeResults.schools.length > 0
  );

  if (!open || !anchorEl || !position) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 rounded-md border bg-popover text-popover-foreground shadow-md",
        "max-h-[300px] overflow-hidden"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
    >
      <Command shouldFilter={false}>
        <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('common.loading')}...
              </div>
            )}
            {!isLoading && !hasResults && searchQuery.trim().length >= 2 && (
              <CommandEmpty>{t('search.noResults')}</CommandEmpty>
            )}
            {!isLoading && searchQuery.trim().length < 2 && (
              <CommandEmpty>{t('search.startTyping')}</CommandEmpty>
            )}
            
            {safeResults.students.length > 0 && (
              <CommandGroup heading={t('search.students')}>
                {safeResults.students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`${student.name} ${student.admission_no || ''} ${student.father_name || ''}`}
                    onSelect={() => handleSelect(student)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{student.name}</span>
                      {student.admission_no && (
                        <span className="text-xs text-muted-foreground">
                          {t('search.admissionNo')}: {student.admission_no}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {safeResults.classes.length > 0 && (
              <CommandGroup heading={t('search.classes')}>
                {safeResults.classes.map((classItem) => (
                  <CommandItem
                    key={classItem.id}
                    value={`${classItem.name} ${classItem.code || ''}`}
                    onSelect={() => handleSelect(classItem)}
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{classItem.name}</span>
                      {classItem.code && (
                        <span className="text-xs text-muted-foreground">
                          {t('search.code')}: {classItem.code}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {safeResults.staff.length > 0 && (
              <CommandGroup heading={t('search.staff')}>
                {safeResults.staff.map((staff) => (
                  <CommandItem
                    key={staff.id}
                    value={`${staff.name} ${staff.employee_id || ''} ${staff.position || ''}`}
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
              <CommandGroup heading={t('search.subjects')}>
                {safeResults.subjects.map((subject) => (
                  <CommandItem
                    key={subject.id}
                    value={`${subject.name} ${subject.code || ''}`}
                    onSelect={() => handleSelect(subject)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{subject.name}</span>
                      {subject.code && (
                        <span className="text-xs text-muted-foreground">
                          {t('search.code')}: {subject.code}
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
                    value={`${year.name} ${year.start_year || ''} ${year.end_year || ''}`}
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
                    value={school.name}
                    onSelect={() => handleSelect(school)}
                  >
                    <School className="mr-2 h-4 w-4" />
                    <span>{school.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
    </div>
  );
}
