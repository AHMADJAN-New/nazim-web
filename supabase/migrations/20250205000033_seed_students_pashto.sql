-- ============================================================================
-- Seed 5 Students with Pashto Names
-- ============================================================================
-- This migration seeds 5 students with complete Pashto information
-- for the Islamic School Pashto organization
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;

DO $$
DECLARE
    org_id UUID;
    school_id UUID;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    admission_counter INTEGER := 1;
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
    
    -- Insert 5 students with Pashto names and complete information
    INSERT INTO public.students (
        organization_id,
        school_id,
        admission_no,
        full_name,
        father_name,
        grandfather_name,
        mother_name,
        gender,
        birth_year,
        birth_date,
        age,
        admission_year,
        orig_province,
        orig_district,
        orig_village,
        curr_province,
        curr_district,
        curr_village,
        nationality,
        preferred_language,
        previous_school,
        guardian_name,
        guardian_relation,
        guardian_phone,
        guardian_tazkira,
        home_address,
        zamin_name,
        zamin_phone,
        zamin_tazkira,
        zamin_address,
        applying_grade,
        is_orphan,
        admission_fee_status,
        student_status,
        disability_status,
        emergency_contact_name,
        emergency_contact_phone,
        family_income
    )
    VALUES
        -- Student 1: Male student
        (
            org_id,
            school_id,
            'ADM-' || current_year || '-001',
            'احمد محمد',
            'محمد',
            'عبدالله',
            'فاطمه',
            'male',
            '2010',
            '2010-03-15',
            14,
            current_year::TEXT,
            'کابل',
            'دشت برچی',
            'دشت برچی مرکز',
            'کابل',
            'دشت برچی',
            'دشت برچی مرکز',
            'افغان',
            'پښتو',
            'د لومړی ښوونځی',
            'محمد عبدالله',
            'پلار',
            '+93-700-123-0001',
            'TZ-123456789',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 1، کور 5',
            'عبدالرحمن احمد',
            '+93-700-123-0002',
            'TZ-987654321',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 2، کور 10',
            'د لومړی ټولګی',
            FALSE,
            'paid',
            'active',
            NULL,
            'محمد عبدالله',
            '+93-700-123-0001',
            '50000 افغانی'
        ),
        -- Student 2: Female student
        (
            org_id,
            school_id,
            'ADM-' || current_year || '-002',
            'فاطمه احمد',
            'احمد',
            'محمد',
            'زینب',
            'female',
            '2011',
            '2011-06-20',
            13,
            current_year::TEXT,
            'کابل',
            'چهاردهی',
            'چهاردهی مرکز',
            'کابل',
            'چهاردهی',
            'چهاردهی مرکز',
            'افغان',
            'پښتو',
            'د ښځو ښوونځی',
            'احمد محمد',
            'پلار',
            '+93-700-123-0003',
            'TZ-111222333',
            'کابل، چهاردهی، چهاردهی مرکز، کوچه 3، کور 12',
            'علی احمد',
            '+93-700-123-0004',
            'TZ-444555666',
            'کابل، چهاردهی، چهاردهی مرکز، کوچه 4، کور 15',
            'د لومړی ټولګی',
            FALSE,
            'paid',
            'active',
            NULL,
            'احمد محمد',
            '+93-700-123-0003',
            '45000 افغانی'
        ),
        -- Student 3: Male student (orphan)
        (
            org_id,
            school_id,
            'ADM-' || current_year || '-003',
            'عبدالرحمن حسین',
            'حسین',
            'علی',
            'مريم',
            'male',
            '2009',
            '2009-09-10',
            15,
            current_year::TEXT,
            'ننگرهار',
            'جلال آباد',
            'جلال آباد مرکز',
            'کابل',
            'دشت برچی',
            'دشت برچی مرکز',
            'افغان',
            'پښتو',
            NULL,
            'علی حسین',
            'تره',
            '+93-700-123-0005',
            'TZ-777888999',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 5، کور 20',
            'محمد علی',
            '+93-700-123-0006',
            'TZ-123789456',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 6، کور 25',
            'د دوهم ټولګی',
            TRUE,
            'waived',
            'active',
            NULL,
            'علی حسین',
            '+93-700-123-0005',
            '30000 افغانی'
        ),
        -- Student 4: Female student
        (
            org_id,
            school_id,
            'ADM-' || current_year || '-004',
            'زینب علی',
            'علی',
            'احمد',
            'خدیجه',
            'female',
            '2012',
            '2012-11-25',
            12,
            current_year::TEXT,
            'کابل',
            'پغمان',
            'پغمان مرکز',
            'کابل',
            'پغمان',
            'پغمان مرکز',
            'افغان',
            'پښتو',
            'د ښځو لومړی ښوونځی',
            'علی احمد',
            'پلار',
            '+93-700-123-0007',
            'TZ-456123789',
            'کابل، پغمان، پغمان مرکز، کوچه 7، کور 30',
            'حسین علی',
            '+93-700-123-0008',
            'TZ-789456123',
            'کابل، پغمان، پغمان مرکز، کوچه 8، کور 35',
            'د لومړی ټولګی',
            FALSE,
            'partial',
            'admitted',
            NULL,
            'علی احمد',
            '+93-700-123-0007',
            '40000 افغانی'
        ),
        -- Student 5: Male student
        (
            org_id,
            school_id,
            'ADM-' || current_year || '-005',
            'محمد عمر',
            'عمر',
            'عبدالرحمن',
            'عایشه',
            'male',
            '2010',
            '2010-01-05',
            14,
            current_year::TEXT,
            'کندهار',
            'کندهار مرکز',
            'کندهار مرکز',
            'کابل',
            'دشت برچی',
            'دشت برچی مرکز',
            'افغان',
            'پښتو',
            'د کندهار لومړی ښوونځی',
            'عمر عبدالرحمن',
            'پلار',
            '+93-700-123-0009',
            'TZ-321654987',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 9، کور 40',
            'احمد عمر',
            '+93-700-123-0010',
            'TZ-654987321',
            'کابل، دشت برچی، دشت برچی مرکز، کوچه 10، کور 45',
            'د لومړی ټولګی',
            FALSE,
            'pending',
            'applied',
            NULL,
            'عمر عبدالرحمن',
            '+93-700-123-0009',
            '55000 افغانی'
        )
    ON CONFLICT (admission_no, organization_id) 
    WHERE deleted_at IS NULL
    DO NOTHING;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Students Seeder Complete:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Organization: مدرسۀ اسلامی';
    RAISE NOTICE '  Students Seeded: 5';
    RAISE NOTICE '  - 3 Male students';
    RAISE NOTICE '  - 2 Female students';
    RAISE NOTICE '  - 1 Orphan student';
    RAISE NOTICE '  - Status: 3 active, 1 admitted, 1 applied';
    RAISE NOTICE '========================================';
END $$;

