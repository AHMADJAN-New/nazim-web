import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface ContactSectionProps {
  onContactClick: () => void;
}

export const ContactSection = memo(function ContactSection({
  onContactClick,
}: ContactSectionProps) {
  return (
    <section className="px-6 pb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] border-2 border-[#c9a44d]/20 rounded-3xl p-5 flex items-center justify-center">
        {/* Animated background gradient */}
        <div
          className="absolute inset-0 opacity-60 animate-slide"
          style={{
            background:
              'linear-gradient(45deg, transparent 30%, rgba(201, 164, 77, 0.06) 50%, transparent 70%)',
          }}
        />

        <Button
          onClick={onContactClick}
          className="relative z-10 px-6 py-3 bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2"
        >
          <MessageCircle className="w-6 h-6" />
          <span dir="rtl">د اړیکو معلومات</span>
        </Button>

      </div>

      <div className="text-center text-base text-slate-600 mt-4 font-medium" dir="rtl">
        "ناظم – د مدرسې بشپړ مدیریت په څو کلیکونو کې!"
      </div>
    </section>
  );
});
