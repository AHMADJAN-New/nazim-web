import { cn } from '@/lib/utils';

const NAZIM_LOGO_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0b56"/>
      <stop offset="1" stop-color="#1a1a6a"/>
    </linearGradient>
    <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0e6b3"/>
      <stop offset="1" stop-color="#c9a44d"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="128" height="128" rx="22" fill="url(#bg)"/>
  <path d="M42 92V36h12l20 32V36h12v56H74L54 60v32H42z" fill="url(#fg)"/>
</svg>
`);

const NAZIM_LOGO_DATA_URL = `data:image/svg+xml,${NAZIM_LOGO_SVG}`;

type NazimLogoProps = {
  className?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
};

export function NazimLogo({ className, alt = 'Nazim', loading = 'lazy' }: NazimLogoProps) {
  return <img src={NAZIM_LOGO_DATA_URL} alt={alt} loading={loading} className={cn(className)} />;
}

