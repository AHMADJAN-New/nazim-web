-- Add parent portal support and student-parent relationships
CREATE TABLE IF NOT EXISTS public.student_parents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'parent',
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency_contact boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- Enable RLS
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_parents
CREATE POLICY "Parents can view their student relationships"
ON public.student_parents
FOR SELECT
USING (parent_id = auth.uid());

CREATE POLICY "Admins and staff can manage parent relationships"
ON public.student_parents
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

-- Add updated_at trigger
CREATE TRIGGER update_student_parents_updated_at
BEFORE UPDATE ON public.student_parents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add context tracking for smart navigation
CREATE TABLE IF NOT EXISTS public.user_navigation_context (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_module text NOT NULL,
  recent_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_navigation_context ENABLE ROW LEVEL SECURITY;

-- RLS policies for navigation context
CREATE POLICY "Users can manage their own navigation context"
ON public.user_navigation_context
FOR ALL
USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_user_navigation_context_updated_at
BEFORE UPDATE ON public.user_navigation_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();