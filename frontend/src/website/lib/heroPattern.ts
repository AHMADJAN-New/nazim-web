/**
 * Hero background: gradient + Islamic geometry overlay.
 * Overlapping circles (classic Islamic motif) – soft, no star shapes.
 */
const islamicPatternSvg =
  "<svg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'>" +
  "<g stroke='#ffffff' stroke-width='0.5' fill='none' opacity='0.18'>" +
  "<circle cx='20' cy='20' r='18'/>" +
  "<circle cx='60' cy='20' r='18'/>" +
  "<circle cx='20' cy='60' r='18'/>" +
  "<circle cx='60' cy='60' r='18'/>" +
  "</g></svg>";
export const HERO_ISLAMIC_GEOMETRY_DATA_URL =
  `url("data:image/svg+xml,${encodeURIComponent(islamicPatternSvg)}")`;

/** Default hero image when school has no header image (education / school themed, royalty-free). */
export const DEFAULT_HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80";
