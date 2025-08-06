-- CRITICAL SECURITY FIXES
-- Phase 1: Fix Role Escalation and Access Control Issues

-- 1. Create proper role management system
CREATE TYPE user_role_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.user_role_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    existing_role user_role,
    requested_role user_role NOT NULL,
    justification TEXT,
    status user_role_request_status NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user role requests
ALTER TABLE public.user_role_requests ENABLE ROW LEVEL SECURITY;

-- 2. Update profiles table RLS policies - REMOVE dangerous policy that allows users to update their own roles
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new secure policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Only allow users to update non-sensitive fields (NOT role)
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    -- Prevent role changes by regular users
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Only admins can manage roles and create profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- 3. Create policies for user role requests
CREATE POLICY "Users can view their own role requests" 
ON public.user_role_requests 
FOR SELECT 
USING (user_id = auth.uid() OR requested_by = auth.uid());

CREATE POLICY "Users can create role requests" 
ON public.user_role_requests 
FOR INSERT 
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can manage role requests" 
ON public.user_role_requests 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));