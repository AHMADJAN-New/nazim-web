-- Create admission_years table
CREATE TABLE public.admission_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admission_years_year_unique UNIQUE (year)
);

-- Create residency_types table
CREATE TABLE public.residency_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT residency_types_type_unique UNIQUE (type)
);

-- Enable RLS on both tables
ALTER TABLE public.admission_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residency_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admission_years
-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view admission years"
ON public.admission_years
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and super_admins to insert
CREATE POLICY "Admins can insert admission years"
ON public.admission_years
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Allow admins and super_admins to update
CREATE POLICY "Admins can update admission years"
ON public.admission_years
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Allow only super_admins to delete
CREATE POLICY "Super admins can delete admission years"
ON public.admission_years
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- RLS Policies for residency_types
-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view residency types"
ON public.residency_types
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and super_admins to insert
CREATE POLICY "Admins can insert residency types"
ON public.residency_types
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Allow admins and super_admins to update
CREATE POLICY "Admins can update residency types"
ON public.residency_types
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Allow admins and super_admins to delete (with FK check in application)
CREATE POLICY "Admins can delete residency types"
ON public.residency_types
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Add admission_year_id to classes table
ALTER TABLE public.classes 
ADD COLUMN admission_year_id UUID REFERENCES public.admission_years(id);

-- Create indexes for better performance
CREATE INDEX idx_admission_years_year ON public.admission_years(year);
CREATE INDEX idx_residency_types_type ON public.residency_types(type);
CREATE INDEX idx_classes_admission_year_id ON public.classes(admission_year_id);

