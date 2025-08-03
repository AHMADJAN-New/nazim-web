-- Create exam_questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, short_answer, essay, true_false
  options JSONB, -- For multiple choice questions
  correct_answer TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  difficulty_level TEXT DEFAULT 'medium', -- easy, medium, hard
  subject_area TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_questions
CREATE POLICY "All authenticated users can view exam questions"
ON public.exam_questions
FOR SELECT
USING (true);

CREATE POLICY "Teachers and admins can manage exam questions"
ON public.exam_questions
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role]));

-- Create triggers for updated_at
CREATE TRIGGER update_exam_questions_updated_at
BEFORE UPDATE ON public.exam_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_questions_created_by ON public.exam_questions(created_by);