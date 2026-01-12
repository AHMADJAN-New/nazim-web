import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
    rollupOptions: {
      /**
       * CRITICAL: Avoid aggressive manual chunking.
       * This project previously hit runtime init errors like:
       * - "Cannot access '<var>' before initialization"
       *
       * Those are often caused by circular chunk dependencies created by manualChunks.
       * Let Rollup/Vite decide chunk boundaries automatically for stable runtime ordering.
       */
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
      'recharts',
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})

