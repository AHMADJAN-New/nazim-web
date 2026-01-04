/**
 * Initial Setup Tour - Content
 * 
 * Step content for the initial setup and onboarding tour.
 */

export const tourContent = {
  welcome: {
    title: 'Welcome to Nazim!',
    text: [
      "Welcome to Nazim School Management System! We're excited to help you get started.",
      "This tour will guide you through the essential features and help you complete your initial setup.",
      "Let's begin by exploring the main interface and then we'll walk you through the setup process.",
    ],
  },
  topBar: {
    title: 'Top Navigation Bar',
    text: [
      'This is your top navigation bar. Here you can access:',
      '• Help Center: Get assistance and documentation',
      '• Notifications: Stay updated with important alerts',
      '• User Menu: Access your profile and settings',
      '• Search: Quickly find anything in the system',
    ],
  },
  helpCenter: {
    title: 'Help Center',
    text: [
      'The Help Center provides comprehensive documentation and guides.',
      'You can access detailed articles, tutorials, and get support whenever you need it.',
      'This is especially useful when setting up your school for the first time.',
    ],
  },
  notifications: {
    title: 'Notifications',
    text: [
      'Stay informed with real-time notifications.',
      'You will receive alerts about important events, pending tasks, and system updates.',
      'The badge shows the number of unread notifications.',
    ],
  },
  userMenu: {
    title: 'User Menu',
    text: [
      'Access your profile, settings, and account options from here.',
      'You can also take this tour again anytime from the user menu.',
      'Let\'s continue to explore the sidebar navigation.',
    ],
  },
  sidebar: {
    title: 'Sidebar Navigation',
    text: [
      'The sidebar is your main navigation hub.',
      'It organizes features into logical sections:',
      '• Operations: Daily operations like students, staff, attendance',
      '• Academic: Academic settings, classes, subjects, exams',
      '• Finance: Financial management and fee collection',
      '• Administration: System settings and user management',
    ],
  },
  operationsSection: {
    title: 'Operations Section',
    text: [
      'The Operations section handles your daily school operations.',
      'Here you can manage:',
      '• Students: Register and manage student records',
      '• Staff: Manage teachers and staff members',
      '• Attendance: Track daily attendance',
      '• Phone Book: Quick access to contacts',
    ],
  },
  academicSection: {
    title: 'Academic Section',
    text: [
      'The Academic section is where you configure your academic structure.',
      'Key features include:',
      '• Academic Years: Set up your academic calendar',
      '• Classes: Create and manage class levels',
      '• Subjects: Define subjects for your curriculum',
      '• Exams: Manage examinations and assessments',
    ],
  },
  financeSection: {
    title: 'Finance Section',
    text: [
      'The Finance section handles all financial operations.',
      'You can manage:',
      '• Fee Structures: Define fee categories and amounts',
      '• Fee Payments: Record and track payments',
      '• Financial Reports: Generate financial statements',
      '• Accounts: Manage income and expenses',
    ],
  },
  administrationSection: {
    title: 'Administration Section',
    text: [
      'The Administration section is for system configuration.',
      'This is where you set up:',
      '• Users: Create and manage user accounts',
      '• Roles: Define user roles and responsibilities',
      '• Permissions: Control access to features',
      '• School Settings: Configure your school information',
    ],
  },
  initialSetup: {
    title: 'Initial Setup Required',
    text: [
      "Now let's complete your initial setup!",
      'To get started, you need to configure:',
      '1. School Data: Set up your school information',
      '2. Academic Structure: Create academic years, classes, and subjects',
      '3. Users & Permissions: Create users and assign roles',
      '4. Role Permissions: Assign permissions to roles',
      "Let's start with the school management settings.",
    ],
  },
  schoolManagementPage: {
    title: 'Schools Management Page',
    text: [
      'This is the Schools Management page.',
      'Here you can view and manage all your school configurations.',
      'You\'ll see a list of schools with options to edit, delete, or manage watermarks.',
      'Take a moment to familiarize yourself with this page.',
    ],
  },
  schoolManagement: {
    title: 'School Management',
    text: [
      'First, configure your school data.',
      'Click the edit button to open the school management form.',
      'Fill in your school information correctly:',
      '• School name (in all languages)',
      '• Contact information (address, phone, email)',
      '• School logos (primary, secondary, ministry)',
      '• Branding colors and fonts',
      'This data will be used in all reports, certificates, and official documents.',
      'Make sure all information is accurate and complete.',
    ],
  },
  userPermissions: {
    title: 'User Permissions Setup',
    text: [
      'Next, set up user permissions.',
      'Navigate to Settings → Permissions to:',
      '• View available permissions',
      '• Understand the permission system',
      '• See how permissions control feature access',
      'Permissions are organized by resource and action (e.g., students.read, students.create).',
    ],
  },
  userCreation: {
    title: 'Create User Accounts',
    text: [
      'Now create user accounts for your team.',
      'Go to Settings → Users to:',
      '• Create new user accounts',
      '• Assign users to your organization',
      '• Set user roles and permissions',
      'Each user needs an account to access the system.',
    ],
  },
  roleAssignment: {
    title: 'Role Assignment',
    text: [
      'Assign roles to users.',
      'Go to Settings → Roles to:',
      '• View available roles (Admin, Teacher, Staff, etc.)',
      '• Assign roles to users',
      '• Understand role-based access control',
      'Roles define what users can do in the system.',
    ],
  },
  rolePermissions: {
    title: 'Assign Permissions to Roles',
    text: [
      'Finally, assign permissions to roles.',
      'In Settings → Roles, you can:',
      '• Assign permissions to each role',
      '• Control what each role can access',
      '• Customize permissions per role',
      'For example, assign "students.read" and "students.create" to the Teacher role.',
    ],
  },
  complete: {
    title: "You're All Set!",
    text: [
      'Congratulations! You have completed the initial setup tour.',
      'You now know:',
      '• How to navigate the interface',
      '• Where to find key features',
      '• How to complete initial setup',
      'Remember: You can take this tour again anytime from your user menu.',
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

