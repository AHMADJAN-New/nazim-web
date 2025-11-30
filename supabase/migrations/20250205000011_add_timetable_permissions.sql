-- ============================================================================
-- Permissions for Timetables
-- ============================================================================

-- 1) Create global permissions (organization_id = NULL)
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
  ('academic.timetables.read', 'academic', 'read', 'Read timetables', NULL),
  ('academic.timetables.create', 'academic', 'create', 'Create timetables', NULL),
  ('academic.timetables.update', 'academic', 'update', 'Update timetables', NULL),
  ('academic.timetables.delete', 'academic', 'delete', 'Delete timetables', NULL),
  ('academic.timetables.export', 'academic', 'export', 'Export timetables', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- 2) Assign permissions to roles per organization
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
  LOOP
    -- Admin gets all timetable permissions
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, org_record.id
    FROM public.permissions p
    WHERE p.name LIKE 'academic.timetables.%'
      AND p.organization_id IS NULL
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Teacher gets read and export
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, org_record.id
    FROM public.permissions p
    WHERE p.name IN ('academic.timetables.read', 'academic.timetables.export')
      AND p.organization_id IS NULL
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
  END LOOP;

  -- Super admin gets all global timetable permissions
  INSERT INTO public.role_permissions (role, permission_id, organization_id)
  SELECT 'super_admin', id, NULL
  FROM public.permissions
  WHERE name LIKE 'academic.timetables.%'
    AND organization_id IS NULL
  ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END $$;

COMMENT ON TABLE public.permissions IS 'System and organization-scoped permissions (includes timetables).';


