-- Create donations table
CREATE TABLE public.donations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name TEXT NOT NULL,
    donor_email TEXT,
    donor_phone TEXT,
    amount NUMERIC NOT NULL,
    purpose TEXT NOT NULL,
    donation_type TEXT NOT NULL CHECK (donation_type IN ('individual', 'corporate', 'anonymous')),
    payment_method TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_generated BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    branch_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('academic', 'sports', 'cultural', 'meeting', 'exam', 'holiday')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    organizer TEXT NOT NULL,
    participants TEXT[] NOT NULL DEFAULT '{}',
    max_participants INTEGER,
    registration_required BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    branch_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL,
    recipients TEXT[] NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'notification' CHECK (message_type IN ('email', 'sms', 'notification')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    branch_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for donations
CREATE POLICY "Admins and staff can manage donations" 
ON public.donations 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'staff'::user_role]));

CREATE POLICY "All authenticated users can view donations" 
ON public.donations 
FOR SELECT 
USING (true);

-- Create RLS policies for events
CREATE POLICY "Admins and teachers can manage events" 
ON public.events 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role]));

CREATE POLICY "All authenticated users can view events" 
ON public.events 
FOR SELECT 
USING (true);

-- Create RLS policies for messages
CREATE POLICY "Admins and teachers can manage messages" 
ON public.messages 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'teacher'::user_role]));

CREATE POLICY "Users can view messages they sent or received" 
ON public.messages 
FOR SELECT 
USING (sender_id = auth.uid() OR auth.uid()::text = ANY(recipients));

-- Create updated_at triggers
CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON public.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();