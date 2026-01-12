import { memo } from 'react';
import { stats, valueBadges } from './data';
import { Badge } from '@/components/ui/badge';

export const StatsSection = memo(function StatsSection() {
  return (
    <section className="px-6 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden bg-gradient-to-br from-[#0b0b56] to-[#1a1a6a] text-white rounded-2xl p-6 text-center"
          >
            {/* Shimmer effect background */}
            <div
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-10 animate-shimmer"
              style={{
                background: 'radial-gradient(circle, rgba(201, 164, 77, 0.1) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-base text-white/90">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {valueBadges.map((badge, index) => (
          <Badge
            key={index}
            className="bg-gradient-to-r from-[#f0e6b3] to-[#f0e6b3] text-[#0b0b56] border border-[#c9a44d]/30 font-semibold px-3 py-1 text-sm"
          >
            {badge}
          </Badge>
        ))}
      </div>

    </section>
  );
});
