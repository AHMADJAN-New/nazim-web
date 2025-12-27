import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SchoolContextType {
  selectedSchoolId: string | null;
  setSelectedSchoolId: (schoolId: string | null) => void;
  hasSchoolsAccessAll: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  // schools_access_all comes from the profile API response
  const hasSchoolsAccessAll = (profile as any)?.schools_access_all ?? false;
  
  // Initialize selected school from localStorage or default_school_id
  const [selectedSchoolId, setSelectedSchoolIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_school_id');
      if (stored) return stored;
    }
    return profile?.default_school_id ?? null;
  });

  // Update selected school when profile changes (if user doesn't have schools_access_all, use default)
  useEffect(() => {
    if (!hasSchoolsAccessAll && profile?.default_school_id) {
      setSelectedSchoolIdState(profile.default_school_id);
    } else if (hasSchoolsAccessAll && profile?.default_school_id && !selectedSchoolId) {
      // If user has access all but no selected school, use default
      setSelectedSchoolIdState(profile.default_school_id);
    }
  }, [profile?.default_school_id, hasSchoolsAccessAll, selectedSchoolId]);

  const setSelectedSchoolId = (schoolId: string | null) => {
    setSelectedSchoolIdState(schoolId);
    if (typeof window !== 'undefined') {
      if (schoolId) {
        localStorage.setItem('selected_school_id', schoolId);
      } else {
        localStorage.removeItem('selected_school_id');
      }
    }
  };

  return (
    <SchoolContext.Provider
      value={{
        selectedSchoolId,
        setSelectedSchoolId,
        hasSchoolsAccessAll,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchoolContext = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchoolContext must be used within a SchoolProvider');
  }
  return context;
};

