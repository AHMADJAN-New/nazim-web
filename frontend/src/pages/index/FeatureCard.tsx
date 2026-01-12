import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Feature } from './data';

interface FeatureCardProps {
  feature: Feature;
}

export const FeatureCard = memo(function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <Card className="group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-[#0b0b56]/8 bg-gradient-to-b from-white to-[#fafbfc] relative overflow-hidden">
      {/* Gold top border on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c9a44d] to-[#f0e6b3] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-gradient-to-br from-white to-[#f8fafc] border-2 border-[#c9a44d]/20 text-[#0b0b56] transition-transform duration-300 group-hover:-translate-y-0.5">
            <Icon className="w-5 h-5" />
          </span>
          <h3 className="font-bold text-[#0b0b56] text-lg" dir="rtl">
            {feature.title}
          </h3>
        </div>

        <ul className="space-y-1 text-slate-700 text-base" dir="rtl">
          {feature.items.map((item, index) => (
            <li key={index} className="relative pr-6">
              <span className="absolute right-0 top-0 text-[#c9a44d] font-bold">•</span>
              <span className="pr-2">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
});
