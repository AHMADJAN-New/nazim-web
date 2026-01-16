/**
 * Format staff name with "son of" connectors for better UX
 * Example: "Ahmad [son of] Mohammad [son of] Ali"
 * 
 * @param firstName - First name
 * @param fatherName - Father name
 * @param grandfatherName - Grandfather name (optional)
 * @param sonOfText - Translation text for "son of" (e.g., "ولد", "بن", "son of")
 * @param isRTL - Whether the language is RTL
 * @returns Formatted name string
 */
export function formatStaffName(
  firstName: string | null | undefined,
  fatherName: string | null | undefined,
  grandfatherName: string | null | undefined,
  sonOfText: string = 'son of',
  isRTL: boolean = false
): string {
  const parts: string[] = [];
  
  // Add first name if available
  if (firstName?.trim()) {
    parts.push(firstName.trim());
  }
  
  // Add father name with connector if available
  if (fatherName?.trim()) {
    if (isRTL) {
      // For RTL: "FirstName ولد FatherName"
      parts.push(`${sonOfText} ${fatherName.trim()}`);
    } else {
      // For LTR: "FirstName son of FatherName"
      parts.push(`${sonOfText} ${fatherName.trim()}`);
    }
  }
  
  // Add grandfather name with connector if available
  if (grandfatherName?.trim()) {
    if (isRTL) {
      // For RTL: "FirstName ولد FatherName ولد GrandfatherName"
      parts.push(`${sonOfText} ${grandfatherName.trim()}`);
    } else {
      // For LTR: "FirstName son of FatherName son of GrandfatherName"
      parts.push(`${sonOfText} ${grandfatherName.trim()}`);
    }
  }
  
  // Join parts with space
  return parts.length > 0 ? parts.join(' ') : '';
}
