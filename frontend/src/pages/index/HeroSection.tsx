import { Badge } from '@/components/ui/badge';
import { heroBadges } from './data';

export function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#0b0b56] via-[#1a1a6a] to-[#0b0b56] text-white px-6 py-6">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gold gradient overlay */}
      <div
        className="absolute top-0 right-0 w-[1200px] h-[400px] opacity-25"
        style={{
          background: 'radial-gradient(1200px 400px at 85% -20%, rgba(201, 164, 77, 0.25) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/nazim_logo.webp"
              alt="Nazim Logo"
              className="w-12 h-12 rounded-lg ring-2 ring-white/20 bg-white/20 object-contain p-1"
              loading="eager"
            />
            <div className="text-center">
              <h1
                className="text-2xl font-bold leading-tight text-center"
                style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', 'Amiri', serif" }}
                dir="rtl"
              >
                ناظم – د دیني مدارسو د اداري چارو د مدیریت سیستم
              </h1>
              <p className="text-white/90 text-lg mt-1 leading-relaxed text-center" dir="rtl">
                ناظم، د دیني مدارسو لپاره ځانګړی جوړ شوی سافټویر دی چې له ثبت نامه تر نتایجو او اسنادو پورې
                ټول کارونه په څو دقیقو کې په خپلکار ډول ترسره کوي.
              </p>
              <p className="text-white/80 text-base mt-3 leading-relaxed text-center font-medium" dir="rtl">
                د مدرسې مهتمم، ناظم، او استاد ته: ثبت نام، حاضري، امتحانات، او راپورونه په یو سیستم کې —
                پرته له ګډوډۍ.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {heroBadges.map((badge, index) => (
            <Badge
              key={index}
              className="bg-gradient-to-r from-[#f0e6b3] to-[#f0e6b3] text-[#0b0b56] border border-[#c9a44d]/30 font-semibold px-3 py-1 text-sm"
            >
              {badge}
            </Badge>
          ))}
        </div>
      </div>
    </header>
  );
}
