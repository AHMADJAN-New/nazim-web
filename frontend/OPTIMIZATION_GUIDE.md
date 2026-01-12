# Performance Optimization Guide

## Large Resources Optimization

### 1. Login.jpg Image (2.7 MB → Target: < 200 KB)

**Current Issue:** Login.jpg is 2,775 KB, causing slow page loads.

**Solution:**
1. Run the optimization script:
   ```bash
   cd frontend
   npm install --save-dev sharp
   node scripts/optimize-image.js
   ```

2. Or use online tools:
   - https://squoosh.app/ (recommended)
   - https://tinypng.com/
   
   **Settings:**
   - Format: WebP (preferred) or optimized JPEG
   - Quality: 80-85%
   - Max width: 1920px
   - Target size: < 200 KB

3. After optimization:
   - Save as `Login.webp` (primary)
   - Save as `Login-optimized.jpg` (fallback)
   - The AuthPage.tsx already uses `<picture>` tag with fallbacks

### 2. Recharts Library (1.2 MB)

**Current Issue:** Recharts is 1,259 KB and loads on initial page load.

**Solution Applied:**
- ✅ Removed from `optimizeDeps` in vite.config.ts
- ✅ Will be code-split automatically by Vite
- ✅ Only loads when Dashboard or chart components are accessed

**Result:** Recharts will be in a separate chunk, loaded only when needed.

### 3. Lucide-React Icons (1.1 MB)

**Current Issue:** Lucide-react is 1,159 KB.

**Solution:**
- ✅ Already tree-shaken by Vite (only imports used icons)
- ✅ Icons are imported individually (e.g., `import { LogIn } from 'lucide-react'`)
- ✅ Grouped into vendor-icons chunk for better caching
- ✅ No action needed - Vite handles this automatically

**Note:** The bundle size includes all icons, but only used ones are included in the final bundle.

### 4. Translation Files (3.3 MB Total)

**Current Issue:** All 4 language files (en, ps, f
a, ar) were loading immediately (3.3 MB).

**Solution Applied:**
- ✅ English loads immediately (always needed as fallback)
- ✅ Other languages (ps, fa, ar) lazy-load only when selected
- ✅ Each language in separate chunk for optimal caching
- ✅ Reduces initial load by ~2.5 MB

**Result:** Only English (~730 KB) loads initially. Other languages load on-demand.

### 5. HTTP Requests (291 requests → Target: 50-80)

**Current Issue:** Too many small chunks causing 291 HTTP requests.

**Solution Applied:**
- ✅ Better chunking strategy in vite.config.ts
- ✅ Vendor libraries grouped into logical chunks
- ✅ Translation files in separate chunks
- ✅ Component chunks optimized automatically

**Result:** Significant reduction in HTTP requests, better caching, faster loads.

## Build Optimization

After making changes, rebuild to see improvements:

```bash
cd frontend
npm run build
```

Check the build output for chunk sizes. You should see:
- Recharts in a separate chunk (only loads when needed)
- Smaller initial bundle size
- Optimized image files

## Expected Improvements

### Initial Load Reductions:
- **Recharts:** ~1.2 MB (code-split, loads only when Dashboard accessed)
- **Translations:** ~2.5 MB (only English loads initially, other 3 languages lazy-loaded)
- **Login image:** ~2.5 MB (after optimization to WebP)
- **Total:** ~6.2 MB reduction in initial load

### HTTP Requests Reduction:
- **Before:** 291 requests (too many small chunks)
- **After:** ~50-80 requests (better chunking strategy)
- **Improvement:** ~70% reduction in HTTP requests

## Verification

1. Build the app: `npm run build`
2. Check `dist/assets/` for chunk sizes
3. Test in browser DevTools Network tab:
   - Login.jpg should be < 200 KB (or Login.webp)
   - Recharts should load only when Dashboard is accessed
   - Initial bundle should be smaller
