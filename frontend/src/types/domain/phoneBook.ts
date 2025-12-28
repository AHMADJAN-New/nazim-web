/**
 * Phone Book Domain Types
 * 
 * Represents phone book entries from various sources:
 * - Students (guardian, emergency contact, zamin)
 * - Staff
 * - Donors
 * - Event Guests
 * - Other members
 */

export type PhoneBookCategory = 
  | 'student_guardian'
  | 'student_emergency'
  | 'student_zamin'
  | 'staff'
  | 'donor'
  | 'guest'
  | 'other';

export interface PhoneBookEntry {
  id: string;
  category: PhoneBookCategory;
  name: string;
  phone: string;
  email: string | null;
  relation: string;
  
  // Student-specific fields
  student_name?: string;
  admission_no?: string;
  
  // Staff-specific fields
  employee_id?: string;
  
  // Donor-specific fields
  contact_person?: string;
  
  // Guest-specific fields
  guest_code?: string;
  
  // Common fields
  address?: string | null;
}

export interface PhoneBookFilters {
  category?: 'all' | 'students' | 'staff' | 'donors' | 'guests' | 'others';
  search?: string;
}

