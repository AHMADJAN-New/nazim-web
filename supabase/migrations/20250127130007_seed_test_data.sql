-- Seed test data for development
-- WARNING: This migration is for development/testing only
-- DO NOT run this in production!

-- Only run if we're in development (you can add a check here)
-- For now, we'll create test data that can be safely run multiple times

-- Create test organization
INSERT INTO public.organizations (name, slug, settings)
VALUES 
    ('Test School', 'test-school', '{"theme": "default"}'::jsonb),
    ('Demo Academy', 'demo-academy', '{"theme": "blue"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Note: Profiles will be created automatically via trigger when users sign up
-- To create a super admin profile manually:
-- 1. Create a user in Supabase Auth
-- 2. Update their profile:
--    UPDATE public.profiles 
--    SET role = 'super_admin', organization_id = NULL 
--    WHERE id = 'user-id-here';

-- Create test buildings (will need organization_id from above)
-- Note: These will fail if organizations don't exist, so we use a subquery
INSERT INTO public.buildings (building_name, organization_id)
SELECT 
    'Main Building',
    id
FROM public.organizations 
WHERE slug = 'test-school'
ON CONFLICT (building_name, organization_id) DO NOTHING;

INSERT INTO public.buildings (building_name, organization_id)
SELECT 
    'Secondary Building',
    id
FROM public.organizations 
WHERE slug = 'test-school'
ON CONFLICT (building_name, organization_id) DO NOTHING;

-- Create test rooms (will need building_id from above)
INSERT INTO public.rooms (room_number, building_id, organization_id)
SELECT 
    '101',
    b.id,
    b.organization_id
FROM public.buildings b
JOIN public.organizations o ON b.organization_id = o.id
WHERE o.slug = 'test-school' AND b.building_name = 'Main Building'
ON CONFLICT (room_number, building_id) DO NOTHING;

INSERT INTO public.rooms (room_number, building_id, organization_id)
SELECT 
    '102',
    b.id,
    b.organization_id
FROM public.buildings b
JOIN public.organizations o ON b.organization_id = o.id
WHERE o.slug = 'test-school' AND b.building_name = 'Main Building'
ON CONFLICT (room_number, building_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.organizations IS 'Test data seeded for development';

