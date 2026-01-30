/**
 * Public website translations (Arabic).
 * Used for: marketing landing page, about us, school public portal (websitePublic).
 * Edit this file for all public-facing website copy (Arabic).
 */

import type { WebsitePublicTranslations } from './types';
import { websitePublicEn } from './public-en';

export const websitePublicAr: WebsitePublicTranslations = {
  ...websitePublicEn,
  aboutUs: {
    cta: {
      button: 'Contact Us',
      text: 'Want to learn more about how we can help your school?'
    },
    mission: {
      content:
        'Our mission is to provide comprehensive, user-friendly, and affordable school management solutions that help educational institutions streamline their operations, enhance learning outcomes, and strengthen community connections. We believe that every school, regardless of size, deserves access to modern technology that can transform the way they manage their institution.',
      title: 'Our Mission'
    },
    subtitle:
      'Empowering educational institutions with modern technology solutions for better learning outcomes.',
    title: 'About Nazim School Management System',
    values: {
      community: {
        content:
          'We are committed to building strong relationships with our customers and supporting the educational community.',
        title: 'Community'
      },
      excellence: {
        content:
          'We strive for excellence in every aspect of our service, from product development to customer support.',
        title: 'Excellence'
      },
      innovation: {
        content:
          'We continuously innovate to provide cutting-edge solutions that meet the evolving needs of educational institutions.',
        title: 'Innovation'
      },
      integrity: {
        content:
          'We operate with honesty, transparency, and ethical practices in all our business dealings.',
        title: 'Integrity'
      },
      title: 'Our Values'
    },
    vision: {
      content:
        'We envision a future where all educational institutions, especially Islamic schools and madrasas, have access to powerful, intuitive, and culturally-aware management systems that support their unique needs. We aim to be the leading provider of school management solutions in the region, helping thousands of schools digitize their operations and focus on what matters most: education.',
      title: 'Our Vision'
    },
    whatWeOffer: {
      affordable: {
        content:
          'We offer flexible pricing plans that fit schools of all sizes, from small madrasas to large institutions.',
        title: 'Affordable Pricing'
      },
      comprehensive: {
        content:
          'From student management to finance, attendance to exams, we cover all aspects of school administration.',
        title: 'Comprehensive Solutions'
      },
      support: {
        content:
          'Our team is always ready to help with training, technical support, and ongoing assistance.',
        title: 'Dedicated Support'
      },
      title: 'What We Offer'
    }
  },
  landing: {
    ...websitePublicEn.landing,
    benefits: {
      cloudBased: {
        description: 'الوصول إلى بياناتك من أي مكان وفي أي وقت ومن أي جهاز',
        title: 'قائم على السحابة'
      },
      lightningFast: {
        description: 'أداء محسّن للوصول الفوري إلى جميع الميزات',
        title: 'سريع جداً'
      },
      mobileReady: {
        description: 'تصميم متجاوب يعمل بشكل مثالي على جميع الأجهزة',
        title: 'جاهز للجوال'
      },
      multiLanguage: {
        description: 'دعم للغات الإنجليزية والأردية والعربية والبشتو',
        title: 'متعدد اللغات'
      },
      secureReliable: {
        description: 'أمان على مستوى المؤسسات مع ضمان وقت تشغيل 99.9%',
        title: 'آمن وموثوق'
      },
      support24x7: {
        description: 'دعم العملاء على مدار الساعة ومساعدة التدريب',
        title: 'دعم 24/7'
      }
    },
    contact: {
      messageFailed: 'Failed to send message',
      messageFailedDescription: 'Please try again later.',
      messageSent: 'تم إرسال الرسالة',
      messageSentDescription: 'سنتواصل معك قريباً.'
    },
    features: {
      assets: {
        description: 'تتبع وإدارة أصول المدرسة والمعدات والمخزون',
        title: 'إدارة الأصول'
      },
      attendance: {
        description:
          'إدارة الحضور في الوقت الفعلي مع التقارير والإشعارات التلقائية',
        title: 'تتبع الحضور'
      },
      classes: {
        description: 'إدارة الفصول والسنوات الأكاديمية وتخصيص الفصول',
        title: 'إدارة الفصول'
      },
      dms: {
        description: 'نظام إدارة مستندات مركزي لجميع مستندات المدرسة',
        title: 'نظام إدارة المستندات (DMS)'
      },
      events: {
        description: 'تخطيط وإدارة أحداث المدرسة والأنشطة والإعلانات',
        title: 'إدارة الأحداث'
      },
      exams: {
        description: 'إنشاء وإدارة الامتحانات والجداول ونتائج الامتحانات',
        title: 'إدارة الامتحانات'
      },
      fees: {
        description: 'تتبع جمع الرسوم وجداول الدفع والأرصدة المستحقة',
        title: 'إدارة الرسوم'
      },
      finance: {
        description: 'إدارة مالية شاملة مع الدخل والمصروفات والتقارير',
        title: 'الوحدة المالية'
      },
      grades: {
        description: 'تتبع وإدارة درجات الطلاب والكشوفات والأداء الأكاديمي',
        title: 'إدارة الدرجات'
      },
      graduation: {
        description: 'إدارة التخرج وإنشاء الشهادات للطلاب',
        title: 'التخرج والشهادات'
      },
      hostel: {
        description: 'إدارة السكن الكاملة مع تخصيص الغرف وإدارة الطلاب',
        title: 'إدارة السكن'
      },
      library: {
        description:
          'إدارة المكتبة الرقمية مع تتبع الكتب وسجلات استعارة الطلاب',
        title: 'إدارة المكتبة'
      },
      studentManagement: {
        description:
          'Complete student information system with admission, records, and progress tracking',
        title: 'Student Management'
      },
      students: {
        description:
          'نظام معلومات الطلاب الكامل مع القبول والسجلات وتتبع التقدم',
        title: 'إدارة الطلاب'
      },
      subjects: {
        description: 'إدارة المواد وتخصيصها للفصول وتتبع عروض المواد',
        title: 'إدارة المواد'
      },
      timetables: {
        description: 'إنشاء وإدارة جداول الفصول مع الجدولة التلقائية',
        title: 'إنشاء الجدول الزمني'
      }
    },
    footer: {
      careers: 'الوظائف',
      company: 'الشركة',
      copyright: '© 2026 نظام إدارة مدرسة ناظم. جميع الحقوق محفوظة.',
      features: 'الميزات',
      pricing: 'الأسعار',
      product: 'المنتج',
      security: 'الأمان',
      support: 'الدعم',
      tagline:
        'تمكين المؤسسات التعليمية بحلول التكنولوجيا الحديثة لنتائج تعليمية أفضل.'
    },
    hero: {
      badge: '🚀 موثوق به من قبل أكثر من 500 مدرسة حول العالم',
      startFreeTrial: 'ابدأ التجربة المجانية',
      subtitle:
        'بسّط العمليات، واعزز نتائج التعلم، وقوّي روابط المجتمع مع منصة إدارة المدرسة الإسلامية الشاملة لدينا.',
      title: 'حول إدارة',
      titleHighlight: 'مدرستك',
      watchDemo: 'شاهد العرض التوضيحي',
      description: websitePublicEn.landing.hero.description
    },
    nav: {
      contact: 'اتصل بنا',
      features: 'الميزات',
      finance: 'المالية',
      getStarted: 'ابدأ الآن',
      pricing: 'الأسعار',
      reviews: 'المراجعات',
      signIn: 'تسجيل الدخول'
    },
    planRequest: {
      failed: 'Plan request failed',
      failedDescription: 'Please try again later.',
      sent: 'Plan request submitted',
      sentDescription: 'Our team will reach out with the best option for you.'
    },
    pricing: {
      defaultDescription: 'Flexible plan designed for modern schools.',
      enterprise: {
        description: 'للمؤسسات الكبيرة مع طلاب غير محدودين',
        name: 'المؤسسات'
      },
      feature: 'الميزة',
      free: 'Free',
      period: '/شهر',
      periodYear: '/year',
      professional: {
        description: 'مثالي للمدارس المتوسطة حتى 1000 طالب',
        name: 'المهنية'
      },
      starter: {
        description: 'مثالي للمدارس الصغيرة حتى 200 طالب',
        name: 'البداية'
      }
    },
    sections: {
      ...websitePublicEn.landing.sections,
      benefits: {
        badge: 'لماذا تختارنا',
        subtitle: 'اختبر الفرق مع تقنيتنا المتطورة ودعمنا المخصص.',
        title: 'مبني للمؤسسات التعليمية الحديثة'
      },
      contact: {
        badge: 'اتصل بنا',
        businessHours: 'ساعات العمل',
        conversationDescription:
          'خبراء التكنولوجيا التعليمية لدينا مستعدون لمناقشة احتياجات مدرستك الفريدة وإظهار كيف يمكن لمنصتنا إحداث فرق.',
        emailAddress: 'عنوان البريد الإلكتروني',
        emailSupport: 'الدعم عبر البريد الإلكتروني',
        firstName: 'الاسم الأول',
        formDescription: 'املأ النموذج أدناه وسنعود إليك في غضون 24 ساعة.',
        lastName: 'اسم العائلة',
        letsStartConversation: 'لنبدأ المحادثة',
        message: 'الرسالة',
        messageFailed: 'فشل إرسال الرسالة',
        messageFailedDescription: 'يرجى المحاولة مرة أخرى لاحقاً.',
        messageSent: 'تم إرسال الرسالة',
        messageSentDescription: 'سنتواصل معك قريباً.',
        numberOfStudents: 'عدد الطلاب',
        officeAddress: 'عنوان المكتب',
        phoneNumber: 'رقم الهاتف',
        phoneSupport: 'الدعم الهاتفي',
        schoolName: 'اسم المدرسة',
        sending: 'Sending...',
        sendMessage: 'أرسل لنا رسالة',
        sendMessageButton: 'إرسال الرسالة',
        subtitle:
          'هل أنت مستعد لتحويل إدارة مدرستك؟ فريقنا هنا لمساعدتك على البدء.',
        title: 'ابق على تواصل',
        whatsappSupport: 'دعم واتساب'
      },
      cta: {
        note: '✓ تجربة مجانية لمدة 30 يومًا • ✓ لا حاجة لبطاقة ائتمان • ✓ مساعدة الإعداد متضمنة',
        scheduleDemo: 'جدولة العرض التوضيحي',
        startFreeTrial: 'ابدأ تجربتك المجانية',
        subtitle:
          'انضم إلى آلاف المدارس التي رقمنت بالفعل عملياتها مع نظام الإدارة الشامل لدينا.',
        title: 'هل أنت مستعد لتحويل إدارة مدرستك؟'
      },
      features: {
        badge: 'الميزات',
        subtitle:
          'من قبول الطلاب إلى التخرج، تغطي منصتنا الشاملة جميع جوانب إدارة المدرسة.',
        title: 'كل ما تحتاجه لإدارة مدرستك'
      },
      pricing: {
        allPlansNote:
          'تتضمن جميع الخطط تجربة مجانية لمدة 30 يومًا • بدون رسوم إعداد • إلغاء في أي وقت',
        badge: 'الأسعار',
        comparisonSubtitle: 'See which features are included in each plan',
        comparisonTitle: 'Compare Plans & Features',
        customPlanLink: 'تحتاج إلى خطة مخصصة؟ اتصل بفريق المبيعات لدينا →',
        feature: 'Feature',
        mostPopular: 'الأكثر شعبية',
        subtitle:
          'اختر الخطة المثالية لمؤسستك. تتضمن جميع الخطط الميزات الأساسية بدون رسوم خفية.',
        title: 'أسعار بسيطة وشفافة'
      },
      testimonials: {
        badge: 'الشهادات',
        subtitle: 'شاهد ما يقوله مديرو المدارس والمعلمون عن منصتنا.',
        title: 'محبوب من قبل المعلمين في جميع أنحاء العالم'
      }
    },
    stats: {
      staffMembers: 'أعضاء الموظفين',
      studentsManaged: 'الطلاب المُدارون',
      supportAvailable: 'الدعم المتاح',
      uptimeGuarantee: 'ضمان وقت التشغيل'
    },
    index: {
      ...websitePublicEn.landing.index,
      heroBadges: {
        fullySecure: 'آمن بالكامل',
        multiLanguage: 'متعدد اللغات',
        strongSecurity: 'أمان قوي',
        permissionControl: 'التحكم في الصلاحيات',
        standardDesign: 'تصميم قياسي'
      },
      valueBadges: {
        savesTime: 'يوفر وقتك',
        transparentReports: 'تقارير شفافة ودقيقة',
        allInOne: 'يدير جميع عمليات المدرسة في مكان واحد'
      },
      stats: {
        activeFeatures: { value: '۱۰۰+', label: 'ميزات نشطة' },
        fastAttendance: { value: 'حضور سريع', label: '۳ أشخاص في ثانية واحدة' },
        accurate: { value: 'دقيق', label: 'تقارير دقيقة وصحيحة' },
        trusted: { value: 'موثوق', label: 'مستخدم في مدارس مختلفة' }
      },
      contactSection: {
        contactInfo: 'معلومات الاتصال',
        tagline: 'ناظم – إدارة المدرسة الكاملة في نقرات قليلة!'
      }
    }
  },
  websitePublic: {
    badge: 'مدرسة إسلامية',
    defaultSchoolName: 'مدرسة ناظم',
    heroMotto: 'الشريعة • الطريقة • السياسة',
    heroWelcome: 'مرحباً بكم في',
    heroSubtitle: 'مجتمع تعليمي موثوق يجمع بين القرآن والحفظ والتميز الأكاديمي.',
    heroTagline: 'تنمية الإيمان والمعرفة والخلق بتعليم متجذر في التقاليد الإسلامية.',
    ctaAdmissions: 'القبول',
    ctaApplyNow: 'قدم الآن',
    ctaContact: 'تواصل معنا',
    visitUs: 'زرنا',
    addressComingSoon: 'العنوان قريباً',
    contact: 'اتصال',
    contactDetailsComingSoon: 'تفاصيل الاتصال قريباً',
    supportUs: 'ادعمنا',
    donateCta: 'تبرع لبناء مستقبلنا',
    donate: 'تبرع',
    donationsPageTitle: 'ادعم قضيتنا',
    donationsPageDescription:
      'مساهماتكم تساعدنا على تنمية الجيل القادم بالمعرفة والإيمان والتميز. اختر قضية قريبة من قلبك.',
    donationsPageSubtitle: 'كل هدية تحدث فرقاً في حياة طلابنا ومجتمعنا.',
    supportDefaultDescription: 'ادعم هذه المبادرة الحيوية لمجتمعنا.',
    raised: 'تم جمعه',
    goal: 'الهدف',
    funded: 'ممول',
    totalRaised: 'إجمالي المُجمَع',
    donateNow: 'تبرع الآن',
    noActiveDonationFunds: 'لا توجد صناديق تبرع نشطة',
    checkBackForInitiatives: 'تفقد لاحقاً مبادرات جمع التبرعات الجديدة.',
    aboutOurSchool: 'عن مدرستنا',
    discoverMore: 'اكتشف المزيد',
    explorePrograms: 'اكتشف برامجنا ومبادرات المجتمع وحياة الحرم.',
    readFullStory: 'اقرأ القصة كاملة',
    ourEducationalPrograms: 'برامجنا التعليمية',
    programsIntro:
      'نقدم برامج تلبي مختلف الفئات العمرية واحتياجات التعلم، متجذرة في التقاليد الإسلامية الأصيلة.',
    featured: 'مميز',
    learnMore: 'اعرف المزيد',
    programDefaultDescription:
      'برنامج شامل مصمم لإثراء معرفتك وممارستك الإسلامية.',
    programsEmpty: 'ستُعرض البرامج هنا بعد نشرها.',
    viewAllCourses: 'عرض جميع الدورات',
    viewAllPrograms: 'عرض جميع البرامج',
    latestUpdates: 'آخر التحديثات',
    stayConnected: 'ابق على تواصل مع أخبار مجتمعنا والفعاليات القادمة.',
    viewAllUpdates: 'عرض جميع التحديثات',
    article: 'مقال',
    readLatestUpdate: 'اقرأ آخر تحديث من مجتمعنا.',
    noRecentNews: 'لا توجد أخبار حديثة.',
    fullCalendar: 'التقويم الكامل',
    moreUpdatesComingSoon: 'المزيد من التحديثات قريباً.',
    ctaReadyToJoin: 'مستعد للانضمام إلى مجتمعنا؟',
    ctaAdmissionsIntro:
      'القبول للعام الدراسي القادم مفتوح الآن. اضمن مستقبل طفلك بتعليم يهم.',
    applyForAdmission: 'طلب القبول',
    scheduleTour: 'حجز زيارة',
    footerTagline: 'تمكين الجيل القادم بالمعرفة والإيمان والتميز.',
    quickLinks: 'روابط سريعة',
    aboutUs: 'من نحن',
    academics: 'الأكاديمية',
    portalLogin: 'تسجيل الدخول',
    resources: 'الموارد',
    library: 'المكتبة',
    scholars: 'العلماء',
    fatwas: 'الفتاوى',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الخدمة',
    coursesPageTitle: 'البرامج الأكاديمية',
    coursesPageDescription: 'استكشف مجموعة دوراتنا التعليمية الإسلامية الشاملة لجميع المستويات.',
    searchCourses: 'البحث في الدورات...',
    all: 'الكل',
    enrollNow: 'سجّل الآن',
    viewDetails: 'عرض التفاصيل',
    general: 'عام',
    course: 'دورة',
    noCoursesFound: 'لم يتم العثور على دورات',
    libraryPageTitle: 'المكتبة الرقمية',
    libraryPageDescription: 'الوصول إلى مجموعة كتبنا الإسلامية وأوراق البحث والموارد التعليمية.',
    searchLibrary: 'البحث بالعنوان أو المؤلف أو الوصف...',
    pdfAvailable: 'PDF متوفر',
    noBooksFound: 'لم يتم العثور على كتب',
    tryAdjustingSearch: 'جرّب تغيير عبارة البحث أو فلتر الفئة.',
    unknownAuthor: 'مؤلف غير معروف',
    noDescription: 'لا يوجد وصف.',
    fatwasPageTitle: 'الفتاوى والأحكام الإسلامية',
    fatwasPageDescription: 'تصفح مجموعة أحكامنا الإسلامية أو اسأل علماءنا.',
    searchFatwasPlaceholder: 'البحث في الفتاوى بالسؤال أو الجواب أو الموضوع...',
    allFatwas: 'جميع الفتاوى',
    topics: 'المواضيع',
    haveAQuestion: 'لديك سؤال؟',
    submitQuestionText: 'أرسل سؤالك لعلمائنا واحصل على إجابة مستندة إلى مصادر إسلامية أصيلة.',
    askAQuestion: 'اسأل سؤالاً',
    searchResults: 'نتائج البحث',
    inCategory: 'في',
    recentFatwas: 'أحدث الفتاوى',
    searchingFor: 'البحث عن:',
    result: 'نتيجة',
    results: 'نتائج',
    noFatwasFound: 'لم يتم العثور على فتاوى',
    noFatwasMatching: 'لم يتم العثور على فتاوى تطابق «{query}». غيّر عبارة البحث أو تصفح حسب الفئة.',
    noFatwasInCategory: 'لا توجد فتاوى في هذه الفئة.',
    noPublishedFatwas: 'لا توجد فتاوى منشورة بعد.',
    clearSearch: 'مسح البحث',
    viewAllFatwas: 'عرض جميع الفتاوى',
    category: 'الفئة',
    filteredResults: 'النتائج المفلترة',
    graduatesBadge: 'فخرنا وإرثنا',
    graduatesTitle: 'معرض الخريجين',
    graduatesDescription: 'تكريم الطلاب الملتزمين الذين أتموا رحلتهم معنا، وهم يخدمون المجتمعات بالمعرفة والنزاهة.',
    searchGraduates: 'البحث عن الخريجين بالاسم...',
    allYears: 'جميع السنوات',
    allGraduatingYears: 'جميع سنوات التخرج',
    classOf: 'دفعة',
    loadingGraduates: 'جاري تحميل الخريجين...',
    allAnnouncements: 'جميع الإعلانات',
    allArticles: 'جميع المقالات',
    programHifz: 'برنامج الحفظ',
    programHifzDesc: 'حفظ منظم مع مراجعة يومية وإشراف تربوي.',
    programTajweed: 'التجويد والقراءة',
    programTajweedDesc: 'قراءة صحيحة مع معلمين معتمدين وتدريب مستمر.',
    programNizami: 'درس نظامي',
    programNizamiDesc: 'علوم شرعية كلاسيكية مع مواد حديثة.',
    latestAnnouncements: 'آخر الإعلانات',
    viewAll: 'عرض الكل',
    sampleAnnouncement: 'فتح باب القبول',
    sampleAnnouncementDesc: 'يتم استقبال الطلبات للعام الدراسي القادم.',
    upcomingEvents: 'الفعاليات القادمة',
    viewCalendar: 'عرض التقويم',
    sampleEvent: 'اليوم المفتوح للمجتمع',
    sampleEventDesc: 'تعرف على المعلمين والمرافق وبرامجنا.',
    sampleDate: 'هذا الأسبوع',
    contactTitle: 'تواصل معنا',
    contactDesc: 'للاستفسار عن القبول والبرامج والزيارات.',
    contactPageDescription: 'هل لديك أسئلة حول القبول أو البرامج أو الفعاليات؟ نحن هنا للمساعدة.',
    getInTouch: 'تواصل معنا',
    callUs: 'اتصل بنا',
    emailUs: 'راسلنا',
    messageSentTitle: 'تم إرسال الرسالة!',
    messageSentDescription:
      'شكراً لتواصلك معنا. تلقى أحد أعضاء فريقنا رسالتك وسيرد في أقرب وقت ممكن.',
    sendAnotherMessage: 'إرسال رسالة أخرى',
    backToHome: 'العودة للرئيسية',
    contactPhone: 'الهاتف: +93 700 000 000',
    contactEmail: 'البريد: info@nazim.school',
    contactAddress: 'العنوان: كابول، أفغانستان',

    officeHours: 'ساعات العمل',
    mondayFriday: 'الإثنين - الجمعة',
    mondayFridayHours: '٨:٠٠ ص - ٥:٠٠ م',
    saturday: 'السبت',
    saturdayHours: '٩:٠٠ ص - ١:٠٠ م',
    sunday: 'الأحد',
    closed: 'مغلق',
    phoneHours: 'الإثنين-الجمعة من ٨ ص إلى ٥ م',
    replyWithin24Hours: 'نرد عادة خلال ٢٤ ساعة.',
    sendMessageTitle: 'أرسل لنا رسالة',
    sendMessageDescription: 'يسعدنا أن نسمع منك. يرجى ملء هذا النموذج وسنتواصل معك قريباً.',
    contactFirstName: 'الاسم الأول',
    contactLastName: 'اسم العائلة',
    contactEmailAddress: 'البريد الإلكتروني',
    contactPhoneNumber: 'رقم الهاتف',
    contactSubject: 'الموضوع',
    contactMessage: 'الرسالة',
    placeholderFirstName: 'علي',
    placeholderLastName: 'خان',
    placeholderEmail: 'ali@example.com',
    placeholderPhone: '+93 700 000 000',
    placeholderSubject: 'استفسار عن القبول',
    placeholderMessage: 'كيف يمكننا مساعدتك؟',
    sendMessageButton: 'إرسال الرسالة',
    sending: 'جاري الإرسال...',
    schoolLocation: 'موقع المدرسة',

    galleryTitle: 'المعرض والألبومات',
    galleryDescription: 'تصفح مجموعتنا من الصور والفيديوهات والتسجيلات الصوتية.',
    albums: 'الألبومات',
    allAlbums: 'جميع الألبومات',
    photos: 'الصور',
    videos: 'الفيديوهات',
    audio: 'صوت',
    recentUploads: 'آخر الرفعات',
    noMedia: 'لا توجد وسائط.',
    viewAlbum: 'عرض',
    untitled: 'بدون عنوان',

    articlesPageTitle: 'المقالات والمدونة',
    articlesPageDescription: 'اقرأ أحدث مقالاتنا وأفكارنا والمحتوى التعليمي.',
    announcementsPageTitle: 'الإعلانات',
    announcementsPageDescription: 'إعلانات رسمية من مجتمع مدرستنا.',
    newsPageTitle: 'الأخبار والتحديثات',
    newsPageDescription: 'ابق على اطلاع بآخر الأخبار والفعاليات والإعلانات من مجتمع مدرستنا.',
    readMore: 'اقرأ المزيد',
    pinned: 'مثبت',
    articleNotFound: 'المقالة غير موجودة',
    announcementNotFound: 'الإعلان غير موجود',
    articleNotFoundDescription: 'لم نتمكن من العثور على المقالة التي تبحث عنها.',
    announcementNotFoundDescription: 'لم نتمكن من العثور على الإعلان الذي تبحث عنه.',
    backToArticles: 'العودة للمقالات',
    backToAnnouncements: 'العودة للإعلانات',
    noUpdatesAvailable: 'لا توجد تحديثات في الوقت الحالي.',
    checkBackLater: 'يرجى المراجعة لاحقاً.',

    eventsPageTitle: 'الفعاليات والتقويم',
    eventsPageDescription: 'استكشف التجمعات والندوات وفعاليات مجتمع المدرسة القادمة.',
    eventsPageSubtitle: 'استكشف التجمعات والندوات وفعاليات مجتمع المدرسة القادمة.',
    viewEventDetails: 'عرض التفاصيل',
    noEventsYet: 'لا توجد فعاليات قادمة بعد.',
    checkBackSoon: 'يرجى المراجعة قريباً.',
    eventNotFound: 'الفعالية غير موجودة',
    eventNotFoundDescription: 'لم نتمكن من العثور على الفعالية التي تبحث عنها.',
    backToEvents: 'العودة للفعاليات',
    location: 'الموقع',
    date: 'التاريخ',

    admissionsPageTitle: 'القبول الإلكتروني',
    admissionsPageDescription: 'قدم طلبك مع بيانات الطالب والأولياء والمستندات.',
    onlineAdmissions: 'القبول الإلكتروني',
    submitApplicationIntro: 'قدم طلبك مع بيانات الطالب والأولياء والمستندات.',
    applyingInConnectionWith: 'التقديم مرتبط بـ',
    viewProgramDetails: 'عرض تفاصيل البرنامج',
    studentInformation: 'بيانات الطالب',
    guardianInformation: 'بيانات ولي الأمر',
    addressInformation: 'بيانات العنوان',
    previousSchoolSection: 'المدرسة السابقة',
    additionalDetails: 'تفاصيل إضافية',
    guarantorInformation: 'بيانات الكفيل (الضامن)',
    documentsSection: 'المستندات',
    additionalFields: 'حقول إضافية',
    fullName: 'الاسم الكامل',
    fatherName: 'اسم الأب',
    grandfatherName: 'اسم الجد',
    motherName: 'اسم الأم',
    gender: 'الجنس',
    birthDate: 'تاريخ الميلاد',
    birthYear: 'سنة الميلاد',
    age: 'العمر',
    applyingGrade: 'الصف المطلوب',
    admissionYear: 'سنة القبول',
    nationality: 'الجنسية',
    preferredLanguage: 'اللغة المفضلة',
    studentPhoto: 'صورة الطالب',
    guardianName: 'اسم ولي الأمر',
    guardianRelation: 'صلة ولي الأمر',
    guardianPhone: 'هاتف ولي الأمر',
    guardianTazkira: 'هوية ولي الأمر',
    guardianPhoto: 'صورة ولي الأمر',
    homeAddress: 'عنوان المنزل',
    originProvince: 'المحافظة الأصلية',
    originDistrict: 'المنطقة الأصلية',
    originVillage: 'القرية الأصلية',
    currentProvince: 'المحافظة الحالية',
    currentDistrict: 'المنطقة الحالية',
    currentVillage: 'القرية الحالية',
    previousSchool: 'المدرسة السابقة',
    previousGradeLevel: 'الصف السابق',
    previousAcademicYear: 'السنة الدراسية السابقة',
    previousSchoolNotes: 'ملاحظات المدرسة السابقة',
    emergencyContactName: 'اسم جهة الاتصال للطوارئ',
    emergencyContactPhone: 'هاتف جهة الاتصال للطوارئ',
    familyIncome: 'دخل الأسرة',
    isOrphan: 'يتيم',
    disabilityStatus: 'حالة الإعاقة',
    guarantorName: 'اسم الكفيل',
    guarantorPhone: 'هاتف الكفيل',
    guarantorTazkira: 'هوية الكفيل',
    guarantorAddress: 'عنوان الكفيل',
    documentType: 'نوع المستند',
    addDocument: 'إضافة مستند',
    noDocumentsAdded: 'لم تتم إضافة مستندات.',
    file: 'ملف',
    selectType: 'اختر النوع',
    selectGender: 'اختر الجنس',
    male: 'ذكر',
    female: 'أنثى',
    submitAdmission: 'تقديم الطلب',
    submitting: 'جاري التقديم...',
    documentTypePassport: 'جواز السفر',
    documentTypeTazkira: 'الهوية الوطنية',
    documentTypeBirthCertificate: 'شهادة الميلاد',
    documentTypeTranscript: 'كشف الدرجات',
    documentTypePhoto: 'صورة',
    documentTypeOther: 'أخرى',

    scholarsPageTitle: 'علماؤنا والموظفون',
    scholarsPageDescription: 'تعرف على المعلمين والعلماء الملتزمين الذين يوجهون مجتمعنا.',
    staffMemberDefault: 'عضو في مؤسستنا.',
    noScholarProfiles: 'لم يتم العثور على ملفات علماء'
  }
};
