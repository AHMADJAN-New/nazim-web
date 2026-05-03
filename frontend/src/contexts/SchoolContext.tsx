import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';

interface SchoolContextType {
  selectedSchoolId: string | null;
  setSelectedSchoolId: (schoolId: string | null) => void;
  hasSchoolsAccessAll: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, loading, profileLoading } = useAuth();
  // schools_access_all comes from the profile API response
  const hasSchoolsAccessAll = (profile as any)?.schools_access_all ?? false;
  
  // Store has_schools_access_all in localStorage for API client to check
  useEffect(() => {
    if (loading || profileLoading || !profile) {
      return;
    }

    if (typeof window !== 'undefined') {
      if (hasSchoolsAccessAll) {
        localStorage.setItem('has_schools_access_all', 'true');
      } else {
        localStorage.removeItem('has_schools_access_all');
      }
    }
  }, [hasSchoolsAccessAll, loading, profile, profileLoading]);
  
  // Initialize selected school from localStorage or default_school_id
  const [selectedSchoolId, setSelectedSchoolIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_school_id');
      if (stored) return stored;
    }
    return profile?.default_school_id ?? null;
  });

  const persistSelectedSchoolId = useCallback((schoolId: string | null) => {
    setSelectedSchoolIdState(schoolId);
    if (typeof window !== 'undefined') {
      if (schoolId) {
        localStorage.setItem('selected_school_id', schoolId);
      } else {
        localStorage.removeItem('selected_school_id');
      }
    }
  }, []);

  // Update selected school when profile changes
  useEffect(() => {
    if (loading || profileLoading || !profile) {
      return;
    }

    if (profile?.default_school_id) {
      if (!hasSchoolsAccessAll) {
        // Users without schools_access_all must use their default school
        persistSelectedSchoolId(profile.default_school_id);
      } else if (!selectedSchoolId) {
        // Users with schools_access_all: if no school selected, use default
        persistSelectedSchoolId(profile.default_school_id);
      }
      // If user has schools_access_all and already has a selected school, keep it
    } else if (!hasSchoolsAccessAll) {
      persistSelectedSchoolId(null);
    }
  }, [loading, profileLoading, profile, profile?.default_school_id, hasSchoolsAccessAll, selectedSchoolId, persistSelectedSchoolId]);

  const value = useMemo(() => ({
    selectedSchoolId,
    setSelectedSchoolId: persistSelectedSchoolId,
    hasSchoolsAccessAll,
  }), [hasSchoolsAccessAll, selectedSchoolId, persistSelectedSchoolId]);

  return (
    <SchoolContext.Provider value={value}>
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

