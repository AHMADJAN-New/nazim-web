import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'
import { defineConfig, type PluginOption } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// Plugin to suppress CSS syntax warnings from Tailwind's arbitrary variants
// These warnings are false positives - Tailwind generates valid CSS with advanced selectors
// The warnings come from esbuild's CSS minifier not recognizing Tailwind's arbitrary variant syntax
const suppressCssWarnings = (): PluginOption => {
  return {
    name: 'suppress-css-warnings',
    enforce: 'pre',
    buildStart() {
      // Store original methods
      const originalWarn = console.warn;
      const originalError = console.error;
      
      // Intercept console methods to filter CSS warnings
      const filterMessage = (message: string) => {
        return message.includes('css-syntax-error') && 
               (message.includes('data-rtl') || 
                message.includes('Unexpected "="') || 
                message.includes('groupdata-rtl') ||
                message.includes('[WARNING]'));
      };
      
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (filterMessage(message)) {
          return; // Suppress
        }
        originalWarn.apply(console, args);
      };
      
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (filterMessage(message)) {
          return; // Suppress
        }
        originalError.apply(console, args);
      };
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    suppressCssWarnings(),
    // Bundle analyzer - generates dist/stats.html after build
    // Run: npm run build, then open dist/stats.html in browser
    visualizer({
      open: false, // Don't auto-open (set to true to auto-open after build)
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'treemap', 'sunburst', or 'network'
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Use emptyOutDir: false to avoid permission issues with existing files
    // The build will overwrite files it can, and skip files it can't
    emptyOutDir: false,
    commonjsOptions: {
      include: [/pdfmake-arabic/, /pdfmake/, /node_modules/],
      transformMixedEsModules: true,
    },
    // Suppress CSS minification warnings from Tailwind's arbitrary variants
    // These warnings are false positives - the CSS is valid
    minify: 'esbuild',
    rollupOptions: {
      /**
       * Chunking strategy (SAFE)
       *
       * We only force i18n language chunks.
       * Previous aggressive vendor chunking caused circular chunk dependencies like:
       *   vendor-dates -> vendor-react -> vendor-dates
       * which breaks React imports at runtime (e.g. createContext undefined).
       *
       * Let Vite/Rollup decide vendor/app chunking automatically for stability.
       */
      output: {
        manualChunks: (id) => {
          // Translation files - each in separate chunk for lazy loading
          if (id.includes('/translations/')) {
            if (id.includes('/translations/en')) return 'i18n-en';
            if (id.includes('/translations/ps')) return 'i18n-ps';
            if (id.includes('/translations/fa')) return 'i18n-fa';
            if (id.includes('/translations/ar')) return 'i18n-ar';
          }

          // Vendor chunking - split large vendors for better caching and parallel loading
          
          // React core - keeping them together avoids some circular dependency issues
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }

          // PDFMake - large library, separate chunk
          if (id.includes('pdfmake')) {
            return 'vendor-pdfmake';
          }

          // Recharts - DO NOT code-split separately (causes initialization errors)
          // Keep it with other vendors or let Vite handle it automatically
          // Recharts has internal circular dependencies that break when split
          // It's still lazy-loaded via LazyChart.tsx re-exports

          // Default: let Vite handle other chunks automatically
          // This prevents circular dependencies in common libraries like Radix/TanStack
          return undefined;
        },
      },
      onwarn(warning, warn) {
        // Keep logs clean for node_modules circular deps (usually harmless)
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.ids?.some(id => id.includes('node_modules'))) {
          return;
        }
        warn(warning);
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-table',
      // Include recharts in optimizeDeps to ensure proper initialization
      // It will still be code-split via manualChunks
      'recharts',
      // Removed 'jszip' - will be lazy loaded to reduce initial bundle size
      // Removed 'xlsx' - will be lazy loaded to reduce initial bundle size
      'shepherd.js',
      'date-fns', // Pre-bundle date-fns to avoid circular dependency issues
    ],
    exclude: [
      'pdfmake-arabic',
      'pdfmake',
      'jszip', // Exclude jszip to allow for lazy loading
      'xlsx', // Exclude xlsx to allow for lazy loading
    ],
    esbuildOptions: {
      // Handle CommonJS modules
      target: 'es2020',
    },
    // Don't force re-optimization by default
    force: false,
  },
  server: {
    port: 5173,
    host: true, // Allow access from network (0.0.0.0)
    strictPort: false, // Allow port fallback if 5173 is taken
    watch: {
      ignored: ['**/src/lib/translations/**'],
    },
    // Only use HTTPS if certificate files exist (for dev server with camera API on mobile)
    ...(function() {
      const keyPath = path.resolve(__dirname, 'certs/key.pem');
      const certPath = path.resolve(__dirname, 'certs/cert.pem');
      
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
        };
      }
      return {};
    })(),
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        timeout: 30000, // 30 second timeout for mobile connections
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('proxy error', err);
          });
        },
      },
      // Proxy storage so relative URLs /storage/... work in dev (avoids mixed content when app is HTTPS)
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    // Increase HMR timeout for mobile connections
    hmr: {
      clientPort: 5173,
      timeout: 20000, // 20 seconds for mobile
    },
  },
  // Test configuration moved to vitest.config.ts
  // test: {
  //   globals: true,
  //   environment: 'jsdom',
  //   setupFiles: ['./src/test/setup.ts'],
  //   css: true,
  // },
})

