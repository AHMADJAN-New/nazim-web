-- ============================================================================
-- Seed Residency Types
-- ============================================================================
-- Insert default global residency types (available to all organizations)
-- ============================================================================

-- Insert نهاري (Day) residency type
-- Note: Using DO NOTHING without ON CONFLICT since the unique constraint is a partial index
-- We'll check for existence first to avoid errors
INSERT INTO public.residency_types (name, code, description, organization_id, is_active)
SELECT 'نهاري', 'day', 'Day students who attend classes during the day', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.residency_types 
    WHERE code = 'day' AND organization_id IS NULL AND deleted_at IS NULL
);

-- Insert لیلیه (Night) residency type
INSERT INTO public.residency_types (name, code, description, organization_id, is_active)
SELECT 'لیلیه', 'night', 'Night students who attend classes during the evening/night', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.residency_types 
    WHERE code = 'night' AND organization_id IS NULL AND deleted_at IS NULL
);

