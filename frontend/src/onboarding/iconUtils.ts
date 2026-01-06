/**
 * Icon Utilities for Tour System
 * 
 * Maps icon names to SVG paths for rendering in tour steps.
 * Uses lucide-react icon paths.
 */

/**
 * Icon path data for common lucide-react icons
 * Format: [viewBox, pathData]
 */
/**
 * Icon path data for lucide-react icons
 * Format: [viewBox, ...paths] where paths can be multiple path strings
 * Note: Some icons have multiple path elements, so we join them
 */
const iconPaths: Record<string, [string, ...string[]]> = {
  Home: ['0 0 24 24', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  Users: ['0 0 24 24', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M4 3.13a4 4 0 0 1 0 7.75', 'M22 3.13a4 4 0 0 0 0 7.75'],
  UserCheck: ['0 0 24 24', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 11V9a2 2 0 0 0-2-2h-2', 'M16 7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2z', 'M13 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', 'M13 13a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'],
  Calendar: ['0 0 24 24', 'M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  BookOpen: ['0 0 24 24', 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  FileText: ['0 0 24 24', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  CreditCard: ['0 0 24 24', 'M3 10h18', 'M7 15h1', 'M16 15h1', 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  Settings: ['0 0 24 24', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'],
  GraduationCap: ['0 0 24 24', 'M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5', 'M18 12v5', 'M10 15v5'],
  Search: ['0 0 24 24', 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  Bell: ['0 0 24 24', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  User: ['0 0 24 24', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  HelpCircle: ['0 0 24 24', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  School: ['0 0 24 24', 'M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5', 'M18 12v5', 'M10 15v5'],
  Languages: ['0 0 24 24', 'M5 8l6 6', 'M9 8l-6 6', 'M13 16l-4-4 4-4', 'M17 16l-4-4 4-4'],
  Moon: ['0 0 24 24', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  Sun: ['0 0 24 24', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707'],
  Shield: ['0 0 24 24', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  ClipboardList: ['0 0 24 24', 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2', 'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', 'M9 12h.01', 'M13 12h2', 'M9 16h.01', 'M13 16h2'],
  Clock: ['0 0 24 24', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 6v6l4 2'],
  Building2: ['0 0 24 24', 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z', 'M6 12h12', 'M6 8h12', 'M6 16h12'],
  DoorOpen: ['0 0 24 24', 'M13 4h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3', 'M13 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7', 'M13 4V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2', 'M9 12h.01'],
  Package: ['0 0 24 24', 'M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.81l8-4a2 2 0 0 1 1.78 0z', 'M12 2.21v19.58'],
  MessageSquare: ['0 0 24 24', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  BarChart3: ['0 0 24 24', 'M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  Trophy: ['0 0 24 24', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M12 14h-1', 'M12 14h1', 'M12 14v-8', 'M12 6V4'],
  Activity: ['0 0 24 24', 'M22 12h-4l-3 9L9 3l-3 9H2'],
  DollarSign: ['0 0 24 24', 'M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  Phone: ['0 0 24 24', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
  Pencil: ['0 0 24 24', 'M21.707 2.293a1 1 0 0 0-1.414 0l-1.586 1.586a1 1 0 0 0-.293.707v2.828a1 1 0 0 0 .293.707l6.414 6.414a1 1 0 0 0 1.414 0l2.828-2.828a1 1 0 0 0 0-1.414L21.707 2.293z', 'M18 3l-3 3', 'M15 6l-9 9', 'M3 21h12'],
  Trash2: ['0 0 24 24', 'M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  Eye: ['0 0 24 24', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
};

/**
 * Get SVG HTML for an icon
 */
export function getIconSvg(iconName: string, size: number = 20): string {
  const iconData = iconPaths[iconName];
  if (!iconData) {
    return '';
  }
  
  const [viewBox, ...paths] = iconData;
  const pathsHtml = paths.map(path => `<path d="${path}"/>`).join('');
  
  return `<svg viewBox="${viewBox}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shepherd-icon">
    ${pathsHtml}
  </svg>`;
}

/**
 * Check if an icon name is valid
 */
export function isValidIcon(iconName: string): boolean {
  return iconName in iconPaths;
}

