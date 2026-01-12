import { memo } from 'react';
import { features } from './data';
import { FeatureCard } from './FeatureCard';

export const FeaturesGrid = memo(function FeaturesGrid() {
  return (
    <section className="px-6 py-6">
      <h2 className="text-2xl font-bold text-[#0b0b56] mb-4" dir="rtl">
        ځانګړتیاوې
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
});
