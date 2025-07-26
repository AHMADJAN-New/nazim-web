-- Insert demo data for all tables

-- Insert demo schools
INSERT INTO public.schools (id, name, code, address, phone, email, principal_name, subscription_plan, max_students, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Nazim Islamic School', 'NIS001', '123 Education Street, Karachi', '+92-21-1234567', 'info@nazimschool.edu.pk', 'Dr. Muhammad Ahmad', 'premium', 2000, true),
('550e8400-e29b-41d4-a716-446655440002', 'Al-Noor Academy', 'ANA002', '456 Learning Avenue, Lahore', '+92-42-7654321', 'contact@alnoor.edu.pk', 'Prof. Fatima Khan', 'basic', 1000, true);

-- Insert demo branches
INSERT INTO public.branches (id, school_id, name, code, address, phone, email) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Main Campus', 'MC001', '123 Education Street, Karachi', '+92-21-1234567', 'main@nazimschool.edu.pk'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'North Branch', 'NB002', '789 North Road, Karachi', '+92-21-9876543', 'north@nazimschool.edu.pk');

-- Insert demo academic years
INSERT INTO public.academic_years (id, name, start_date, end_date, is_current, branch_id) VALUES
('770e8400-e29b-41d4-a716-446655440001', '2024-2025', '2024-04-01', '2025-03-31', true, '660e8400-e29b-41d4-a716-446655440001'),
('770e8400-e29b-41d4-a716-446655440002', '2023-2024', '2023-04-01', '2024-03-31', false, '660e8400-e29b-41d4-a716-446655440001');

-- Insert demo classes
INSERT INTO public.classes (id, name, academic_year_id, branch_id, section, grade_level, capacity) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Grade 1', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'A', 1, 30),
('880e8400-e29b-41d4-a716-446655440002', 'Grade 1', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'B', 1, 30),
('880e8400-e29b-41d4-a716-446655440003', 'Grade 2', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'A', 2, 30),
('880e8400-e29b-41d4-a716-446655440004', 'Grade 10', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'A', 10, 35);

-- Insert demo subjects
INSERT INTO public.subjects (id, name, code, description, branch_id, credits) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'MATH101', 'Basic Mathematics concepts', '660e8400-e29b-41d4-a716-446655440001', 3),
('990e8400-e29b-41d4-a716-446655440002', 'English', 'ENG101', 'English Language and Literature', '660e8400-e29b-41d4-a716-446655440001', 3),
('990e8400-e29b-41d4-a716-446655440003', 'Islamic Studies', 'ISL101', 'Quran and Islamic teachings', '660e8400-e29b-41d4-a716-446655440001', 2),
('990e8400-e29b-41d4-a716-446655440004', 'Science', 'SCI101', 'General Science concepts', '660e8400-e29b-41d4-a716-446655440001', 3),
('990e8400-e29b-41d4-a716-446655440005', 'Urdu', 'URD101', 'Urdu Language and Literature', '660e8400-e29b-41d4-a716-446655440001', 2);

-- Create demo user profiles (teachers, admin, etc.)
INSERT INTO public.profiles (id, email, full_name, role, school_id, phone, address) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'admin@nazimschool.edu.pk', 'Muhammad Ali Khan', 'admin', '550e8400-e29b-41d4-a716-446655440001', '+92-300-1234567', 'Karachi, Pakistan'),
('aa0e8400-e29b-41d4-a716-446655440002', 'teacher1@nazimschool.edu.pk', 'Fatima Ahmed', 'teacher', '550e8400-e29b-41d4-a716-446655440001', '+92-300-2345678', 'Karachi, Pakistan'),
('aa0e8400-e29b-41d4-a716-446655440003', 'teacher2@nazimschool.edu.pk', 'Hassan Ali', 'teacher', '550e8400-e29b-41d4-a716-446655440001', '+92-300-3456789', 'Karachi, Pakistan'),
('aa0e8400-e29b-41d4-a716-446655440004', 'student1@nazimschool.edu.pk', 'Ahmad Ali', 'student', '550e8400-e29b-41d4-a716-446655440001', '+92-300-4567890', 'Karachi, Pakistan'),
('aa0e8400-e29b-41d4-a716-446655440005', 'student2@nazimschool.edu.pk', 'Ayesha Khan', 'student', '550e8400-e29b-41d4-a716-446655440001', '+92-300-5678901', 'Karachi, Pakistan');

-- Insert demo staff records
INSERT INTO public.staff (id, user_id, employee_id, branch_id, designation, department, qualification, salary, hire_date, experience_years) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440002', 'TEACH001', '660e8400-e29b-41d4-a716-446655440001', 'Senior Teacher', 'Mathematics', 'M.Sc Mathematics', 45000, '2020-01-15', 8),
('bb0e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440003', 'TEACH002', '660e8400-e29b-41d4-a716-446655440001', 'Teacher', 'Science', 'B.Sc Physics', 35000, '2021-06-01', 5);

-- Insert demo students
INSERT INTO public.students (id, user_id, student_id, branch_id, class_id, admission_date, date_of_birth, gender, blood_group, guardian_name, guardian_phone, guardian_email, emergency_contact, status) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440004', 'STU2024001', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '2024-01-15', '2007-05-20', 'Male', 'B+', 'Muhammad Ali', '+92-300-1111111', 'parent1@email.com', '+92-300-1111112', 'active'),
('cc0e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440005', 'STU2024002', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '2024-01-20', '2007-08-15', 'Female', 'A+', 'Ibrahim Khan', '+92-300-2222222', 'parent2@email.com', '+92-300-2222223', 'active');

-- Insert demo communications/announcements
INSERT INTO public.communications (id, title, content, type, priority, target_audience, created_by, branch_id, published_date, expires_at) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'Mid-Term Examination Schedule', 'Mid-term examinations will commence from March 15th, 2024. Students are advised to prepare accordingly.', 'Academic', 'high', ARRAY['Students', 'Parents'], 'aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '2024-03-01 00:00:00+00', '2024-03-20 23:59:59+00'),
('dd0e8400-e29b-41d4-a716-446655440002', 'Parent-Teacher Meeting', 'Parent-teacher meeting is scheduled for March 25th, 2024. Parents are requested to attend with their children.', 'Event', 'normal', ARRAY['Parents'], 'aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '2024-03-01 00:00:00+00', '2024-03-25 23:59:59+00'),
('dd0e8400-e29b-41d4-a716-446655440003', 'Fee Payment Reminder', 'Monthly fee payment is due by March 10th, 2024. Please ensure timely payment to avoid late charges.', 'Finance', 'high', ARRAY['Parents'], 'aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '2024-02-25 00:00:00+00', '2024-03-10 23:59:59+00');

-- Insert demo exams
INSERT INTO public.exams (id, name, subject_id, class_id, branch_id, exam_date, type, total_marks, pass_marks, duration_minutes, instructions, created_by) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'Mathematics Mid-Term', '990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '2024-03-15', 'midterm', 100, 40, 180, 'Use blue pen only. No calculators allowed.', 'aa0e8400-e29b-41d4-a716-446655440002'),
('ee0e8400-e29b-41d4-a716-446655440002', 'English Quiz', '990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '2024-03-10', 'quiz', 50, 20, 60, 'Answer all questions.', 'aa0e8400-e29b-41d4-a716-446655440003');

-- Insert demo attendance records
INSERT INTO public.attendance (id, student_id, class_id, date, status, marked_by, remarks) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '2024-03-01', 'present', 'aa0e8400-e29b-41d4-a716-446655440002', 'On time'),
('ff0e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', '2024-03-01', 'present', 'aa0e8400-e29b-41d4-a716-446655440002', 'On time'),
('ff0e8400-e29b-41d4-a716-446655440003', 'cc0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '2024-03-02', 'absent', 'aa0e8400-e29b-41d4-a716-446655440002', 'Sick leave'),
('ff0e8400-e29b-41d4-a716-446655440004', 'cc0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', '2024-03-02', 'late', 'aa0e8400-e29b-41d4-a716-446655440002', 'Arrived 15 minutes late');

-- Insert demo fee structures
INSERT INTO public.fee_structures (id, branch_id, academic_year_id, class_name, tuition_fee, admission_fee, exam_fee, library_fee, sports_fee, transport_fee, hostel_fee, total_fee, is_active) VALUES
('110e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Grade 1', 5000, 2000, 500, 300, 200, 1000, 0, 9000, true),
('110e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Grade 10', 8000, 3000, 1000, 500, 500, 1500, 0, 14500, true);

-- Insert demo fees
INSERT INTO public.fees (id, student_id, academic_year_id, fee_type, amount, due_date, status, paid_date, payment_method, transaction_id, remarks) VALUES
('120e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Monthly Tuition', 5000, '2024-03-01', 'paid', '2024-02-28', 'Bank Transfer', 'TXN001234', 'Paid on time'),
('120e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Monthly Tuition', 8000, '2024-03-01', 'pending', null, null, null, 'Payment pending');

-- Insert demo hostel rooms
INSERT INTO public.hostel_rooms (id, room_number, branch_id, room_type, capacity, occupied_count, floor, facilities, monthly_fee) VALUES
('130e8400-e29b-41d4-a716-446655440001', 'R001', '660e8400-e29b-41d4-a716-446655440001', 'Double', 2, 1, 1, ARRAY['AC', 'Attached Bathroom', 'Study Table'], 3000),
('130e8400-e29b-41d4-a716-446655440002', 'R002', '660e8400-e29b-41d4-a716-446655440001', 'Triple', 3, 2, 1, ARRAY['Fan', 'Shared Bathroom', 'Study Table'], 2500),
('130e8400-e29b-41d4-a716-446655440003', 'R003', '660e8400-e29b-41d4-a716-446655440001', 'Single', 1, 0, 2, ARRAY['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'], 4000);

-- Insert demo hostel allocations
INSERT INTO public.hostel_allocations (id, student_id, room_id, allocated_date, status, allocated_by, monthly_fee) VALUES
('140e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', '130e8400-e29b-41d4-a716-446655440001', '2024-01-15', 'active', 'aa0e8400-e29b-41d4-a716-446655440001', 3000);

-- Insert demo library books
INSERT INTO public.library_books (id, title, author, isbn, publisher, publication_year, category, location, total_copies, available_copies, branch_id) VALUES
('150e8400-e29b-41d4-a716-446655440001', 'Mathematics Grade 10', 'Dr. Ahmad Ali', '978-0123456789', 'Education Publishers', 2023, 'Textbook', 'Section A1', 50, 45, '660e8400-e29b-41d4-a716-446655440001'),
('150e8400-e29b-41d4-a716-446655440002', 'Islamic Stories for Children', 'Fatima Khan', '978-0987654321', 'Islamic Publications', 2022, 'Religious', 'Section B2', 30, 28, '660e8400-e29b-41d4-a716-446655440001'),
('150e8400-e29b-41d4-a716-446655440003', 'Science Experiments', 'Prof. Hassan Ahmed', '978-0456789123', 'Science Publishers', 2023, 'Science', 'Section C1', 25, 20, '660e8400-e29b-41d4-a716-446655440001');

-- Insert demo assets
INSERT INTO public.assets (id, asset_code, name, category, description, condition, location, purchase_cost, current_value, purchase_date, branch_id, assigned_to) VALUES
('160e8400-e29b-41d4-a716-446655440001', 'PROJ001', 'Digital Projector', 'Electronics', 'Epson Multimedia Projector', 'Excellent', 'Room 101', 45000, 35000, '2023-06-15', '660e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440002'),
('160e8400-e29b-41d4-a716-446655440002', 'DESK001', 'Teacher Desk', 'Furniture', 'Wooden teacher desk with drawers', 'Good', 'Room 102', 15000, 12000, '2022-03-20', '660e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440003'),
('160e8400-e29b-41d4-a716-446655440003', 'COMP001', 'Desktop Computer', 'Electronics', 'Intel Core i5 Desktop PC', 'Good', 'Computer Lab', 65000, 45000, '2022-08-10', '660e8400-e29b-41d4-a716-446655440001', null);

-- Insert demo hifz progress
INSERT INTO public.hifz_progress (id, student_id, date, surah_name, ayah_from, ayah_to, pages_memorized, revision_pages, mistakes_count, rating, teacher_feedback, recorded_by) VALUES
('170e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440001', '2024-03-01', 'Al-Fatiha', 1, 7, 1, 0, 2, 4, 'Good memorization, work on tajweed', 'aa0e8400-e29b-41d4-a716-446655440002'),
('170e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440002', '2024-03-01', 'Al-Baqarah', 1, 10, 1, 1, 1, 5, 'Excellent progress', 'aa0e8400-e29b-41d4-a716-446655440002');