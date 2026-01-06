/**
 * Initial Setup Tour - Content
 * 
 * Step content for the updated guided tour.
 */

export const tourContent = {
  welcome: {
    title: 'Welcome to Nazim!',
    text: [
      'This guided tour highlights the navigation, layout, and quick actions you will rely on every day.',
      'You will stay on the dashboard as we walk through the core sections and icons you often see.',
      'Let us show you the key pieces that keep your school running smoothly.',
    ],
  },
  sidebar: {
    title: 'Sidebar Navigation',
    text: [
      'The sidebar is the spine of the application.',
      'It groups features into Operations, Academic, Finance, and Administration, so you always know where to go.',
      'Expand a section to reveal the related links that take you into each module; collapse it to reclaim screen space.',
      'Think of each group as a domain of work: Operations for people and processes, Academic for curriculum, Finance for money, and Administration for users and settings.',
    ],
  },
  editIcon: {
    title: 'Edit Icon (Pencil)',
    text: [
      'The edit action always uses the `Pencil` icon from our lucide set.',
      'You will find it beside each record in tables and lists.',
      'Click it to open the inline form where you can update fields right away.',
      'Keeping edits next to the data prevents losing context.',
    ],
  },
  deleteIcon: {
    title: 'Delete Icon (Trash)',
    text: [
      'Our delete icon is the `Trash2` icon from lucide.',
      'It appears beside the edit icon in the same action area.',
      'Use it to remove outdated entries, and confirm when prompted before the deletion goes through.',
    ],
  },
  viewIcon: {
    title: 'View Icon (Eye)',
    text: [
      'The `Eye` icon lets you open a read-only view of a record.',
      'Use its button when you want to preview data before editing or deleting.',
      'It is handy for quick lookups without navigating away from the list.',
    ],
  },
  tabsActions: {
    title: 'Tabs & Action Buttons',
    text: [
      'Many pages show tabs or pills at the top of the content area (for example, Overview, Records, and Reports).',
      'Switch between these tabs to change the focus of the page without leaving the module.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately.',
      'Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  helpCenter: {
    title: 'Help Center',
    text: [
      'If you ever get stuck, click the help icon in the top bar.',
      'It opens the Help Center where you can browse documentation, tutorials, and contextual tips.',
      'Treat it as the living knowledge base for the entire app whenever you need extra guidance.',
    ],
  },
  complete: {
    title: "You're Ready!",
    text: [
      'You just explored the sidebar, the icons for edit/delete/view, and the tabs/actions that keep workflows tight.',
      'You now know where the core navigation lives and how to act on records from the dashboard.',
      'Reopen this tour anytime from the user menu if you want a refresher.',
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
