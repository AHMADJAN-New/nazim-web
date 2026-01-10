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
    commonjsOptions: {
      include: [/pdfmake-arabic/, /pdfmake/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfmake': ['pdfmake-arabic/build/pdfmake', 'pdfmake/build/vfs_fonts'],
        },
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
    ],
    exclude: [
      'pdfmake-arabic',
      'pdfmake',
    ],
    esbuildOptions: {
      // Handle CommonJS modules
      target: 'es2020',
    },
    // Force re-optimization when dependencies change
    // Set to true to force re-optimization (useful when cache issues occur)
    // After restarting dev server, set back to false for better performance
    force: true, // Temporarily set to true to fix cache issues
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

