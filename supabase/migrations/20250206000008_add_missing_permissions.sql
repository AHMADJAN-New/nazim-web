-- ============================================================================
-- Add Missing Permissions to Seed
-- ============================================================================
-- Adds permissions for tables that were missed in the initial seed:
-- staff_types, staff_documents, class_subject_templates
-- ============================================================================

INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    -- Staff Types permissions
    ('staff_types.read', 'staff_types', 'read', 'View staff types', NULL),
    ('staff_types.create', 'staff_types', 'create', 'Create staff types', NULL),
    ('staff_types.update', 'staff_types', 'update', 'Update staff types', NULL),
    ('staff_types.delete', 'staff_types', 'delete', 'Delete staff types', NULL),
    
    -- Staff Documents permissions
    ('staff_documents.read', 'staff_documents', 'read', 'View staff documents', NULL),
    ('staff_documents.create', 'staff_documents', 'create', 'Create staff documents', NULL),
    ('staff_documents.update', 'staff_documents', 'update', 'Update staff documents', NULL),
    ('staff_documents.delete', 'staff_documents', 'delete', 'Delete staff documents', NULL),
    
    -- Class Subject Templates permissions
    ('class_subject_templates.read', 'class_subject_templates', 'read', 'View class subject templates', NULL),
    ('class_subject_templates.create', 'class_subject_templates', 'create', 'Create class subject templates', NULL),
    ('class_subject_templates.update', 'class_subject_templates', 'update', 'Update class subject templates', NULL),
    ('class_subject_templates.delete', 'class_subject_templates', 'delete', 'Delete class subject templates', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Assign new permissions to super_admin
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE organization_id IS NULL
  AND resource IN ('staff_types', 'staff_documents', 'class_subject_templates')
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

