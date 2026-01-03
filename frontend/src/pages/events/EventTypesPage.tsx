import { useState } from 'react';

import { EventTypesList, FormDesigner } from '@/components/events';
import { useAuth } from '@/hooks/useAuth';

export default function EventTypesPage() {
  const { profile } = useAuth();
  const [designingTypeId, setDesigningTypeId] = useState<string | null>(null);

  if (designingTypeId) {
    return (
      <div className="container mx-auto py-6 px-4">
        <FormDesigner
          eventTypeId={designingTypeId}
          onBack={() => setDesigningTypeId(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <EventTypesList
        schoolId={profile?.default_school_id || undefined}
        onDesignFields={(id) => setDesigningTypeId(id)}
      />
    </div>
  );
}
