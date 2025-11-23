-- ============================================================================
-- Change teacher_subject_assignments.teacher_id to reference staff.id
-- ============================================================================
-- This allows staff to be assigned as teachers even if they don't have a profile/account.
-- If a profile is created later and linked to the staff, they can log in and the assignment still works.
-- ============================================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.teacher_subject_assignments
    DROP CONSTRAINT IF EXISTS teacher_subject_assignments_teacher_id_fkey;

-- Step 2: Change the column to reference staff.id instead of profiles.id
ALTER TABLE public.teacher_subject_assignments
    DROP CONSTRAINT IF EXISTS teacher_subject_assignments_teacher_id_fkey,
    ADD CONSTRAINT teacher_subject_assignments_teacher_id_fkey 
        FOREIGN KEY (teacher_id) 
        REFERENCES public.staff(id) 
        ON DELETE CASCADE;

-- Step 3: Update the index comment to reflect the change
COMMENT ON COLUMN public.teacher_subject_assignments.teacher_id IS 
    'References staff.id - allows staff to be assigned as teachers even without a profile/account. If a profile is created later and linked to staff, they can log in.';

