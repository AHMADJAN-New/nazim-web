-- ============================================================================
-- Seed Academic Years
-- ============================================================================
-- Insert default global academic year (available to all organizations)
-- ============================================================================

-- Get current year and create default academic year
-- Format: "YYYY-YYYY" where second year is current year + 1
DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    next_year INTEGER := current_year + 1;
    year_name TEXT := current_year || '-' || next_year;
    start_date DATE := DATE(current_year || '-09-01'); -- September 1st
    end_date DATE := DATE(next_year || '-06-30'); -- June 30th of next year
BEGIN
    -- Insert current academic year (e.g., "2024-2025" or "2025-2026")
    -- Only insert if it doesn't already exist
    INSERT INTO public.academic_years (name, start_date, end_date, is_current, description, status, organization_id)
    SELECT 
        year_name,
        start_date,
        end_date,
        true,
        'Default academic year for ' || year_name,
        'active',
        NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE name = year_name 
          AND organization_id IS NULL 
          AND deleted_at IS NULL
    );
END;
$$;

