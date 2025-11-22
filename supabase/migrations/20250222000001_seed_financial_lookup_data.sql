-- ============================================================================
-- Financial Management System - Seed Data
-- ============================================================================
-- Default financial categories and lookup data for Islamic schools
-- Includes multi-language support (English, Arabic, Pashto)
-- All seed data is global (organization_id = NULL, school_id = NULL)
-- Organizations can use these defaults or create their own
-- ============================================================================

-- ============================================================================
-- Seed: Financial Currencies
-- ============================================================================

INSERT INTO public.financial_currencies (code, name, symbol, decimal_places, is_base_currency, is_active, organization_id, sort_order)
VALUES
    ('AFN', 'Afghan Afghani', '؋', 2, TRUE, TRUE, NULL, 1),
    ('USD', 'US Dollar', '$', 2, FALSE, TRUE, NULL, 2),
    ('EUR', 'Euro', '€', 2, FALSE, TRUE, NULL, 3),
    ('GBP', 'British Pound', '£', 2, FALSE, TRUE, NULL, 4),
    ('SAR', 'Saudi Riyal', 'ر.س', 2, FALSE, TRUE, NULL, 5),
    ('AED', 'UAE Dirham', 'د.إ', 2, FALSE, TRUE, NULL, 6),
    ('PKR', 'Pakistani Rupee', '₨', 2, FALSE, TRUE, NULL, 7),
    ('IRR', 'Iranian Rial', '﷼', 0, FALSE, TRUE, NULL, 8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Income Categories
-- ============================================================================

INSERT INTO public.financial_income_categories 
    (code, name, name_arabic, name_pashto, description, is_student_fee, is_taxable, parent_id, is_active, organization_id, school_id, sort_order)
VALUES
    -- Main Categories
    ('INC-TUITION', 'Tuition Fees', 'رسوم الدراسة', 'د زده کړې فیس', 'Student tuition and course fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 10),
    ('INC-REGISTRATION', 'Registration Fees', 'رسوم التسجيل', 'د راجسټریشن فیس', 'Student registration and enrollment fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 20),
    ('INC-EXAM', 'Examination Fees', 'رسوم الامتحانات', 'د ازموینې فیس', 'Examination and test fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 30),
    ('INC-TRANSPORT', 'Transport Fees', 'رسوم النقل', 'د ټرانسپورټ فیس', 'Transportation and bus fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 40),
    ('INC-CAFETERIA', 'Cafeteria Income', 'دخل المقصف', 'د کافیتریا عواید', 'Cafeteria and meal plan income', TRUE, FALSE, NULL, TRUE, NULL, NULL, 50),
    ('INC-UNIFORM', 'Uniform Sales', 'مبيعات الزي المدرسي', 'د یونیفورم خرڅلاو', 'School uniform and clothing sales', TRUE, FALSE, NULL, TRUE, NULL, NULL, 60),
    ('INC-BOOKS', 'Book Sales', 'مبيعات الكتب', 'د کتابونو خرڅلاو', 'Textbook and stationery sales', TRUE, FALSE, NULL, TRUE, NULL, NULL, 70),
    ('INC-LIBRARY', 'Library Fees', 'رسوم المكتبة', 'د کتابتون فیس', 'Library membership and late fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 80),
    ('INC-HOSTEL', 'Hostel Fees', 'رسوم السكن', 'د هاسټل فیس', 'Boarding and accommodation fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 90),
    ('INC-EXTRA', 'Extracurricular Fees', 'رسوم الأنشطة', 'د اضافي فعالیتونو فیس', 'Sports, clubs, and activity fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 100),
    
    -- Donations and Funds
    ('INC-DONATION', 'Donations', 'التبرعات', 'مرستې', 'General donations and contributions', FALSE, FALSE, NULL, TRUE, NULL, NULL, 110),
    ('INC-ZAKAT', 'Zakat', 'الزكاة', 'زکات', 'Zakat donations (Islamic alms)', FALSE, FALSE, NULL, TRUE, NULL, NULL, 120),
    ('INC-SADAQAH', 'Sadaqah', 'الصدقة', 'صدقه', 'Sadaqah donations (voluntary charity)', FALSE, FALSE, NULL, TRUE, NULL, NULL, 130),
    ('INC-WAQF', 'Waqf', 'الوقف', 'وقف', 'Waqf endowment income', FALSE, FALSE, NULL, TRUE, NULL, NULL, 140),
    ('INC-SPONSOR', 'Sponsorships', 'الرعاية', 'سپانسر شپ', 'Student sponsorship income', FALSE, FALSE, NULL, TRUE, NULL, NULL, 150),
    
    -- Other Income
    ('INC-RENT', 'Rental Income', 'دخل الإيجار', 'د کرایې عواید', 'Facility rental and lease income', FALSE, TRUE, NULL, TRUE, NULL, NULL, 160),
    ('INC-EVENT', 'Event Income', 'دخل الفعاليات', 'د پروګرامونو عواید', 'Event ticket sales and registrations', FALSE, TRUE, NULL, TRUE, NULL, NULL, 170),
    ('INC-SERVICE', 'Service Fees', 'رسوم الخدمات', 'د خدماتو فیس', 'Administrative service fees', TRUE, FALSE, NULL, TRUE, NULL, NULL, 180),
    ('INC-LATE', 'Late Payment Fees', 'غرامات التأخير', 'د ځنډ جریمه', 'Late payment penalties', TRUE, FALSE, NULL, TRUE, NULL, NULL, 190),
    ('INC-OTHER', 'Other Income', 'دخل آخر', 'نور عواید', 'Miscellaneous income', FALSE, TRUE, NULL, TRUE, NULL, NULL, 200)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Expense Categories
-- ============================================================================

INSERT INTO public.financial_expense_categories 
    (code, name, name_arabic, name_pashto, description, is_recurring, requires_approval, approval_limit, parent_id, is_active, organization_id, school_id, sort_order)
VALUES
    -- Staff Costs
    ('EXP-SALARY', 'Staff Salaries', 'رواتب الموظفين', 'د کارکوونکو معاشونه', 'Employee salaries and wages', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 10),
    ('EXP-BONUS', 'Bonuses & Incentives', 'المكافآت والحوافز', 'انعامونه او محرکات', 'Employee bonuses and performance incentives', FALSE, TRUE, 10000.00, NULL, TRUE, NULL, NULL, 20),
    ('EXP-ALLOWANCE', 'Allowances', 'البدلات', 'تخصیصونه', 'Housing, transport, and other allowances', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 30),
    ('EXP-BENEFIT', 'Employee Benefits', 'مزايا الموظفين', 'د کارکوونکو ګټې', 'Health insurance, retirement, etc.', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 40),
    
    -- Utilities & Infrastructure
    ('EXP-ELECTRICITY', 'Electricity', 'الكهرباء', 'بریښنا', 'Electricity bills and charges', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 50),
    ('EXP-WATER', 'Water & Sewage', 'المياه والصرف الصحي', 'اوبه او فاضله', 'Water supply and sewage charges', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 60),
    ('EXP-GAS', 'Gas/Heating', 'الغاز والتدفئة', 'ګاز او تودوخه', 'Gas and heating fuel costs', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 70),
    ('EXP-INTERNET', 'Internet & Phone', 'الإنترنت والهاتف', 'انټرنیټ او تلیفون', 'Internet and telephone services', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 80),
    
    -- Maintenance & Repairs
    ('EXP-MAINTENANCE', 'Building Maintenance', 'صيانة المباني', 'د ودانۍ ساتنه', 'Building repair and maintenance', FALSE, TRUE, 5000.00, NULL, TRUE, NULL, NULL, 90),
    ('EXP-CLEANING', 'Cleaning Services', 'خدمات النظافة', 'د پاکولو خدمات', 'Cleaning supplies and services', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 100),
    ('EXP-SECURITY', 'Security Services', 'خدمات الأمن', 'د امنیت خدمات', 'Security guards and systems', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 110),
    ('EXP-GARDENING', 'Gardening & Landscaping', 'البستنة والتنسيق', 'د باغچې ساتنه', 'Garden maintenance and landscaping', FALSE, FALSE, NULL, NULL, TRUE, NULL, NULL, 120),
    
    -- Academic & Educational
    ('EXP-BOOKS', 'Books & Materials', 'الكتب والمواد', 'کتابونه او توکي', 'Textbooks and teaching materials', FALSE, TRUE, 3000.00, NULL, TRUE, NULL, NULL, 130),
    ('EXP-STATIONERY', 'Stationery & Supplies', 'القرطاسية واللوازم', 'قرطاسیه او توکي', 'Office and classroom stationery', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 140),
    ('EXP-SOFTWARE', 'Software & Licenses', 'البرمجيات والتراخيص', 'سافټویر او لایسنسونه', 'Educational software and licenses', TRUE, TRUE, 2000.00, NULL, TRUE, NULL, NULL, 150),
    ('EXP-TRAINING', 'Staff Training', 'تدريب الموظفين', 'د کارکوونکو روزنه', 'Professional development and training', FALSE, TRUE, 5000.00, NULL, TRUE, NULL, NULL, 160),
    
    -- Transport & Vehicles
    ('EXP-FUEL', 'Fuel & Oil', 'الوقود والزيت', 'تیل او غوړ', 'Vehicle fuel and lubricants', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 170),
    ('EXP-VEHICLE', 'Vehicle Maintenance', 'صيانة المركبات', 'د موټرو ساتنه', 'Vehicle repairs and maintenance', FALSE, TRUE, 3000.00, NULL, TRUE, NULL, NULL, 180),
    ('EXP-TRANSPORT', 'Transport Services', 'خدمات النقل', 'د ټرانسپورټ خدمات', 'Student transportation costs', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 190),
    
    -- Food & Cafeteria
    ('EXP-FOOD', 'Food Supplies', 'المواد الغذائية', 'خوراکي توکي', 'Cafeteria food and beverages', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 200),
    ('EXP-KITCHEN', 'Kitchen Equipment', 'معدات المطبخ', 'د پخلنځي سامانونه', 'Kitchen equipment and utensils', FALSE, TRUE, 2000.00, NULL, TRUE, NULL, NULL, 210),
    
    -- Rent & Facilities
    ('EXP-RENT', 'Rent & Lease', 'الإيجار والاستئجار', 'کرایه', 'Building and facility rent', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 220),
    ('EXP-INSURANCE', 'Insurance', 'التأمين', 'بیمه', 'Property and liability insurance', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 230),
    ('EXP-TAX', 'Taxes & Fees', 'الضرائب والرسوم', 'مالیې او فیسونه', 'Government taxes and regulatory fees', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 240),
    
    -- Marketing & Events
    ('EXP-MARKETING', 'Marketing & Advertising', 'التسويق والإعلان', 'بازار موندنه', 'Marketing and promotional expenses', FALSE, TRUE, 2000.00, NULL, TRUE, NULL, NULL, 250),
    ('EXP-EVENT', 'Events & Programs', 'الفعاليات والبرامج', 'پروګرامونه', 'School events and ceremonies', FALSE, TRUE, 3000.00, NULL, TRUE, NULL, NULL, 260),
    ('EXP-PRINTING', 'Printing & Publishing', 'الطباعة والنشر', 'چاپ او خپرونه', 'Printing certificates, reports, etc.', FALSE, FALSE, NULL, NULL, TRUE, NULL, NULL, 270),
    
    -- Administrative
    ('EXP-LEGAL', 'Legal & Professional', 'الخدمات القانونية', 'قانوني خدمات', 'Legal and consulting fees', FALSE, TRUE, 5000.00, NULL, TRUE, NULL, NULL, 280),
    ('EXP-BANK', 'Bank Charges', 'رسوم البنوك', 'د بانک چارجونه', 'Banking fees and charges', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 290),
    ('EXP-CHARITY', 'Charitable Giving', 'الأعمال الخيرية', 'خیریه کارونه', 'Zakat distribution and charity', FALSE, TRUE, 10000.00, NULL, TRUE, NULL, NULL, 300),
    
    -- Miscellaneous
    ('EXP-DEPRECIATION', 'Depreciation', 'الإهلاك', 'استهلاک', 'Asset depreciation expense', TRUE, FALSE, NULL, NULL, TRUE, NULL, NULL, 310),
    ('EXP-OTHER', 'Other Expenses', 'مصروفات أخرى', 'نورې لګښتونه', 'Miscellaneous expenses', FALSE, FALSE, NULL, NULL, TRUE, NULL, NULL, 320)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Payment Methods
-- ============================================================================

INSERT INTO public.financial_payment_methods 
    (code, name, name_arabic, name_pashto, description, is_cash, is_bank_related, is_online, requires_reference, is_active, organization_id, school_id, sort_order)
VALUES
    ('PAY-CASH', 'Cash', 'نقدي', 'نغدي', 'Cash payment', TRUE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 10),
    ('PAY-BANK', 'Bank Transfer', 'حوالة بنكية', 'بانکي انتقال', 'Bank wire transfer', FALSE, TRUE, FALSE, TRUE, TRUE, NULL, NULL, 20),
    ('PAY-CHEQUE', 'Cheque', 'شيك', 'چک', 'Bank cheque payment', FALSE, TRUE, FALSE, TRUE, TRUE, NULL, NULL, 30),
    ('PAY-CARD', 'Credit/Debit Card', 'بطاقة ائتمان/خصم', 'کریډیټ/ډیبټ کارډ', 'Card payment (POS)', FALSE, TRUE, FALSE, TRUE, TRUE, NULL, NULL, 40),
    ('PAY-MOBILE', 'Mobile Money', 'المحفظة الإلكترونية', 'موبایل پیسې', 'Mobile money transfer', FALSE, FALSE, TRUE, TRUE, TRUE, NULL, NULL, 50),
    ('PAY-ONLINE', 'Online Payment', 'الدفع الإلكتروني', 'آنلاین تادیه', 'Online payment gateway', FALSE, TRUE, TRUE, TRUE, TRUE, NULL, NULL, 60),
    ('PAY-POS', 'POS Terminal', 'جهاز نقاط البيع', 'POS ټرمینل', 'Point of sale terminal', FALSE, TRUE, FALSE, TRUE, TRUE, NULL, NULL, 70),
    ('PAY-HAWALA', 'Hawala', 'حوالة', 'هواله', 'Traditional hawala system', FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 80),
    ('PAY-OTHER', 'Other', 'أخرى', 'نور', 'Other payment method', FALSE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 90)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Asset Categories
-- ============================================================================

INSERT INTO public.financial_asset_categories 
    (code, name, name_arabic, name_pashto, description, depreciation_method, default_useful_life_years, default_salvage_value_percentage, is_depreciable, is_active, organization_id, school_id, sort_order)
VALUES
    ('ASSET-LAND', 'Land & Property', 'الأراضي والعقارات', 'ځمکه او ملکیت', 'Land and real estate', 'none', NULL, 0, FALSE, TRUE, NULL, NULL, 10),
    ('ASSET-BUILDING', 'Buildings', 'المباني', 'ودانۍ', 'School buildings and structures', 'straight_line', 40, 10, TRUE, TRUE, NULL, NULL, 20),
    ('ASSET-FURNITURE', 'Furniture & Fixtures', 'الأثاث والتجهيزات', 'فرنیچر او سامانونه', 'Desks, chairs, cabinets', 'straight_line', 10, 5, TRUE, TRUE, NULL, NULL, 30),
    ('ASSET-COMPUTER', 'IT Equipment', 'معدات تقنية المعلومات', 'د IT سامانونه', 'Computers, servers, networks', 'declining_balance', 5, 10, TRUE, TRUE, NULL, NULL, 40),
    ('ASSET-VEHICLE', 'Vehicles', 'المركبات', 'موټرونه', 'Buses, cars, vans', 'declining_balance', 8, 15, TRUE, TRUE, NULL, NULL, 50),
    ('ASSET-EQUIPMENT', 'Educational Equipment', 'المعدات التعليمية', 'تعلیمي سامانونه', 'Lab equipment, projectors, etc.', 'straight_line', 7, 5, TRUE, TRUE, NULL, NULL, 60),
    ('ASSET-LIBRARY', 'Library Books', 'كتب المكتبة', 'د کتابتون کتابونه', 'Library book collection', 'straight_line', 10, 0, TRUE, TRUE, NULL, NULL, 70),
    ('ASSET-SPORT', 'Sports Equipment', 'المعدات الرياضية', 'سپورټ سامانونه', 'Sports and gym equipment', 'straight_line', 5, 5, TRUE, TRUE, NULL, NULL, 80),
    ('ASSET-KITCHEN', 'Kitchen Equipment', 'معدات المطبخ', 'د پخلنځي سامانونه', 'Cafeteria and kitchen equipment', 'straight_line', 10, 5, TRUE, TRUE, NULL, NULL, 90),
    ('ASSET-GENERATOR', 'Generators & Power', 'المولدات والطاقة', 'جنریټرونه', 'Power generators and UPS', 'straight_line', 10, 10, TRUE, TRUE, NULL, NULL, 100),
    ('ASSET-SECURITY', 'Security Systems', 'أنظمة الأمن', 'امنیتي سیسټمونه', 'CCTV, alarms, access control', 'straight_line', 7, 5, TRUE, TRUE, NULL, NULL, 110),
    ('ASSET-OTHER', 'Other Assets', 'أصول أخرى', 'نور شتمني', 'Other fixed assets', 'straight_line', 10, 5, TRUE, TRUE, NULL, NULL, 120)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Fund Types
-- ============================================================================

INSERT INTO public.financial_fund_types 
    (code, name, name_arabic, name_pashto, description, is_islamic_fund, islamic_fund_type, is_restricted, requires_approval, is_active, organization_id, school_id, sort_order)
VALUES
    -- Islamic Funds
    ('FUND-ZAKAT', 'Zakat Fund', 'صندوق الزكاة', 'د زکات فنډ', 'Zakat collection and distribution', TRUE, 'zakat', TRUE, TRUE, TRUE, NULL, NULL, 10),
    ('FUND-SADAQAH', 'Sadaqah Fund', 'صندوق الصدقة', 'د صدقې فنډ', 'Voluntary charity (Sadaqah)', TRUE, 'sadaqah', FALSE, FALSE, TRUE, NULL, NULL, 20),
    ('FUND-WAQF', 'Waqf Fund', 'صندوق الوقف', 'د وقف فنډ', 'Islamic endowment (Waqf)', TRUE, 'waqf', TRUE, TRUE, TRUE, NULL, NULL, 30),
    ('FUND-FIDYA', 'Fidya/Kaffarah Fund', 'صندوق الفدية والكفارة', 'د فدیې/کفارې فنډ', 'Fidya and Kaffarah donations', TRUE, 'fidya', TRUE, TRUE, TRUE, NULL, NULL, 40),
    
    -- General Funds
    ('FUND-GENERAL', 'General Fund', 'الصندوق العام', 'عمومي فنډ', 'Unrestricted general fund', FALSE, NULL, FALSE, FALSE, TRUE, NULL, NULL, 50),
    ('FUND-SCHOLARSHIP', 'Scholarship Fund', 'صندوق المنح الدراسية', 'د سکالرشپ فنډ', 'Student scholarship and financial aid', FALSE, NULL, TRUE, TRUE, TRUE, NULL, NULL, 60),
    ('FUND-BUILDING', 'Building Fund', 'صندوق البناء', 'د ودانۍ فنډ', 'Construction and infrastructure', FALSE, NULL, TRUE, TRUE, TRUE, NULL, NULL, 70),
    ('FUND-EMERGENCY', 'Emergency Fund', 'صندوق الطوارئ', 'د بیړني حالاتو فنډ', 'Emergency relief and assistance', FALSE, NULL, FALSE, TRUE, TRUE, NULL, NULL, 80),
    ('FUND-TEACHER', 'Teacher Support Fund', 'صندوق دعم المعلمين', 'د ښوونکو د ملاتړ فنډ', 'Teacher salaries and training', FALSE, NULL, TRUE, FALSE, TRUE, NULL, NULL, 90),
    ('FUND-ORPHAN', 'Orphan Support Fund', 'صندوق دعم الأيتام', 'د یتیمانو د ملاتړ فنډ', 'Orphan student support', FALSE, NULL, TRUE, TRUE, TRUE, NULL, NULL, 100),
    ('FUND-OTHER', 'Other Funds', 'صناديق أخرى', 'نور فنډونه', 'Other special purpose funds', FALSE, NULL, FALSE, FALSE, TRUE, NULL, NULL, 110)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Debt Categories
-- ============================================================================

INSERT INTO public.financial_debt_categories 
    (code, name, name_arabic, name_pashto, description, is_student_debt, is_supplier_debt, default_payment_terms_days, requires_interest, is_active, organization_id, school_id, sort_order)
VALUES
    ('DEBT-TUITION', 'Student Tuition Debt', 'ديون الرسوم الدراسية', 'د زده کړې قرض', 'Unpaid student tuition fees', TRUE, FALSE, 30, FALSE, TRUE, NULL, NULL, 10),
    ('DEBT-FEES', 'Student Fees Debt', 'ديون رسوم الطلاب', 'د محصلینو قرض', 'Other unpaid student fees', TRUE, FALSE, 30, FALSE, TRUE, NULL, NULL, 20),
    ('DEBT-SUPPLIER', 'Supplier Payables', 'ذمم الموردين', 'د عرضه کوونکو قرض', 'Amounts owed to suppliers', FALSE, TRUE, 30, FALSE, TRUE, NULL, NULL, 30),
    ('DEBT-UTILITY', 'Utility Payables', 'ذمم المرافق', 'د خدماتو قرض', 'Unpaid utility bills', FALSE, TRUE, 15, FALSE, TRUE, NULL, NULL, 40),
    ('DEBT-SALARY', 'Salary Payables', 'رواتب مستحقة', 'د معاشونو قرض', 'Unpaid staff salaries', FALSE, TRUE, 0, FALSE, TRUE, NULL, NULL, 50),
    ('DEBT-LOAN', 'Loans & Financing', 'القروض والتمويل', 'پورونه او مالي مرستې', 'Bank loans and financing', FALSE, FALSE, 365, TRUE, TRUE, NULL, NULL, 60),
    ('DEBT-RENT', 'Rent Payable', 'إيجار مستحق', 'د کرایې قرض', 'Unpaid rent obligations', FALSE, TRUE, 30, FALSE, TRUE, NULL, NULL, 70),
    ('DEBT-CONTRACT', 'Contract Payables', 'ذمم التعاقدات', 'د قرار دادونو قرض', 'Amounts owed under contracts', FALSE, TRUE, 30, FALSE, TRUE, NULL, NULL, 80),
    ('DEBT-OTHER', 'Other Debts', 'ديون أخرى', 'نور قرضونه', 'Other liabilities and payables', FALSE, FALSE, 30, FALSE, TRUE, NULL, NULL, 90)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: Financial Accounts (Basic Chart of Accounts)
-- ============================================================================

INSERT INTO public.financial_accounts 
    (code, name, name_arabic, name_pashto, account_type, normal_balance, is_system_account, is_cash_account, is_bank_account, is_control_account, allow_manual_entries, is_active, organization_id, school_id, sort_order)
VALUES
    -- ASSETS (1000-1999)
    ('1000', 'Assets', 'الأصول', 'شتمني', 'asset', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 1000),
    ('1100', 'Current Assets', 'الأصول المتداولة', 'جاري شتمني', 'asset', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 1100),
    ('1110', 'Cash on Hand', 'النقد في الصندوق', 'په لاس کې نغدي', 'asset', 'debit', TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1110),
    ('1120', 'Cash in Bank', 'النقد في البنك', 'په بانک کې نغدي', 'asset', 'debit', TRUE, FALSE, TRUE, FALSE, TRUE, TRUE, NULL, NULL, 1120),
    ('1130', 'Accounts Receivable', 'الذمم المدينة', 'د اخیستو پورونه', 'asset', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 1130),
    ('1131', 'Student Fees Receivable', 'مستحقات رسوم الطلاب', 'د محصلینو فیسونه', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1131),
    ('1140', 'Prepaid Expenses', 'المصروفات المدفوعة مقدماً', 'مخکې ورکړ شوي لګښتونه', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1140),
    ('1150', 'Inventory', 'المخزون', 'لیست', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1150),
    
    ('1200', 'Fixed Assets', 'الأصول الثابتة', 'ثابته شتمني', 'asset', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 1200),
    ('1210', 'Land & Buildings', 'الأراضي والمباني', 'ځمکه او ودانۍ', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1210),
    ('1220', 'Furniture & Equipment', 'الأثاث والمعدات', 'فرنیچر او سامانونه', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1220),
    ('1230', 'Vehicles', 'المركبات', 'موټرونه', 'asset', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 1230),
    ('1240', 'Accumulated Depreciation', 'مجمع الإهلاك', 'ټوله استهلاک', 'asset', 'credit', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 1240),
    
    -- LIABILITIES (2000-2999)
    ('2000', 'Liabilities', 'الخصوم', 'قرضونه', 'liability', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 2000),
    ('2100', 'Current Liabilities', 'الخصوم المتداولة', 'جاري قرضونه', 'liability', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 2100),
    ('2110', 'Accounts Payable', 'الذمم الدائنة', 'د ورکولو قرضونه', 'liability', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 2110),
    ('2111', 'Supplier Payables', 'ذمم الموردين', 'د عرضه کوونکو قرضونه', 'liability', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 2111),
    ('2120', 'Accrued Expenses', 'المصروفات المستحقة', 'راټول شوي لګښتونه', 'liability', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 2120),
    ('2121', 'Salaries Payable', 'رواتب مستحقة', 'د معاشونو قرضونه', 'liability', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 2121),
    ('2130', 'Unearned Revenue', 'الإيرادات المؤجلة', 'مخکې ترلاسه شوي عواید', 'liability', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 2130),
    
    ('2200', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'اوږدمهاله قرضونه', 'liability', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 2200),
    ('2210', 'Loans Payable', 'القروض', 'پورونه', 'liability', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 2210),
    
    -- EQUITY (3000-3999)
    ('3000', 'Equity', 'حقوق الملكية', 'ملکیت', 'equity', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 3000),
    ('3100', 'Fund Balance', 'رصيد الصندوق', 'د فنډ توازن', 'equity', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 3100),
    ('3200', 'Retained Earnings', 'الأرباح المحتجزة', 'ساتل شوي عواید', 'equity', 'credit', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 3200),
    ('3900', 'Current Year Surplus/Deficit', 'فائض/عجز السنة الجارية', 'اوسني کال زیاتوالی/کمښت', 'equity', 'credit', TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 3900),
    
    -- INCOME (4000-4999)
    ('4000', 'Income', 'الإيرادات', 'عواید', 'income', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 4000),
    ('4100', 'Student Fees', 'رسوم الطلاب', 'د محصلینو فیسونه', 'income', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 4100),
    ('4110', 'Tuition Income', 'إيرادات الرسوم الدراسية', 'د زده کړې عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4110),
    ('4120', 'Registration Income', 'إيرادات التسجيل', 'د راجسټریشن عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4120),
    ('4130', 'Transport Income', 'إيرادات النقل', 'د ټرانسپورټ عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4130),
    
    ('4200', 'Donations & Contributions', 'التبرعات والمساهمات', 'مرستې او ونډې', 'income', 'credit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 4200),
    ('4210', 'Zakat Income', 'إيرادات الزكاة', 'د زکات عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4210),
    ('4220', 'Sadaqah Income', 'إيرادات الصدقة', 'د صدقې عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4220),
    ('4230', 'General Donations', 'التبرعات العامة', 'عمومي مرستې', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4230),
    
    ('4900', 'Other Income', 'إيرادات أخرى', 'نور عواید', 'income', 'credit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 4900),
    
    -- EXPENSES (5000-5999)
    ('5000', 'Expenses', 'المصروفات', 'لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5000),
    ('5100', 'Personnel Costs', 'تكاليف الموظفين', 'د کارکوونکو لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5100),
    ('5110', 'Salaries & Wages', 'الرواتب والأجور', 'معاشونه او اجورې', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5110),
    ('5120', 'Employee Benefits', 'مزايا الموظفين', 'د کارکوونکو ګټې', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5120),
    
    ('5200', 'Operating Expenses', 'المصروفات التشغيلية', 'عملیاتي لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5200),
    ('5210', 'Utilities', 'المرافق', 'خدمات', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5210),
    ('5220', 'Maintenance & Repairs', 'الصيانة والإصلاحات', 'ساتنه او ترمیم', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5220),
    ('5230', 'Supplies & Materials', 'اللوازم والمواد', 'توکي او موادو', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5230),
    
    ('5300', 'Administrative Expenses', 'المصروفات الإدارية', 'اداري لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5300),
    ('5310', 'Office Expenses', 'مصروفات المكتب', 'د دفتر لګښتونه', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5310),
    ('5320', 'Professional Services', 'الخدمات المهنية', 'مسلکي خدمات', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5320),
    
    ('5400', 'Educational Expenses', 'المصروفات التعليمية', 'تعلیمي لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5400),
    ('5410', 'Books & Materials', 'الكتب والمواد', 'کتابونه او موادو', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5410),
    ('5420', 'Training & Development', 'التدريب والتطوير', 'روزنه او پراختیا', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5420),
    
    ('5500', 'Facility Expenses', 'مصروفات المرافق', 'د سهولتونو لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5500),
    ('5510', 'Rent & Lease', 'الإيجار والتأجير', 'کرایه', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5510),
    ('5520', 'Insurance', 'التأمين', 'بیمه', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5520),
    
    ('5600', 'Transport Expenses', 'مصروفات النقل', 'د ټرانسپورټ لګښتونه', 'expense', 'debit', TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, NULL, NULL, 5600),
    ('5610', 'Fuel & Oil', 'الوقود والزيت', 'تیل او غوړ', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5610),
    ('5620', 'Vehicle Maintenance', 'صيانة المركبات', 'د موټرو ساتنه', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5620),
    
    ('5700', 'Depreciation & Amortization', 'الإهلاك والاستهلاك', 'استهلاک', 'expense', 'debit', TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, NULL, NULL, 5700),
    
    ('5900', 'Other Expenses', 'مصروفات أخرى', 'نورې لګښتونه', 'expense', 'debit', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL, 5900)
ON CONFLICT DO NOTHING;
