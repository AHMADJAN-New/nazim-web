/**
 * Format a date string to a readable format
 * Handles ISO date strings like "2025-12-10T00:00:00.000000Z"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to a full readable format with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Convert ISO date string to yyyy-MM-dd format for HTML date inputs
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Get short description from HTML content (first 100 characters)
 */
export function getShortDescription(html: string | null | undefined, maxLength: number = 100): string {
  if (!html) return "";
  
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '').trim();
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + "...";
}

