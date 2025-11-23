-- ============================================================================
-- Seed Schedule Slots (7 Periods) in Pashto
-- ============================================================================
-- This migration seeds 7 schedule slots (periods) for the Islamic school
-- Periods are named in Pashto: لومړی ساعت, دوهم ساعت, etc.
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;

-- ============================================================================
-- Step 1: Get Organization and Academic Year
-- ============================================================================
DO $$
DECLARE
    v_org_id UUID;
    v_academic_year_id UUID;
    v_school_id UUID;
    v_slot_id UUID;
    v_sort_order INTEGER := 1;
BEGIN
    -- Get organization
    SELECT id INTO v_org_id 
    FROM public.organizations 
    WHERE slug = 'islamic-school-pashto' 
    LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'Organization "islamic-school-pashto" not found. Please run the Islamic data seeder first.';
        RETURN;
    END IF;
    
    -- Get current academic year
    SELECT id INTO v_academic_year_id
    FROM public.academic_years
    WHERE organization_id = v_org_id
    AND is_current = TRUE
    AND deleted_at IS NULL
    LIMIT 1;
    
    -- Get school
    SELECT id INTO v_school_id
    FROM public.school_branding
    WHERE organization_id = v_org_id
    AND is_active = TRUE
    LIMIT 1;
    
    -- Store IDs in temp table
    CREATE TEMP TABLE IF NOT EXISTS temp_schedule_data (
        org_id UUID,
        academic_year_id UUID,
        school_id UUID
    );
    DELETE FROM temp_schedule_data;
    INSERT INTO temp_schedule_data (org_id, academic_year_id, school_id)
    VALUES (v_org_id, v_academic_year_id, v_school_id);
    
    -- ============================================================================
    -- Step 2: Insert 7 Schedule Slots (Periods)
    -- ============================================================================
    -- Standard school day: 8:00 AM to 2:30 PM (6.5 hours)
    -- 7 periods of 45 minutes each with 10-minute breaks between periods
    -- Total: 7 * 45 min = 315 min (5.25 hours) + 6 * 10 min breaks = 60 min = 6.25 hours
    
    -- Period 1: 8:00 AM - 8:45 AM
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'لومړی ساعت',
        'PERIOD-01',
        '08:00:00',
        '08:45:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        1,
        TRUE,
        'د لومړی ساعت - د سهار د زده کړو پیل'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 2: 8:55 AM - 9:40 AM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'دوهم ساعت',
        'PERIOD-02',
        '08:55:00',
        '09:40:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        2,
        TRUE,
        'د دوهم ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 3: 9:50 AM - 10:35 AM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'دریم ساعت',
        'PERIOD-03',
        '09:50:00',
        '10:35:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        3,
        TRUE,
        'د دریم ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 4: 10:45 AM - 11:30 AM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'څلورم ساعت',
        'PERIOD-04',
        '10:45:00',
        '11:30:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        4,
        TRUE,
        'د څلورم ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 5: 11:40 AM - 12:25 PM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'پنځم ساعت',
        'PERIOD-05',
        '11:40:00',
        '12:25:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        5,
        TRUE,
        'د پنځم ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 6: 12:35 PM - 1:20 PM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'شپږم ساعت',
        'PERIOD-06',
        '12:35:00',
        '13:20:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        6,
        TRUE,
        'د شپږم ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Period 7: 1:30 PM - 2:15 PM (10 min break)
    INSERT INTO public.schedule_slots (
        organization_id,
        name,
        code,
        start_time,
        end_time,
        days_of_week,
        default_duration_minutes,
        academic_year_id,
        school_id,
        sort_order,
        is_active,
        description
    )
    VALUES (
        v_org_id,
        'اووم ساعت',
        'PERIOD-07',
        '13:30:00',
        '14:15:00',
        '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]'::jsonb,
        45,
        v_academic_year_id,
        v_school_id,
        7,
        TRUE,
        'د اووم ساعت - د ورځې وروستی ساعت'
    )
    ON CONFLICT (code, organization_id, academic_year_id, school_id)
    WHERE deleted_at IS NULL
    DO UPDATE SET
        name = EXCLUDED.name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description
    RETURNING id INTO v_slot_id;
    
    -- Clean up temp table
    DROP TABLE IF EXISTS temp_schedule_data;
    
    -- ============================================================================
    -- Summary
    -- ============================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schedule Slots Seeder Complete:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Organization: مدرسۀ اسلامی';
    RAISE NOTICE '  Schedule Slots Created: 7 periods';
    RAISE NOTICE '  Period Names:';
    RAISE NOTICE '    1. لومړی ساعت (8:00 - 8:45)';
    RAISE NOTICE '    2. دوهم ساعت (8:55 - 9:40)';
    RAISE NOTICE '    3. دریم ساعت (9:50 - 10:35)';
    RAISE NOTICE '    4. څلورم ساعت (10:45 - 11:30)';
    RAISE NOTICE '    5. پنځم ساعت (11:40 - 12:25)';
    RAISE NOTICE '    6. شپږم ساعت (12:35 - 1:20)';
    RAISE NOTICE '    7. اووم ساعت (1:30 - 2:15)';
    RAISE NOTICE '  Days: Monday - Saturday';
    RAISE NOTICE '  Duration: 45 minutes per period';
    RAISE NOTICE '========================================';
END $$;

