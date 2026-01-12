import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'

// Plugin to suppress CSS syntax warnings from Tailwind's arbitrary variants
// These warnings are false positives - Tailwind generates valid CSS with advanced selectors
// The warnings come from esbuild's CSS minifier not recognizing Tailwind's arbitrary variant syntax
const suppressCssWarnings = () => {
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

          // Default: let Vite handle it (prevents circular chunk deps)
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
      // Removed 'recharts' - will be lazy loaded to reduce initial bundle size
      'jszip',
      'shepherd.js',
      'date-fns', // Pre-bundle date-fns to avoid circular dependency issues
    ],
    exclude: [
      'pdfmake-arabic',
      'pdfmake',
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

