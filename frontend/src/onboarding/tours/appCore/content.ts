/**
 * App Core Tour - Content
 * 
 * Step content for the main app tour.
 * This file can be extended for i18n support later.
 */

export const tourContent = {
  welcome: {
    title: 'Welcome to Nazim!',
    text: [
      "We're excited to have you here! Let's take a quick tour to help you get familiar with the application.",
      'This tour will show you the main features and how to navigate around.',
    ],
  },
  dashboard: {
    title: 'Your Dashboard',
    text: [
      'This is your Dashboard - your central hub for school management.',
      'Here you can see key metrics, recent activities, and quick access to important features.',
    ],
  },
  sidebar: {
    title: 'Navigation Sidebar',
    text: [
      'Use the sidebar to navigate between different sections of the application.',
      'Click on any menu item to explore that section. Some items have sub-menus that expand when clicked.',
    ],
  },
  sidebarStudents: {
    title: 'Student Management',
    text: [
      'Manage all your student information here.',
      'You can register new students, view student profiles, manage admissions, and track student progress.',
    ],
  },
  sidebarStaff: {
    title: 'Staff Management',
    text: [
      'Manage your staff members and teachers.',
      'Register new staff, assign roles, and manage teacher assignments to classes and subjects.',
    ],
  },
  sidebarAttendance: {
    title: 'Attendance Tracking',
    text: [
      'Track student and staff attendance.',
      'Mark daily attendance, view attendance reports, and monitor attendance patterns.',
    ],
  },
  sidebarExams: {
    title: 'Examinations',
    text: [
      'Manage examinations and assessments.',
      'Create exam schedules, enter grades, and generate report cards for students.',
    ],
  },
  sidebarFinance: {
    title: 'Finance Management',
    text: [
      'Handle all financial operations.',
      'Manage fee collection, track payments, generate invoices, and view financial reports.',
    ],
  },
  sidebarAcademic: {
    title: 'Academic Settings',
    text: [
      'Configure your academic structure.',
      'Set up academic years, classes, subjects, and timetables.',
    ],
  },
  sidebarSettings: {
    title: 'Settings',
    text: [
      'Configure your organization settings.',
      'Manage users, permissions, school branding, and system preferences.',
    ],
  },
  userMenu: {
    title: 'Your Profile',
    text: [
      'Access your profile and account settings from here.',
      'You can update your profile, change settings, or log out.',
    ],
  },
  helpCenter: {
    title: 'Help & Support',
    text: [
      'Need help? Access the Help Center for detailed guides and articles.',
      'You can also find contextual help throughout the application.',
    ],
  },
  complete: {
    title: "You're All Set!",
    text: [
      'Congratulations! You now know the basics of navigating Nazim.',
      'Feel free to explore the app and take this tour again anytime from your profile menu.',
      'Welcome to Nazim!',
    ],
  },
};

/**
 * Get content for a step
 */
export function getStepContent(stepId: keyof typeof tourContent): { title: string; text: string[] } {
  const content = tourContent[stepId];
  return {
    title: content.title,
    text: Array.isArray(content.text) ? content.text : [content.text],
  };
}

