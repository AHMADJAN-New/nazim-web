-- ============================================================================
-- Seed Islamic Classes, Subjects, and Staff in Pashto
-- ============================================================================
-- This migration seeds Islamic educational data in Pashto language
-- Includes: Staff Types, Classes, Subjects, and Staff Members
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;

-- ============================================================================
-- Step 1: Get or Create Organization
-- ============================================================================
DO $$
DECLARE
    org_id UUID;
    org_slug TEXT := 'islamic-school-pashto';
BEGIN
    -- Get existing organization or create new one
    SELECT id INTO org_id 
    FROM public.organizations 
    WHERE slug = org_slug 
    LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug, settings)
        VALUES ('مدرسۀ اسلامی', org_slug, '{"theme":"green","language":"ps"}'::jsonb)
        RETURNING id INTO org_id;
    END IF;
    
    -- Ensure school exists
    IF NOT EXISTS (SELECT 1 FROM public.school_branding WHERE organization_id = org_id) THEN
        INSERT INTO public.school_branding (
            organization_id, 
            school_name, 
            school_address, 
            school_phone, 
            is_active
        )
        VALUES (
            org_id,
            'مدرسۀ اسلامی مرکزی',
            'کابل، افغانستان',
            '+93-700-000-000',
            TRUE
        );
    END IF;
    
    -- Store org_id in a temporary table for use in subsequent inserts
    CREATE TEMP TABLE IF NOT EXISTS temp_org_id (id UUID);
    DELETE FROM temp_org_id;
    INSERT INTO temp_org_id (id) VALUES (org_id);
END $$;

-- ============================================================================
-- Step 2: Seed Staff Types (Islamic Roles in Pashto)
-- ============================================================================
INSERT INTO public.staff_types (organization_id, name, code, description, display_order, is_active)
SELECT 
    (SELECT id FROM temp_org_id),
    name,
    code,
    description,
    display_order,
    TRUE
FROM (VALUES
    ('استاد', 'teacher', 'د قرآن کریم، حدیث، فقه او نورو اسلامی مضامینو استاد', 1),
    ('مولوی', 'molvi', 'د دیني علومو متخصص استاد', 2),
    ('حافظ', 'hafiz', 'د قرآن کریم حافظ او استاد', 3),
    ('مدیر', 'admin', 'د مدرسې مدیر', 4),
    ('معاون', 'assistant', 'د مدیر معاون', 5),
    ('محاسب', 'accountant', 'د مالي چارو مسئول', 6),
    ('کتابدار', 'librarian', 'د کتابتون مسئول', 7),
    ('خادم', 'custodian', 'د مدرسې خادم', 8),
    ('امنیت', 'security', 'د امنیت مسئول', 9)
) AS v(name, code, description, display_order)
ON CONFLICT (code, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
WHERE deleted_at IS NULL
DO NOTHING;

-- ============================================================================
-- Step 3: Seed Islamic Classes (in Pashto)
-- ============================================================================
INSERT INTO public.classes (organization_id, name, code, grade_level, description, default_capacity, is_active)
SELECT 
    (SELECT id FROM temp_org_id),
    name,
    code,
    grade_level,
    description,
    CASE WHEN code IN ('HAFIZ-CLASS', 'DINI-ULUM') THEN 25 ELSE 30 END,
    TRUE
FROM (VALUES
    ('د لومړی ټولګی', 'CLASS-01', 1, 'د لومړی ټولګی - د اساسي زده کړو پیل'),
    ('د دوهم ټولګی', 'CLASS-02', 2, 'د دوهم ټولګی'),
    ('د دریم ټولګی', 'CLASS-03', 3, 'د دریم ټولګی'),
    ('د څلورم ټولګی', 'CLASS-04', 4, 'د څلورم ټولګی'),
    ('د پنځم ټولګی', 'CLASS-05', 5, 'د پنځم ټولګی'),
    ('د شپږم ټولګی', 'CLASS-06', 6, 'د شپږم ټولګی'),
    ('د اووم ټولګی', 'CLASS-07', 7, 'د اووم ټولګی'),
    ('د اتم ټولګی', 'CLASS-08', 8, 'د اتم ټولګی'),
    ('د نهم ټولګی', 'CLASS-09', 9, 'د نهم ټولګی'),
    ('د لسم ټولګی', 'CLASS-10', 10, 'د لسم ټولګی'),
    ('د یوولسم ټولګی', 'CLASS-11', 11, 'د یوولسم ټولګی'),
    ('د دولسم ټولګی', 'CLASS-12', 12, 'د دولسم ټولګی'),
    ('د حافظانو ټولګی', 'HAFIZ-CLASS', NULL, 'د قرآن کریم د حفظ ځانګړی ټولګی'),
    ('د دیني علومو ټولګی', 'DINI-ULUM', NULL, 'د دیني علومو ځانګړی ټولګی')
) AS v(name, code, grade_level, description)
ON CONFLICT (code, organization_id) 
WHERE deleted_at IS NULL
DO NOTHING;

-- ============================================================================
-- Step 4: Seed Islamic Subjects (in Pashto)
-- ============================================================================
INSERT INTO public.subjects (organization_id, name, code, description, is_active)
SELECT 
    (SELECT id FROM temp_org_id),
    name,
    code,
    description,
    TRUE
FROM (VALUES
    ('قرآن کریم', 'QURAN', 'د قرآن کریم د تلاوت، حفظ او تفسیر زده کړه'),
    ('حدیث شریف', 'HADITH', 'د حدیث شریف د زده کړې او فقهي احکامو مطالعه'),
    ('فقه', 'FIQH', 'د اسلامي فقه د اصولو او احکامو زده کړه'),
    ('عقیده', 'AQIDA', 'د اسلامي عقیدې او ایمان د اصولو زده کړه'),
    ('سیرت النبی', 'SEERAT', 'د پیغمبر اکرم صلی الله علیه وسلم د ژوند او سیرت مطالعه'),
    ('عربي ژبه', 'ARABIC', 'د عربي ژبې د قواعدو او ادب زده کړه'),
    ('پښتو', 'PASHTO', 'د پښتو ژبې د ادب او قواعدو زده کړه'),
    ('دری', 'DARI', 'د دری ژبې د ادب او قواعدو زده کړه'),
    ('انګلیسي', 'ENGLISH', 'د انګلیسي ژبې د قواعدو او ادب زده کړه'),
    ('ریاضیات', 'MATH', 'د ریاضیاتو د اصولو او محاسبو زده کړه'),
    ('علوم', 'SCIENCE', 'د طبیعي علومو زده کړه'),
    ('تاریخ', 'HISTORY', 'د اسلامي او نړیوال تاریخ زده کړه'),
    ('جغرافیه', 'GEOGRAPHY', 'د جغرافیې د اصولو زده کړه'),
    ('د اسلامي اخلاقو', 'AKHLAQ', 'د اسلامي اخلاقو او آدابو زده کړه'),
    ('د دعا او ذکر', 'DUA', 'د دعا، ذکر او عباداتو زده کړه')
) AS v(name, code, description)
ON CONFLICT (code, organization_id) 
WHERE deleted_at IS NULL
DO NOTHING;

-- ============================================================================
-- Step 5: Seed Staff Members (Islamic Names in Pashto)
-- ============================================================================
DO $$
DECLARE
    org_id UUID;
    teacher_type_id UUID;
    molvi_type_id UUID;
    hafiz_type_id UUID;
    admin_type_id UUID;
    school_id UUID;
BEGIN
    -- Get organization ID
    SELECT id INTO org_id FROM temp_org_id;
    
    -- Get staff type IDs
    SELECT id INTO teacher_type_id FROM public.staff_types 
    WHERE organization_id = org_id AND code = 'teacher' LIMIT 1;
    
    SELECT id INTO molvi_type_id FROM public.staff_types 
    WHERE organization_id = org_id AND code = 'molvi' LIMIT 1;
    
    SELECT id INTO hafiz_type_id FROM public.staff_types 
    WHERE organization_id = org_id AND code = 'hafiz' LIMIT 1;
    
    SELECT id INTO admin_type_id FROM public.staff_types 
    WHERE organization_id = org_id AND code = 'admin' LIMIT 1;
    
    -- Get school ID
    SELECT id INTO school_id FROM public.school_branding 
    WHERE organization_id = org_id AND is_active = TRUE LIMIT 1;
    
    -- Insert Staff Members
    INSERT INTO public.staff (
        organization_id,
        employee_id,
        staff_type_id,
        school_id,
        first_name,
        father_name,
        grandfather_name,
        email,
        phone_number,
        status,
        position,
        duty
    )
    SELECT 
        org_id,
        employee_id,
        staff_type_id,
        school_id,
        first_name,
        father_name,
        grandfather_name,
        email,
        phone_number,
        'active',
        position,
        duty
    FROM (VALUES
        -- Teachers
        ('EMP-001', teacher_type_id, 'محمد', 'عبدالله', 'احمد', 'mohammad.abdullah@islamicschool.af', '+93-700-001-0001', 'استاد', 'د قرآن کریم استاد'),
        ('EMP-002', teacher_type_id, 'عبدالرحمن', 'محمد', 'علی', 'abdulrahman.mohammad@islamicschool.af', '+93-700-001-0002', 'استاد', 'د حدیث استاد'),
        ('EMP-003', teacher_type_id, 'احمد', 'حسین', 'محمد', 'ahmad.hussain@islamicschool.af', '+93-700-001-0003', 'استاد', 'د فقه استاد'),
        ('EMP-004', teacher_type_id, 'علی', 'محمد', 'حسن', 'ali.mohammad@islamicschool.af', '+93-700-001-0004', 'استاد', 'د عربي ژبې استاد'),
        ('EMP-005', teacher_type_id, 'حسین', 'علی', 'احمد', 'hussain.ali@islamicschool.af', '+93-700-001-0005', 'استاد', 'د ریاضیاتو استاد'),
        ('EMP-006', teacher_type_id, 'عمر', 'محمد', 'عبدالله', 'omar.mohammad@islamicschool.af', '+93-700-001-0006', 'استاد', 'د علومو استاد'),
        
        -- Molvi (Islamic Scholars)
        ('EMP-007', molvi_type_id, 'مولوی', 'عبدالرحیم', 'محمد', 'molvi.abdulrahim@islamicschool.af', '+93-700-001-0007', 'مولوی', 'د دیني علومو متخصص'),
        ('EMP-008', molvi_type_id, 'مولوی', 'محمد', 'عبدالله', 'molvi.mohammad@islamicschool.af', '+93-700-001-0008', 'مولوی', 'د فقه او اصولو استاد'),
        
        -- Hafiz (Quran Memorizers)
        ('EMP-009', hafiz_type_id, 'حافظ', 'محمد', 'احمد', 'hafiz.mohammad@islamicschool.af', '+93-700-001-0009', 'حافظ', 'د قرآن کریم حافظ او استاد'),
        ('EMP-010', hafiz_type_id, 'حافظ', 'عبدالله', 'محمد', 'hafiz.abdullah@islamicschool.af', '+93-700-001-0010', 'حافظ', 'د قرآن کریم حفظ استاد'),
        
        -- Admin
        ('EMP-011', admin_type_id, 'عبدالواحد', 'محمد', 'علی', 'abdulwahed.mohammad@islamicschool.af', '+93-700-001-0011', 'مدیر', 'د مدرسې مدیر')
    ) AS v(employee_id, staff_type_id, first_name, father_name, grandfather_name, email, phone_number, position, duty)
    ON CONFLICT (employee_id, organization_id) DO NOTHING;
END $$;

-- ============================================================================
-- Step 6: Seed Academic Years (in Pashto)
-- ============================================================================
DO $$
DECLARE
    org_id UUID;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    next_year INTEGER := current_year + 1;
    year_name TEXT;
    start_date DATE;
    end_date DATE;
    academic_year_id UUID;
BEGIN
    SELECT id INTO org_id FROM temp_org_id;
    
    -- Create current academic year
    year_name := current_year || '-' || next_year || ' کال';
    start_date := DATE(current_year || '-09-01'); -- September 1st
    end_date := DATE(next_year || '-06-30'); -- June 30th
    
    -- Check if current academic year already exists
    SELECT id INTO academic_year_id
    FROM public.academic_years
    WHERE organization_id = org_id
    AND is_current = TRUE
    AND deleted_at IS NULL
    LIMIT 1;
    
    IF academic_year_id IS NULL THEN
        INSERT INTO public.academic_years (
            organization_id,
            name,
            start_date,
            end_date,
            is_current,
            description,
            status
        )
        VALUES (
            org_id,
            year_name,
            start_date,
            end_date,
            TRUE,
            'د ' || year_name || ' د زده کړو کال',
            'active'
        )
        RETURNING id INTO academic_year_id;
    ELSE
        -- Update existing current year with new dates
        UPDATE public.academic_years
        SET name = year_name,
            start_date = DATE(current_year || '-09-01'),
            end_date = DATE(next_year || '-06-30'),
            description = 'د ' || year_name || ' د زده کړو کال'
        WHERE id = academic_year_id;
    END IF;
    
    -- Store academic_year_id in temp table
    CREATE TEMP TABLE IF NOT EXISTS temp_academic_year_id (id UUID);
    DELETE FROM temp_academic_year_id;
    INSERT INTO temp_academic_year_id (id) VALUES (academic_year_id);
    
    -- Create next academic year (for planning) if it doesn't exist
    year_name := next_year || '-' || (next_year + 1) || ' کال';
    start_date := DATE(next_year || '-09-01');
    end_date := DATE((next_year + 1) || '-06-30');
    
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years
        WHERE organization_id = org_id
        AND name = year_name
        AND deleted_at IS NULL
    ) THEN
        INSERT INTO public.academic_years (
            organization_id,
            name,
            start_date,
            end_date,
            is_current,
            description,
            status
        )
        VALUES (
            org_id,
            year_name,
            start_date,
            end_date,
            FALSE,
            'د ' || year_name || ' د زده کړو کال',
            'active'
        );
    END IF;
END $$;

-- ============================================================================
-- Step 7: Assign Classes to Academic Years (Create Class Academic Years)
-- ============================================================================
DO $$
DECLARE
    v_org_id UUID;
    v_academic_year_id UUID;
    v_school_id UUID;
    class_record RECORD;
    v_class_academic_year_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM temp_org_id;
    SELECT id INTO v_academic_year_id FROM temp_academic_year_id;
    SELECT id INTO v_school_id FROM public.school_branding 
    WHERE organization_id = v_org_id AND is_active = TRUE LIMIT 1;
    
    -- Assign all classes to the current academic year
    FOR class_record IN 
        SELECT id, name, code, default_capacity 
        FROM public.classes 
        WHERE organization_id = v_org_id 
        AND deleted_at IS NULL
        AND is_active = TRUE
    LOOP
        INSERT INTO public.class_academic_years (
            class_id,
            academic_year_id,
            organization_id,
            section_name,
            capacity,
            is_active
        )
        VALUES (
            class_record.id,
            v_academic_year_id,
            v_org_id,
            NULL, -- Default section
            class_record.default_capacity,
            TRUE
        )
        ON CONFLICT (class_id, academic_year_id, COALESCE(section_name, ''))
        WHERE deleted_at IS NULL
        DO NOTHING
        RETURNING id INTO v_class_academic_year_id;
    END LOOP;
END $$;

-- ============================================================================
-- Step 8: Assign Subjects to Classes in Academic Years
-- ============================================================================
DO $$
DECLARE
    v_org_id UUID;
    v_academic_year_id UUID;
    class_record RECORD;
    subject_record RECORD;
    v_class_academic_year_id UUID;
    weekly_hours DECIMAL(4, 2);
BEGIN
    SELECT id INTO v_org_id FROM temp_org_id;
    SELECT id INTO v_academic_year_id FROM temp_academic_year_id;
    
    -- Assign subjects to each class based on grade level
    FOR class_record IN 
        SELECT c.id, c.code, c.grade_level, cay.id as cay_id
        FROM public.classes c
        INNER JOIN public.class_academic_years cay ON cay.class_id = c.id
        WHERE c.organization_id = v_org_id 
        AND cay.academic_year_id = v_academic_year_id
        AND c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND cay.deleted_at IS NULL
    LOOP
        -- Assign core Islamic subjects to all classes
        FOR subject_record IN 
            SELECT id, code, name
            FROM public.subjects
            WHERE organization_id = v_org_id
            AND deleted_at IS NULL
            AND is_active = TRUE
            AND code IN ('QURAN', 'HADITH', 'FIQH', 'AQIDA', 'SEERAT', 'AKHLAQ', 'DUA', 'ARABIC')
        LOOP
            -- Set weekly hours based on subject importance
            weekly_hours := CASE 
                WHEN subject_record.code = 'QURAN' THEN 6.0
                WHEN subject_record.code = 'HADITH' THEN 3.0
                WHEN subject_record.code = 'FIQH' THEN 3.0
                WHEN subject_record.code = 'AQIDA' THEN 2.0
                WHEN subject_record.code = 'SEERAT' THEN 2.0
                WHEN subject_record.code = 'AKHLAQ' THEN 2.0
                WHEN subject_record.code = 'DUA' THEN 2.0
                WHEN subject_record.code = 'ARABIC' THEN 4.0
                ELSE 2.0
            END;
            
            INSERT INTO public.class_subjects (
                class_academic_year_id,
                subject_id,
                organization_id,
                weekly_hours,
                is_active
            )
            VALUES (
                class_record.cay_id,
                subject_record.id,
                v_org_id,
                weekly_hours,
                TRUE
            )
            ON CONFLICT (class_academic_year_id, subject_id)
            WHERE deleted_at IS NULL
            DO NOTHING;
        END LOOP;
        
        -- Assign language subjects based on grade level
        IF class_record.grade_level IS NOT NULL THEN
            -- Pashto for all grades
            FOR subject_record IN 
                SELECT id, code
                FROM public.subjects
                WHERE organization_id = v_org_id
                AND code = 'PASHTO'
                AND deleted_at IS NULL
                AND is_active = TRUE
            LOOP
                INSERT INTO public.class_subjects (
                    class_academic_year_id,
                    subject_id,
                    organization_id,
                    weekly_hours,
                    is_active
                )
                VALUES (
                    class_record.cay_id,
                    subject_record.id,
                    v_org_id,
                    4.0,
                    TRUE
                )
                ON CONFLICT (class_academic_year_id, subject_id)
                WHERE deleted_at IS NULL
                DO NOTHING;
            END LOOP;
            
            -- Dari for grades 4+
            IF class_record.grade_level >= 4 THEN
                FOR subject_record IN 
                    SELECT id, code
                    FROM public.subjects
                    WHERE organization_id = v_org_id
                    AND code = 'DARI'
                    AND deleted_at IS NULL
                    AND is_active = TRUE
                LOOP
                    INSERT INTO public.class_subjects (
                        class_academic_year_id,
                        subject_id,
                        organization_id,
                        weekly_hours,
                        is_active
                    )
                    VALUES (
                        class_record.cay_id,
                        subject_record.id,
                        v_org_id,
                        3.0,
                        TRUE
                    )
                    ON CONFLICT (class_academic_year_id, subject_id)
                    WHERE deleted_at IS NULL
                    DO NOTHING;
                END LOOP;
            END IF;
            
            -- English for grades 3+
            IF class_record.grade_level >= 3 THEN
                FOR subject_record IN 
                    SELECT id, code
                    FROM public.subjects
                    WHERE organization_id = v_org_id
                    AND code = 'ENGLISH'
                    AND deleted_at IS NULL
                    AND is_active = TRUE
                LOOP
                    INSERT INTO public.class_subjects (
                        class_academic_year_id,
                        subject_id,
                        organization_id,
                        weekly_hours,
                        is_active
                    )
                    VALUES (
                        class_record.cay_id,
                        subject_record.id,
                        v_org_id,
                        3.0,
                        TRUE
                    )
                    ON CONFLICT (class_academic_year_id, subject_id)
                    WHERE deleted_at IS NULL
                    DO NOTHING;
                END LOOP;
            END IF;
            
            -- Math and Science for grades 1+
            FOR subject_record IN 
                SELECT id, code
                FROM public.subjects
                WHERE organization_id = v_org_id
                AND code IN ('MATH', 'SCIENCE')
                AND deleted_at IS NULL
                AND is_active = TRUE
            LOOP
                weekly_hours := CASE 
                    WHEN subject_record.code = 'MATH' THEN 5.0
                    WHEN subject_record.code = 'SCIENCE' THEN 3.0
                    ELSE 3.0
                END;
                
                INSERT INTO public.class_subjects (
                    class_academic_year_id,
                    subject_id,
                    organization_id,
                    weekly_hours,
                    is_active
                )
                VALUES (
                    class_record.cay_id,
                    subject_record.id,
                    v_org_id,
                    weekly_hours,
                    TRUE
                )
                ON CONFLICT (class_academic_year_id, subject_id)
                WHERE deleted_at IS NULL
                DO NOTHING;
            END LOOP;
            
            -- History and Geography for grades 4+
            IF class_record.grade_level >= 4 THEN
                FOR subject_record IN 
                    SELECT id, code
                    FROM public.subjects
                    WHERE organization_id = v_org_id
                    AND code IN ('HISTORY', 'GEOGRAPHY')
                    AND deleted_at IS NULL
                    AND is_active = TRUE
                LOOP
                    INSERT INTO public.class_subjects (
                        class_academic_year_id,
                        subject_id,
                        organization_id,
                        weekly_hours,
                        is_active
                    )
                    VALUES (
                        class_record.cay_id,
                        subject_record.id,
                        v_org_id,
                        2.0,
                        TRUE
                    )
                    ON CONFLICT (class_academic_year_id, subject_id)
                    WHERE deleted_at IS NULL
                    DO NOTHING;
                END LOOP;
            END IF;
        END IF;
        
        -- Special subjects for Hafiz and Dini Ulum classes
        IF class_record.code IN ('HAFIZ-CLASS', 'DINI-ULUM') THEN
            FOR subject_record IN 
                SELECT id, code
                FROM public.subjects
                WHERE organization_id = v_org_id
                AND code IN ('QURAN', 'HADITH', 'FIQH', 'AQIDA', 'ARABIC')
                AND deleted_at IS NULL
                AND is_active = TRUE
            LOOP
                weekly_hours := CASE 
                    WHEN subject_record.code = 'QURAN' THEN 10.0
                    WHEN subject_record.code = 'HADITH' THEN 5.0
                    WHEN subject_record.code = 'FIQH' THEN 4.0
                    WHEN subject_record.code = 'AQIDA' THEN 3.0
                    WHEN subject_record.code = 'ARABIC' THEN 5.0
                    ELSE 3.0
                END;
                
                INSERT INTO public.class_subjects (
                    class_academic_year_id,
                    subject_id,
                    organization_id,
                    weekly_hours,
                    is_active
                )
                VALUES (
                    class_record.cay_id,
                    subject_record.id,
                    v_org_id,
                    weekly_hours,
                    TRUE
                )
                ON CONFLICT (class_academic_year_id, subject_id)
                WHERE deleted_at IS NULL
                DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Clean up temporary tables
DROP TABLE IF EXISTS temp_org_id;
DROP TABLE IF EXISTS temp_academic_year_id;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
DECLARE
    org_id UUID;
    staff_count INTEGER;
    class_count INTEGER;
    subject_count INTEGER;
    staff_type_count INTEGER;
    academic_year_count INTEGER;
    class_academic_year_count INTEGER;
    class_subject_count INTEGER;
BEGIN
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'islamic-school-pashto' LIMIT 1;
    
    IF org_id IS NOT NULL THEN
        SELECT COUNT(*) INTO staff_type_count FROM public.staff_types WHERE organization_id = org_id AND deleted_at IS NULL;
        SELECT COUNT(*) INTO class_count FROM public.classes WHERE organization_id = org_id AND deleted_at IS NULL;
        SELECT COUNT(*) INTO subject_count FROM public.subjects WHERE organization_id = org_id AND deleted_at IS NULL;
        SELECT COUNT(*) INTO staff_count FROM public.staff WHERE organization_id = org_id AND deleted_at IS NULL;
        SELECT COUNT(*) INTO academic_year_count FROM public.academic_years WHERE organization_id = org_id AND deleted_at IS NULL;
        SELECT COUNT(*) INTO class_academic_year_count 
        FROM public.class_academic_years cay
        INNER JOIN public.classes c ON c.id = cay.class_id
        WHERE c.organization_id = org_id AND cay.deleted_at IS NULL;
        SELECT COUNT(*) INTO class_subject_count 
        FROM public.class_subjects cs
        INNER JOIN public.class_academic_years cay ON cay.id = cs.class_academic_year_id
        INNER JOIN public.classes c ON c.id = cay.class_id
        WHERE c.organization_id = org_id AND cs.deleted_at IS NULL;
        
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Islamic School Pashto Seeder Complete:';
        RAISE NOTICE '========================================';
        RAISE NOTICE '  Organization: مدرسۀ اسلامی';
        RAISE NOTICE '  Staff Types: %', staff_type_count;
        RAISE NOTICE '  Classes: %', class_count;
        RAISE NOTICE '  Subjects: %', subject_count;
        RAISE NOTICE '  Staff Members: %', staff_count;
        RAISE NOTICE '  Academic Years: %', academic_year_count;
        RAISE NOTICE '  Class-Academic Year Assignments: %', class_academic_year_count;
        RAISE NOTICE '  Subject-Class Assignments: %', class_subject_count;
        RAISE NOTICE '========================================';
    END IF;
END $$;

