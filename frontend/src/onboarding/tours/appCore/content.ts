/**
 * App Core Tour - Content
 * 
 * Step content for the unified app tour (merged from appCore and initialSetup).
 * This file can be extended for i18n support later.
 */

export const tourContent = {
  welcome: {
    title: 'Welcome to Nazim!',
    icon: 'School',
    text: [
      "We're excited to have you here! Let's take a quick tour to help you get familiar with the application.",
      'This tour will show you the main features, navigation, and common actions you will use every day.',
    ],
  },
  dashboard: {
    title: 'Your Dashboard',
    icon: 'Home',
    text: [
      'This is your Dashboard - your central hub for school management.',
      'Here you can see key metrics, recent activities, and quick access to important features.',
    ],
  },
  dashboardTabs: {
    title: 'Dashboard Tabs',
    icon: 'FileText',
    text: [
      'The dashboard uses tabs to organize different sections of information.',
      'Click on any tab to switch between Overview, Finance, Assets, Library, Attendance, Leave Requests, and Documents.',
      'Each tab shows relevant data and quick actions for that area. Tabs help you navigate without leaving the dashboard.',
      'Tabs are used throughout the application to organize related content. You\'ll find tabs in many pages: student profiles, staff records, reports, and more.',
      'Click any tab to switch views. The active tab is highlighted. On mobile, tab labels may be hidden - icons are always visible.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately. Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  tabsGeneral: {
    title: 'Understanding Tabs',
    icon: 'FileText',
    text: [
      'Tabs are used throughout the application to organize related content.',
      'You\'ll find tabs in many pages: student profiles, staff records, reports, and more.',
      'Click any tab to switch views. The active tab is highlighted. On mobile, tab labels may be hidden - icons are always visible.',
      'Tabs help you access different sections of information without navigating away from the current page.',
    ],
  },
  sidebar: {
    title: 'Navigation Sidebar',
    icon: 'Home',
    text: [
      'The sidebar is your main navigation hub, organized into logical sections.',
      'Operations: Manage students, staff, and attendance. Academic: Handle classes, subjects, and exams. Finance: Track fees and payments. Administration: Configure settings and permissions.',
      'Click any menu item to explore. Items with arrows have sub-menus that expand when clicked.',
    ],
  },
  editIcon: {
    title: 'Edit Icon (Pencil)',
    icon: 'Pencil',
    text: [
      'The edit action always uses the `Pencil` icon from our lucide set.',
      'You will find it beside each record in tables and lists.',
      'Click it to open the inline form where you can update fields right away.',
      'Keeping edits next to the data prevents losing context.',
    ],
  },
  deleteIcon: {
    title: 'Delete Icon (Trash)',
    icon: 'Trash2',
    text: [
      'Our delete icon is the `Trash2` icon from lucide.',
      'It appears beside the edit icon in the same action area.',
      'Use it to remove outdated entries, and confirm when prompted before the deletion goes through.',
    ],
  },
  viewIcon: {
    title: 'View Icon (Eye)',
    icon: 'Eye',
    text: [
      'The `Eye` icon lets you open a read-only view of a record.',
      'Use its button when you want to preview data before editing or deleting.',
      'It is handy for quick lookups without navigating away from the list.',
    ],
  },
  tabsActions: {
    title: 'Tabs & Action Buttons',
    icon: 'FileText',
    text: [
      'Many pages show tabs or pills at the top of the content area (for example, Overview, Records, and Reports).',
      'Switch between these tabs to change the focus of the page without leaving the module.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately.',
      'Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  topBar: {
    title: 'Top Bar Navigation',
    icon: 'Search',
    text: [
      'The top bar provides quick access to essential tools and information.',
      'Use the search bar to quickly find students, staff, or any content. Press Ctrl+K (or Cmd+K on Mac) for the command palette.',
      'The notification bell shows important updates, and the user menu lets you access your profile and settings.',
    ],
  },
  search: {
    title: 'Global Search',
    icon: 'Search',
    text: [
      'Search across the entire application instantly.',
      'Type to find students, staff, classes, or any content. Use Ctrl+K (Cmd+K on Mac) for advanced search with filters.',
    ],
  },
  notifications: {
    title: 'Notifications',
    icon: 'Bell',
    text: [
      'Stay updated with important notifications.',
      'Click the bell icon to see all your notifications. The badge shows unread count.',
    ],
  },
  sidebarStudents: {
    title: 'Student Management',
    icon: 'Users',
    text: [
      'Manage all your student information in one place.',
      'Register new students, view detailed profiles, manage admissions, track academic progress, and handle student documents.',
      'All student data is organized by class and academic year for easy access.',
    ],
  },
  sidebarStaff: {
    title: 'Staff Management',
    icon: 'UserCheck',
    text: [
      'Manage your staff members and teachers efficiently.',
      'Register new staff, assign roles and permissions, manage teacher assignments to classes and subjects, and track staff performance.',
    ],
  },
  sidebarAttendance: {
    title: 'Attendance Tracking',
    icon: 'Calendar',
    text: [
      'Track attendance for both students and staff.',
      'Mark daily attendance, view attendance reports, monitor patterns, and generate attendance summaries for parents and administration.',
    ],
  },
  sidebarExams: {
    title: 'Examinations',
    icon: 'BookOpen',
    text: [
      'Manage all examination and assessment activities.',
      'Create exam schedules, enter grades, generate report cards, and track student performance across all subjects.',
    ],
  },
  sidebarFinance: {
    title: 'Finance Management',
    icon: 'CreditCard',
    text: [
      'Handle all financial operations for your school.',
      'Manage fee collection, track payments, generate invoices and receipts, view financial reports, and monitor outstanding balances.',
    ],
  },
  sidebarAcademic: {
    title: 'Academic Settings',
    icon: 'GraduationCap',
    text: [
      'Configure your academic structure and curriculum.',
      'Set up academic years, create and manage classes, define subjects, build timetables, and organize your academic calendar.',
    ],
  },
  sidebarSettings: {
    title: 'Settings',
    icon: 'Settings',
    text: [
      'Configure your organization and system settings.',
      'Manage users and permissions, customize school branding, configure system preferences, and access administrative tools.',
    ],
  },
  userMenu: {
    title: 'User Menu',
    icon: 'User',
    text: [
      'Access your profile and account settings.',
      'Click your avatar or name to open the user menu. From here you can view your profile, change settings, switch schools (if applicable), adjust language and theme preferences, or log out.',
    ],
  },
  helpCenter: {
    title: 'Help & Support',
    icon: 'HelpCircle',
    text: [
      'Get help whenever you need it.',
      'Click the help icon to access the Help Center with detailed guides, tutorials, and contextual tips. You can also find help buttons throughout the application for specific features.',
    ],
  },
  complete: {
    title: "You're All Set!",
    icon: 'School',
    text: [
      'Congratulations! You now know the basics of navigating Nazim.',
      'You\'ve learned about the sidebar, dashboard tabs, common icons (edit, delete, view), and how to access help.',
      'Feel free to explore the app and take this tour again anytime from your profile menu or the help center.',
      'Welcome to Nazim!',
    ],
  },
};

/**
 * Get content for a step
 */
export function getStepContent(stepId: keyof typeof tourContent): { title: string; text: string[]; icon?: string } {
  const content = tourContent[stepId];
  return {
    title: content.title,
    text: Array.isArray(content.text) ? content.text : [content.text],
    icon: content.icon,
  };
}
