-- ============================================================================
-- Seed 3 Student Admissions
-- ============================================================================
-- This migration seeds 3 student admission records using existing data
-- from the database (students, classes, academic years, residency types)
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;

DO $$
DECLARE
    org_id UUID;
    school_id UUID;
    v_academic_year_id UUID;  -- Use different name to avoid ambiguity
    v_class_id UUID;  -- Use different name to avoid ambiguity
    class_academic_year_id UUID;
    residency_type_id UUID;
    student1_id UUID;
    student2_id UUID;
    student3_id UUID;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    admission_date DATE := CURRENT_DATE;
BEGIN
    -- Get the Islamic School Pashto organization
    SELECT id INTO org_id 
    FROM public.organizations 
    WHERE slug = 'islamic-school-pashto' 
    LIMIT 1;
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization "islamic-school-pashto" not found. Please run the Islamic data seeder first.';
    END IF;
    
    -- Get the school for this organization
    SELECT id INTO school_id 
    FROM public.school_branding 
    WHERE organization_id = org_id 
    AND is_active = TRUE 
    LIMIT 1;
    
    IF school_id IS NULL THEN
        RAISE EXCEPTION 'No active school found for organization. Please run the Islamic data seeder first.';
    END IF;
    
    -- Get the current academic year (global or organization-specific)
    SELECT id INTO v_academic_year_id 
    FROM public.academic_years 
    WHERE (organization_id IS NULL OR organization_id = org_id)
    AND is_current = TRUE 
    AND deleted_at IS NULL
    ORDER BY organization_id NULLS LAST
    LIMIT 1;
    
    IF v_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'No current academic year found. Please run the academic years seeder first.';
    END IF;
    
    -- Get a class for this organization (preferably first grade)
    SELECT id INTO v_class_id 
    FROM public.classes 
    WHERE organization_id = org_id 
    AND deleted_at IS NULL
    AND is_active = TRUE
    ORDER BY grade_level ASC NULLS LAST
    LIMIT 1;
    
    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'No classes found for organization. Please run the Islamic data seeder first.';
    END IF;
    
    -- Get class_academic_year for this class and academic year
    -- Using v_class_id and v_academic_year_id variables with table alias to avoid ambiguity
    SELECT cay.id INTO class_academic_year_id 
    FROM public.class_academic_years cay
    WHERE cay.class_id = v_class_id 
    AND cay.academic_year_id = v_academic_year_id
    AND cay.deleted_at IS NULL
    AND cay.is_active = TRUE
    LIMIT 1;
    
    IF class_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'No class_academic_year found for class and academic year. Please run the Islamic data seeder first.';
    END IF;
    
    -- Get residency type (نهاري - Day)
    SELECT id INTO residency_type_id 
    FROM public.residency_types 
    WHERE (organization_id IS NULL OR organization_id = org_id)
    AND code = 'day'
    AND deleted_at IS NULL
    AND is_active = TRUE
    ORDER BY organization_id NULLS LAST
    LIMIT 1;
    
    IF residency_type_id IS NULL THEN
        RAISE EXCEPTION 'No residency type found. Please run the residency types seeder first.';
    END IF;
    
    -- Get 3 students from this organization (from the students seeder)
    -- Get first student (male)
    SELECT id INTO student1_id 
    FROM public.students 
    WHERE organization_id = org_id 
    AND deleted_at IS NULL
    AND gender = 'male'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Get second student (female)
    SELECT id INTO student2_id 
    FROM public.students 
    WHERE organization_id = org_id 
    AND deleted_at IS NULL
    AND gender = 'female'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Get third student (any gender)
    SELECT id INTO student3_id 
    FROM public.students 
    WHERE organization_id = org_id 
    AND deleted_at IS NULL
    AND id NOT IN (COALESCE(student1_id, '00000000-0000-0000-0000-000000000000'::uuid), 
                   COALESCE(student2_id, '00000000-0000-0000-0000-000000000000'::uuid))
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF student1_id IS NULL OR student2_id IS NULL OR student3_id IS NULL THEN
        RAISE EXCEPTION 'Not enough students found. Please run the students seeder first (need at least 3 students).';
    END IF;
    
    -- Insert 3 admission records
    INSERT INTO public.student_admissions (
        organization_id,
        school_id,
        student_id,
        academic_year_id,
        class_id,
        class_academic_year_id,
        residency_type_id,
        room_id,
        admission_year,
        admission_date,
        enrollment_status,
        enrollment_type,
        shift,
        is_boarder,
        fee_status,
        placement_notes
    )
    VALUES
        -- Admission 1: Active student (male)
        (
            org_id,
            school_id,
            student1_id,
            v_academic_year_id,
            v_class_id,  -- Use the variable name
            class_academic_year_id,
            residency_type_id,
            NULL, -- No room assigned
            current_year::TEXT,
            admission_date,
            'active',
            'regular',
            'morning',
            FALSE, -- Day scholar
            'paid',
            'د لومړی ټولګی کې د زده کړو پیل'
        ),
        -- Admission 2: Admitted student (female)
        (
            org_id,
            school_id,
            student2_id,
            v_academic_year_id,
            v_class_id,  -- Use the variable name
            class_academic_year_id,
            residency_type_id,
            NULL, -- No room assigned
            current_year::TEXT,
            admission_date - INTERVAL '5 days', -- Admitted 5 days ago
            'admitted',
            'regular',
            'morning',
            FALSE, -- Day scholar
            'partial',
            'د لومړی ټولګی کې د زده کړو لپاره ثبت شوی'
        ),
        -- Admission 3: Pending student
        (
            org_id,
            school_id,
            student3_id,
            v_academic_year_id,
            v_class_id,  -- Use the variable name
            class_academic_year_id,
            residency_type_id,
            NULL, -- No room assigned
            current_year::TEXT,
            admission_date - INTERVAL '10 days', -- Applied 10 days ago
            'pending',
            'regular',
            'afternoon',
            FALSE, -- Day scholar
            'pending',
            'د لومړی ټولګی کې د زده کړو لپاره غوښتنه'
        )
    ON CONFLICT (student_id, academic_year_id) 
    WHERE deleted_at IS NULL
    DO NOTHING;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Student Admissions Seeder Complete:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Organization: مدرسۀ اسلامی';
    RAISE NOTICE '  Admissions Seeded: 3';
    RAISE NOTICE '  - 1 Active admission';
    RAISE NOTICE '  - 1 Admitted admission';
    RAISE NOTICE '  - 1 Pending admission';
    RAISE NOTICE '  Academic Year: %', (SELECT name FROM public.academic_years WHERE id = v_academic_year_id);
    RAISE NOTICE '  Class: %', (SELECT name FROM public.classes WHERE id = v_class_id);
    RAISE NOTICE '========================================';
END $$;

