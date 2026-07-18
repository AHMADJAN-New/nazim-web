/**
 * Public website translations (Farsi).
 * Used for: marketing landing page, about us, school public portal (websitePublic).
 * Edit this file for all public-facing website copy (Farsi).
 */

import type { WebsitePublicTranslations } from './types';
import { websitePublicEn } from './public-en';

export const websitePublicFa: WebsitePublicTranslations = {
  ...websitePublicEn,
  aboutUs: {
    cta: {
      button: 'تماس با ما',
      text: 'می‌خواهید بیشتر بدانید که چگونه می‌توانیم به مکتب شما کمک کنیم؟'
    },
    mission: {
      content:
        'ماموریت ما ارائه راه‌حل‌های جامع، کاربرپسند و مقرون‌به‌صرفه برای مدیریت مکتب است که به نهادهای آموزشی کمک می‌کند تا عملیات خود را ساده‌سازی کنند، نتایج یادگیری را بهبود بخشند و ارتباطات با جامعه را تقویت کنند. ما معتقدیم که هر مکتب، صرف نظر از اندازه، شایسته دسترسی به تکنالوژی مدرن است که می‌تواند نحوه مدیریت نهاد آنها را متحول کند.',
      title: 'ماموریت ما'
    },
    subtitle:
      'توانمندسازی نهادهای آموزشی با راه‌حل‌های تکنالوژی مدرن برای نتایج یادگیری بهتر.',
    title: 'درباره ما',
    values: {
      community: {
        content:
          'ما متعهد به ایجاد روابط قوی با مشتریان خود و حمایت از جامعه آموزشی هستیم.',
        title: 'جامعه'
      },
      excellence: {
        content:
          'ما برای برتری در هر جنبه‌ای از خدمات خود، از توسعه محصول تا پشتیبانی مشتری، تلاش می‌کنیم.',
        title: 'برتری'
      },
      innovation: {
        content:
          'ما به طور مداوم نوآوری می‌کنیم تا راه‌حل‌های پیشرفته‌ای ارائه دهیم که نیازهای در حال تحول نهادهای آموزشی را برآورده کند.',
        title: 'نوآوری'
      },
      integrity: {
        content:
          'ما با صداقت، شفافیت و شیوه‌های اخلاقی در تمام معاملات تجاری خود عمل می‌کنیم.',
        title: 'صداقت'
      },
      title: 'ارزش‌های ما'
    },
    vision: {
      content:
        'ما آینده‌ای را تصور می‌کنیم که در آن همه نهادهای آموزشی، به ویژه مکاتب اسلامی و مدارس دینی، به سیستم‌های مدیریتی قدرتمند، بصری و متناسب با فرهنگ دسترسی داشته باشند که از نیازهای منحصر به فرد آنها پشتیبانی کند. هدف ما این است که پیشروترین ارائه‌دهنده راه‌حل‌های مدیریت مکتب در منطقه باشیم و به هزاران مکتب کمک کنیم تا عملیات خود را دیجیتالی کرده و بر آنچه که بیشترین اهمیت را دارد تمرکز کنند: آموزش.',
      title: 'چشم‌انداز ما'
    },
    whatWeOffer: {
      affordable: {
        content:
          'ما پلان‌های قیمتی انعطاف‌پذیری را ارائه می‌دهیم که متناسب با مکاتب در هر اندازه، از مدارس کوچک تا نهادهای بزرگ است.',
        title: 'قیمت‌گذاری مقرون‌به‌صرفه'
      },
      comprehensive: {
        content:
          'از مدیریت شاگردان تا امور مالی، حاضری تا امتحانات، ما تمام جنبه‌های مدیریت مکتب را پوشش می‌دهیم.',
        title: 'راه‌حل‌های جامع'
      },
      support: {
        content:
          'تیم ما همیشه آماده است تا در آموزش، پشتیبانی تخنیکی و کمک‌های مداوم به شما یاری رساند.',
        title: 'پشتیبانی اختصاصی'
      },
      title: 'آنچه ما ارائه می‌دهیم'
    }
  },
  landing: {
    ...websitePublicEn.landing,
    benefits: {
      cloudBased: {
        description: 'دسترسی به داده‌های خود از هر مکان، هر زمان و از هر دستگاه',
        title: 'مبتنی بر ابر'
      },
      lightningFast: {
        description: 'عملکرد بهینه برای دسترسی فوری به تمام ویژگی‌ها',
        title: 'فوق‌العاده سریع'
      },
      mobileReady: {
        description: 'طراحی واکنش‌گرا که به طور کامل روی تمام دستگاه‌ها کار می‌کند',
        title: 'آماده موبایل'
      },
      multiLanguage: {
        description: 'پشتیبانی از زبان‌های انگلیسی، اردو، عربی و پشتو',
        title: 'چند زبانه'
      },
      secureReliable: {
        description: 'امنیت در سطح سازمانی با ضمانت 99.9% زمان کار',
        title: 'امن و قابل اعتماد'
      },
      support24x7: {
        description: 'پشتیبانی مشتری و کمک آموزشی شبانه‌روزی',
        title: 'پشتیبانی 24/7'
      }
    },
    contact: {
      messageFailed: 'ارسال پیام ناموفق بود',
      messageFailedDescription: 'لطفاً بعداً دوباره تلاش کنید.',
      messageSent: 'پیام ارسال شد',
      messageSentDescription: 'ما به زودی با شما تماس خواهیم گرفت.'
    },
    features: {
      assets: {
        description: 'پیگیری و مدیریت دارایی‌های مکتب، تجهیزات و موجودی',
        title: 'مدیریت دارایی'
      },
      attendance: {
        description:
          'مدیریت حضور و غیاب در زمان واقعی با گزارش‌دهی و اعلان‌های خودکار',
        title: 'پیگیری حضور و غیاب'
      },
      classes: {
        description: 'مدیریت صنف‌ها، سال‌های تعلیمی و تخصیص صنف‌ها',
        title: 'مدیریت صنف'
      },
      dms: {
        description: 'سیستم مدیریت اسناد متمرکز برای تمام اسناد مکتب',
        title: 'سیستم مدیریت اسناد (DMS)'
      },
      events: {
        description:
          'برنامه‌ریزی و مدیریت رویدادهای مکتب، فعالیت‌ها و اعلانات',
        title: 'مدیریت رویدادها'
      },
      exams: {
        description: 'ایجاد و مدیریت امتحانات، برنامه‌ها و نتایج امتحانات',
        title: 'مدیریت امتحانات'
      },
      fees: {
        description: 'پیگیری جمع‌آوری فیس، برنامه‌های پرداخت و مانده حساب‌ها',
        title: 'مدیریت فیس'
      },
      finance: {
        description: 'مدیریت مالی جامع با درآمد، هزینه‌ها و گزارش‌دهی',
        title: 'ماژول مالی'
      },
      grades: {
        description:
          'پیگیری و مدیریت نمرې شاگردان، کارنامه‌ها و عملکرد آکادمیک',
        title: 'مدیریت نمرې'
      },
      graduation: {
        description: 'مدیریت فراغت و تولید گواهینامه برای شاگردان',
        title: 'فراغت و گواهینامه‌ها'
      },
      hostel: {
        description: 'مدیریت کامل لیلیه با تخصیص اتاق و مدیریت شاگردان',
        title: 'مدیریت لیلیه'
      },
      library: {
        description:
          'مدیریت کتابخانه دیجیتال با پیگیری کتاب‌ها و سوابق امانت شاگردان',
        title: 'مدیریت کتابخانه'
      },
      studentManagement: {
        description:
          'سیستم کامل اطلاعات شاگردان با شمولیت، سوابق و پیگیری پیشرفت',
        title: 'مدیریت شاگردان'
      },
      students: {
        description:
          'سیستم کامل اطلاعات شاگردان با شمولیت، سوابق و پیگیری پیشرفت',
        title: 'مدیریت شاگردان'
      },
      subjects: {
        description: 'مدیریت مضامین، تخصیص به صنف‌ها و پیگیری ارائه مضامین',
        title: 'مدیریت مضامین'
      },
      timetables: {
        description: 'ایجاد و مدیریت تقسیم‌اوقات صنف با زمان‌بندی خودکار',
        title: 'تولید تقسیم‌اوقات'
      }
    },
    footer: {
      careers: 'فرصت‌های شغلی',
      company: 'شرکت',
      copyright: '© 2026 سیستم مدیریت مکتب ناظم. تمامی حقوق محفوظ است.',
      features: 'ویژگی‌ها',
      pricing: 'قیمت‌گذاری',
      product: 'محصول',
      security: 'امنیت',
      support: 'پشتیبانی',
      tagline:
        'توانمندسازی مؤسسات آموزشی با راه‌حل‌های فناوری مدرن برای نتایج یادگیری بهتر.'
    },
    hero: {
      badge: '🚀 مورد اعتماد بیش از 500 مکتب در سراسر جهان',
      description:
        'برای مدیران، ناظمان و استادان مکتب: ثبت نام، حاضری، امتحانات و راپورها در یک سیستم — بدون سردرگمی.',
      startFreeTrial: 'شروع آزمایشی رایگان',
      subtitle:
        'عملیات را ساده کنید، نتایج یادگیری را بهبود بخشید و ارتباطات جامعه را با پلتفرم جامع مدیریت مکتب اسلامی ما تقویت کنید.',
      title: 'مدیریت مکتب خود را',
      titleHighlight: 'متحول کنید',
      watchDemo: 'تماشای دمو'
    },
    nav: {
      contact: 'تماس',
      features: 'ویژگی‌ها',
      finance: 'مالی',
      getStarted: 'شروع کنید',
      pricing: 'قیمت‌گذاری',
      reviews: 'نظرات',
      signIn: 'ورود'
    },
    planRequest: {
      failed: 'درخواست پلان ناموفق بود',
      failedDescription: 'لطفاً بعداً دوباره تلاش کنید.',
      sent: 'درخواست پلان ارسال شد',
      sentDescription: 'تیم ما با بهترین گزینه با شما تماس خواهد گرفت.'
    },
    pricing: {
      defaultDescription: 'پلان انعطاف‌پذیر طراحی شده برای مکاتب مدرن.',
      enterprise: {
        description: 'برای مؤسسات بزرگ با شاگردان نامحدود',
        name: 'سازمانی'
      },
      feature: 'ویژگی',
      free: 'رایگان',
      period: '/ماه',
      periodYear: '/سال',
      professional: {
        description: 'ایده‌آل برای مکاتب متوسط تا 1000 شاگرد',
        name: 'حرفه‌ای'
      },
      starter: {
        description: 'مناسب برای مکاتب کوچک تا 200 شاگرد',
        name: 'شروع'
      }
    },
    sections: {
      ...websitePublicEn.landing.sections,
      benefits: {
        badge: 'چرا ما را انتخاب کنید',
        subtitle:
          'تفاوت را با فناوری پیشرفته و پشتیبانی اختصاصی ما تجربه کنید.',
        title: 'ساخته شده برای مؤسسات آموزشی مدرن'
      },
      contact: {
        badge: 'تماس با ما',
        businessHours: 'ساعات کاری',
        conversationDescription:
          'متخصصان فناوری آموزشی ما آماده هستند تا در مورد نیازهای منحصر به فرد مکتب شما بحث کنند و به شما نشان دهند که پلتفرم ما چگونه می‌تواند تفاوت ایجاد کند.',
        emailAddress: 'آدرس ایمیل',
        emailSupport: 'پشتیبانی ایمیل',
        firstName: 'نام',
        formDescription:
          'فرم زیر را پر کنید و ما در عرض 24 ساعت با شما تماس خواهیم گرفت.',
        lastName: 'تخلص',
        letsStartConversation: 'بیایید گفتگو را شروع کنیم',
        message: 'پیام',
        messageFailed: 'ارسال پیام ناموفق بود',
        messageFailedDescription: 'لطفاً بعداً دوباره تلاش کنید.',
        messageSent: 'پیام ارسال شد',
        messageSentDescription: 'ما به زودی با شما تماس خواهیم گرفت.',
        numberOfStudents: 'تعداد شاگردان',
        officeAddress: 'آدرس دفتر',
        phoneNumber: 'شماره تلفن',
        phoneSupport: 'پشتیبانی تلفنی',
        schoolName: 'نام مکتب',
        sending: 'در حال ارسال...',
        sendMessage: 'پیام بفرستید',
        sendMessageButton: 'ارسال پیام',
        subtitle:
          'آماده تحول مدیریت مکتب خود هستید؟ تیم ما اینجاست تا به شما کمک کند شروع کنید.',
        title: 'در تماس باشید',
        whatsappSupport: 'پشتیبانی واتساپ'
      },
      cta: {
        note: '✓ آزمایش رایگان 30 روزه • ✓ نیاز به کارت اعتباری نیست • ✓ کمک راه‌اندازی شامل است',
        scheduleDemo: 'زمان‌بندی دمو',
        startFreeTrial: 'شروع آزمایشی رایگان خود',
        subtitle:
          'به هزاران مکتبی بپیوندید که قبلاً عملیات خود را با سیستم مدیریت جامع ما دیجیتالی کرده‌اند.',
        title: 'آماده تحول مدیریت مکتب خود هستید؟'
      },
      features: {
        badge: 'ویژگی‌ها',
        subtitle:
          'از شمولیت شاگردان تا فراغت، پلتفرم جامع ما تمام جنبه‌های مدیریت مکتب را پوشش می‌دهد.',
        title: 'همه آنچه برای مدیریت مکتب خود نیاز دارید'
      },
      pricing: {
        allPlansNote:
          'همه پلان‌ها شامل آزمایش رایگان 30 روزه • بدون هزینه راه‌اندازی • لغو در هر زمان',
        badge: 'قیمت‌گذاری',
        comparisonSubtitle: 'ببینید کدام ویژگی‌ها در هر پلان گنجانده شده است',
        comparisonTitle: 'مقایسه پلان‌ها و ویژگی‌ها',
        customPlanLink: 'به پلان سفارشی نیاز دارید؟ با تیم فروش ما تماس بگیرید →',
        feature: 'ویژگی',
        mostPopular: 'محبوب‌ترین',
        subtitle:
          'پلان مناسب برای مؤسسه خود را انتخاب کنید. همه پلان‌ها شامل ویژگی‌های اصلی بدون هزینه‌های پنهان هستند.',
        title: 'قیمت‌گذاری ساده و شفاف'
      },
      testimonials: {
        badge: 'نظرات',
        subtitle:
          'ببینید مدیران و استادان مکاتب در مورد پلتفرم ما چه می‌گویند.',
        title: 'مورد علاقه مربیان در سراسر جهان'
      }
    },
    stats: {
      staffMembers: 'اعضای کارکنان',
      studentsManaged: 'شاگردان مدیریت شده',
      supportAvailable: 'پشتیبانی موجود',
      uptimeGuarantee: 'ضمانت زمان کار'
    },
    index: {
      heroBadges: {
        fullySecure: 'کاملاً امن',
        multiLanguage: 'چند زبانه',
        strongSecurity: 'امنیت قوی',
        permissionControl: 'کنترل دسترسی',
        standardDesign: 'طراحی استاندارد'
      },
      valueBadges: {
        savesTime: 'زمان شما را صرفه‌جویی می‌کند',
        transparentReports: 'گزارش‌های شفاف و دقیق',
        allInOne: 'همه عملیات مدرسه را در یک مکان مدیریت می‌کند'
      },
      stats: {
        activeFeatures: { value: '۱۰۰+', label: 'ویژگی‌های فعال' },
        fastAttendance: { value: 'حاضری سریع', label: '۳ نفر در یک ثانیه' },
        accurate: { value: 'دقیق', label: 'گزارش‌های دقیق و صحیح' },
        trusted: { value: 'قابل اعتماد', label: 'در مدارس مختلف استفاده شده' }
      },
      contactSection: {
        contactInfo: 'اطلاعات تماس',
        tagline: 'ناظم – مدیریت کامل مدرسه در چند کلیک!'
      }
    }
  },
  websitePublic: {
    badge: 'مدرسه اسلامی',
    defaultSchoolName: 'مدرسه ناظم',
    heroMotto: 'شریعت • طریقت • سیاست',
    heroWelcome: 'خوش آمدید به',
    heroSubtitle: 'جامعه آموزشی قابل اعتماد با قرآن، حفظ و برتری علمی.',
    heroTagline: 'پرورش ایمان، دانش و اخلاق با آموزش ریشه‌دار در سنت اسلامی.',
    ctaAdmissions: 'ثبت‌نام',
    ctaApplyNow: 'همین الان درخواست دهید',
    ctaContact: 'تماس با ما',
    visitUs: 'از ما دیدن کنید',
    addressComingSoon: 'آدرس به زودی',
    contact: 'تماس',
    contactDetailsComingSoon: 'اطلاعات تماس به زودی',
    supportUs: 'از ما حمایت کنید',
    donateCta: 'برای ساختن آینده‌مان کمک کنید',
    donate: 'کمک مالی',
    donationsPageTitle: 'از اهداف ما حمایت کنید',
    donationsPageDescription:
      'کمک‌های شما به پرورش نسل بعد با دانش، ایمان و تعالی یاری می‌رساند. هدفی را انتخاب کنید که به دل شما نزدیک است.',
    donationsPageSubtitle: 'هر هدیه در زندگی دانش‌آموزان و جامعه ما تفاوت ایجاد می‌کند.',
    supportDefaultDescription: 'از این اقدام حیاتی برای جامعه ما حمایت کنید.',
    raised: 'جمع‌آوری شده',
    goal: 'هدف',
    funded: 'تأمین شده',
    totalRaised: 'مجموع جمع‌آوری شده',
    donateNow: 'همین الان کمک کنید',
    noActiveDonationFunds: 'صندوق کمک فعالی وجود ندارد',
    checkBackForInitiatives: 'برای اقدامات جدید جمع‌آوری کمک، بعداً مراجعه کنید.',
    aboutOurSchool: 'درباره مدرسه ما',
    discoverMore: 'بیشتر بدانید',
    explorePrograms: 'برنامه‌ها، ابتکارات جامعه و زندگی پردیس ما را ببینید.',
    readFullStory: 'داستان کامل را بخوانید',
    ourEducationalPrograms: 'برنامه‌های آموزشی ما',
    programsIntro:
      'ما برنامه‌هایی برای گروه‌های سنی و نیازهای مختلف داریم، همه ریشه در سنت اصیل اسلامی.',
    featured: 'ویژه',
    learnMore: 'بیشتر بدانید',
    programDefaultDescription:
      'این برنامه جامع برای غنی‌سازی دانش و عمل اسلامی شما طراحی شده است.',
    programsEmpty: 'برنامه‌ها پس از انتشار اینجا نمایش داده می‌شوند.',
    viewAllCourses: 'همه دوره‌ها',
    viewAllPrograms: 'همه برنامه‌ها',
    latestUpdates: 'آخرین به‌روزرسانی‌ها',
    stayConnected: 'با اخبار جامعه و رویدادهای آینده در ارتباط باشید.',
    viewAllUpdates: 'همه به‌روزرسانی‌ها',
    article: 'مقاله',
    readLatestUpdate: 'آخرین به‌روزرسانی از جامعه ما را بخوانید.',
    noRecentNews: 'اخبار اخیر موجود نیست.',
    fullCalendar: 'تقویم کامل',
    moreUpdatesComingSoon: 'به‌روزرسانی‌های بیشتر به زودی.',
    ctaReadyToJoin: 'آماده پیوستن به جامعه ما هستید؟',
    ctaAdmissionsIntro:
      'ثبت‌نام سال تحصیلی آینده اکنون باز است. آینده فرزندتان را با آموزشی که اهمیت دارد تضمین کنید.',
    applyForAdmission: 'درخواست ثبت‌نام',
    scheduleTour: 'بازدید برنامه‌ریزی کنید',
    footerTagline: 'توانمندسازی نسل بعد با دانش، ایمان و تعالی.',
    quickLinks: 'لینک‌های سریع',
    aboutUs: 'درباره ما',
    academics: 'آموزشی',
    portalLogin: 'ورود به پورتال',
    noWebsiteAccess: 'این مدرسه به وب‌سایت عمومی دسترسی ندارد. لطفاً با مدیر مدرسه تماس بگیرید یا برای ورود به پورتال اصلی مراجعه کنید.',
    upgradeRequired: 'ارتقا لازم',
    resources: 'منابع',
    library: 'کتابخانه',
    scholars: 'عالمان',
    fatwas: 'فتواها',
    privacyPolicy: 'سیاست حفظ حریم خصوصی',
    termsOfService: 'شرایط خدمات',
    coursesPageTitle: 'برنامه‌های آموزشی',
    coursesPageDescription: 'مجموعه دوره‌های آموزشی اسلامی ما را برای تمام سطوح ببینید.',
    searchCourses: 'جستجوی دوره‌ها...',
    all: 'همه',
    enrollNow: 'ثبت‌نام کنید',
    viewDetails: 'مشاهده جزئیات',
    general: 'عمومی',
    course: 'دوره',
    noCoursesFound: 'دوره‌ای یافت نشد',
    libraryPageTitle: 'کتابخانه دیجیتال',
    libraryPageDescription: 'به مجموعه کتاب‌ها، مقالات و منابع آموزشی اسلامی ما دسترسی پیدا کنید.',
    searchLibrary: 'جستجو بر اساس عنوان، نویسنده یا توضیحات...',
    pdfAvailable: 'نسخه PDF موجود است',
    noBooksFound: 'کتابی یافت نشد',
    tryAdjustingSearch: 'عبارت جستجو یا فیلتر دسته را تغییر دهید.',
    unknownAuthor: 'نویسنده نامشخص',
    noDescription: 'توضیحی موجود نیست.',
    fatwasPageTitle: 'فتواها و احکام اسلامی',
    fatwasPageDescription: 'مجموعه احکام اسلامی ما را ببینید یا از علمای ما سوال بپرسید.',
    searchFatwasPlaceholder: 'جستجوی فتوها بر اساس سوال، جواب یا موضوع...',
    allFatwas: 'همه فتوها',
    topics: 'موضوعات',
    haveAQuestion: 'سوالی دارید؟',
    submitQuestionText: 'سوال خود را برای علمای ما ارسال کنید و بر اساس منابع اصیل اسلامی پاسخ بگیرید.',
    askAQuestion: 'سوال بپرسید',
    searchResults: 'نتایج جستجو',
    inCategory: 'در',
    recentFatwas: 'فتواهای اخیر',
    searchingFor: 'جستجو برای:',
    result: 'نتیجه',
    results: 'نتایج',
    noFatwasFound: 'فتوایی یافت نشد',
    noFatwasMatching: 'فتوایی برای «{query}» یافت نشد. عبارت جستجو را تغییر دهید یا بر اساس دسته ببینید.',
    noFatwasInCategory: 'در این دسته فتوایی نیست.',
    noPublishedFatwas: 'هنوز فتوای منتشر شده‌ای وجود ندارد.',
    clearSearch: 'پاک کردن جستجو',
    viewAllFatwas: 'همه فتوها',
    category: 'دسته',
    filteredResults: 'نتایج فیلتر شده',
    graduatesBadge: 'افتخار و میراث ما',
    graduatesTitle: 'نمایش فارغ‌التحصیلان',
    graduatesDescription: 'تقدیر از دانش‌آموزانی که مسیر خود را با ما به پایان رساندند و اکنون با دانش و امانت به جامعه خدمت می‌کنند.',
    searchGraduates: 'جستجوی فارغ‌التحصیلان با نام...',
    allYears: 'همه سال‌ها',
    allGraduatingYears: 'همه سال‌های فراغت',
    classOf: 'فارغ‌التحصیل',
    loadingGraduates: 'در حال بارگذاری فارغ‌التحصیلان...',
    allAnnouncements: 'همه اعلانات',
    allArticles: 'همه مقالات',
    programHifz: 'برنامه حفظ',
    programHifzDesc: 'حفظ منظم با مرور روزانه و راهنمایی استاد.',
    programTajweed: 'تجوید و قرائت',
    programTajweedDesc: 'تلاوت صحیح با استادان تایید‌شده.',
    programNizami: 'درس نظامی',
    programNizamiDesc: 'علوم اسلامی کلاسیک همراه با دروس مدرن.',
    latestAnnouncements: 'آخرین اعلان‌ها',
    viewAll: 'مشاهده همه',
    sampleAnnouncement: 'ثبت‌نام جدید باز شد',
    sampleAnnouncementDesc: 'درخواست‌ها برای سال تحصیلی جدید پذیرفته می‌شود.',
    upcomingEvents: 'رویدادهای آینده',
    viewCalendar: 'مشاهده تقویم',
    sampleEvent: 'روز باز جامعه',
    sampleEventDesc: 'با استادان آشنا شوید و برنامه‌ها را ببینید.',
    sampleDate: 'این آخر هفته',
    contactTitle: 'در تماس باشید',
    contactDesc: 'برای ثبت‌نام و بازدید با ما تماس بگیرید.',
    contactPageDescription: 'سوالی درباره ثبت‌نام، برنامه‌ها یا رویدادها دارید؟ ما اینجا هستیم تا کمک کنیم.',
    getInTouch: 'با ما در تماس باشید',
    callUs: 'با ما تماس بگیرید',
    emailUs: 'به ما ایمیل بزنید',
    messageSentTitle: 'پیام ارسال شد!',
    messageSentDescription:
      'از تماس شما متشکریم. یکی از اعضای تیم ما پیام شما را دریافت کرده و در اسرع وقت پاسخ خواهد داد.',
    sendAnotherMessage: 'ارسال پیام دیگر',
    backToHome: 'بازگشت به صفحه اصلی',
    contactPhone: 'تلفن: +93 700 000 000',
    contactEmail: 'ایمیل: info@nazim.school',
    contactAddress: 'آدرس: کابل، افغانستان',

    officeHours: 'ساعات اداری',
    mondayFriday: 'دوشنبه - جمعه',
    mondayFridayHours: '۸:۰۰ ص - ۵:۰۰ ع',
    saturday: 'شنبه',
    saturdayHours: '۹:۰۰ ص - ۱:۰۰ ع',
    sunday: 'یکشنبه',
    closed: 'تعطیل',
    phoneHours: 'دوشنبه تا جمعه ۸ ص تا ۵ ع',
    replyWithin24Hours: 'معمولاً ظرف ۲۴ ساعت پاسخ می‌دهیم.',
    sendMessageTitle: 'پیام بفرستید',
    sendMessageDescription: 'خوشحال می‌شویم از شما بشنویم. این فرم را پر کنید تا به زودی با شما تماس بگیریم.',
    contactFirstName: 'نام',
    contactLastName: 'نام خانوادگی',
    contactEmailAddress: 'ایمیل',
    contactPhoneNumber: 'شماره تلفن',
    contactSubject: 'موضوع',
    contactMessage: 'پیام',
    placeholderFirstName: 'علی',
    placeholderLastName: 'خان',
    placeholderEmail: 'ali@example.com',
    placeholderPhone: '+93 700 000 000',
    placeholderSubject: 'استعلام ثبت‌نام',
    placeholderMessage: 'چطور می‌توانیم کمک کنیم؟',
    sendMessageButton: 'ارسال پیام',
    sending: 'در حال ارسال...',
    schoolLocation: 'موقعیت مدرسه',

    galleryTitle: 'گالری و آلبوم‌ها',
    galleryDescription: 'مجموعه عکس‌ها، ویدیوها و ضبط‌های صوتی ما را ببینید.',
    albums: 'آلبوم‌ها',
    allAlbums: 'همه آلبوم‌ها',
    photos: 'عکس‌ها',
    videos: 'ویدیوها',
    audio: 'صدا',
    recentUploads: 'آپلودهای اخیر',
    noMedia: 'رسانه‌ای موجود نیست.',
    viewAlbum: 'مشاهده',
    untitled: 'بدون عنوان',

    articlesPageTitle: 'مقالات و بلاگ',
    articlesPageDescription: 'آخرین مقالات، اندیشه‌ها و محتوای آموزشی ما را بخوانید.',
    announcementsPageTitle: 'اعلانات',
    announcementsPageDescription: 'اعلانات رسمی جامعه مدرسه ما.',
    newsPageTitle: 'اخبار و به‌روزرسانی‌ها',
    newsPageDescription: 'با آخرین رویدادها، اخبار و اعلانات جامعه مدرسه ما همراه باشید.',
    readMore: 'بیشتر بخوانید',
    pinned: 'سنجاق‌شده',
    articleNotFound: 'مقاله یافت نشد',
    announcementNotFound: 'اعلان یافت نشد',
    articleNotFoundDescription: 'مقاله‌ای که دنبال آن بودید پیدا نشد.',
    announcementNotFoundDescription: 'اعلانی که دنبال آن بودید پیدا نشد.',
    backToArticles: 'بازگشت به مقالات',
    backToAnnouncements: 'بازگشت به اعلانات',
    noUpdatesAvailable: 'در حال حاضر به‌روزرسانی موجود نیست.',
    checkBackLater: 'لطفاً بعداً مراجعه کنید.',

    eventsPageTitle: 'رویدادها و تقویم',
    eventsPageDescription: 'جمع‌ها، سمینارها و رویدادهای جامعه مدرسه را ببینید.',
    eventsPageSubtitle: 'جمع‌ها، سمینارها و رویدادهای جامعه مدرسه را ببینید.',
    viewEventDetails: 'مشاهده جزئیات',
    noEventsYet: 'هنوز رویداد آینده‌ای نیست.',
    checkBackSoon: 'لطفاً به زودی دوباره سر بزنید.',
    eventNotFound: 'رویداد یافت نشد',
    eventNotFoundDescription: 'رویدادی که دنبال آن بودید پیدا نشد.',
    backToEvents: 'بازگشت به رویدادها',
    location: 'مکان',
    date: 'تاریخ',

    admissionsPageTitle: 'ثبت‌نام آنلاین',
    admissionsPageDescription: 'درخواست خود را با اطلاعات دانش‌آموز، سرپرست و مدارک ارسال کنید.',
    onlineAdmissions: 'ثبت‌نام آنلاین',
    submitApplicationIntro: 'درخواست خود را با اطلاعات دانش‌آموز، سرپرست و مدارک ارسال کنید.',
    applyingInConnectionWith: 'درخواست در ارتباط با',
    viewProgramDetails: 'مشاهده جزئیات برنامه',
    studentInformation: 'اطلاعات دانش‌آموز',
    guardianInformation: 'اطلاعات سرپرست',
    addressInformation: 'اطلاعات آدرس',
    previousSchoolSection: 'مدرسه قبلی',
    additionalDetails: 'جزئیات تکمیلی',
    guarantorInformation: 'اطلاعات ضامن (کفیل)',
    documentsSection: 'مدارک',
    additionalFields: 'فیلدهای اضافی',
    fullName: 'نام کامل',
    fatherName: 'نام پدر',
    grandfatherName: 'نام پدربزرگ',
    motherName: 'نام مادر',
    gender: 'جنسیت',
    birthDate: 'تاریخ تولد',
    birthYear: 'سال تولد',
    age: 'سن',
    applyingGrade: 'پایه درخواستی',
    admissionYear: 'سال ثبت‌نام',
    nationality: 'ملیت',
    preferredLanguage: 'زبان ترجیحی',
    studentPhoto: 'عکس دانش‌آموز',
    guardianName: 'نام سرپرست',
    guardianRelation: 'نسبت سرپرست',
    guardianPhone: 'تلفن سرپرست',
    guardianTazkira: 'تذکره سرپرست',
    guardianPhoto: 'عکس سرپرست',
    homeAddress: 'آدرس منزل',
    originProvince: 'ولایت اصلی',
    originDistrict: 'ولسوالی اصلی',
    originVillage: 'قریه اصلی',
    currentProvince: 'ولایت فعلی',
    currentDistrict: 'ولسوالی فعلی',
    currentVillage: 'قریه فعلی',
    previousSchool: 'مدرسه قبلی',
    previousGradeLevel: 'پایه قبلی',
    previousAcademicYear: 'سال تحصیلی قبلی',
    previousSchoolNotes: 'یادداشت‌های مدرسه قبلی',
    emergencyContactName: 'نام تماس اضطراری',
    emergencyContactPhone: 'تلفن تماس اضطراری',
    familyIncome: 'درآمد خانواده',
    isOrphan: 'یتیم است',
    disabilityStatus: 'وضعیت معلولیت',
    guarantorName: 'نام ضامن',
    guarantorPhone: 'تلفن ضامن',
    guarantorTazkira: 'تذکره ضامن',
    guarantorAddress: 'آدرس ضامن',
    documentType: 'نوع سند',
    addDocument: 'افزودن سند',
    noDocumentsAdded: 'سندی اضافه نشده.',
    file: 'فایل',
    selectType: 'نوع را انتخاب کنید',
    selectGender: 'جنسیت را انتخاب کنید',
    male: 'مرد',
    female: 'زن',
    submitAdmission: 'ارسال درخواست',
    submitting: 'در حال ارسال...',
    documentTypePassport: 'پاسپورت',
    documentTypeTazkira: 'تذکره / شناسنامه',
    documentTypeBirthCertificate: 'گواهی تولد',
    documentTypeTranscript: 'رونوشت',
    documentTypePhoto: 'عکس',
    documentTypeOther: 'سایر',

    scholarsPageTitle: 'عالمان و کارکنان ما',
    scholarsPageDescription: 'با معلمان و عالمان متعهد راهنمای جامعه ما آشنا شوید.',
    staffMemberDefault: 'عضو هیئت مؤسسه ما.',
    noScholarProfiles: 'پروفایل عالمی یافت نشد'
  }
};
