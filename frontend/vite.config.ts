import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

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
    ],
    exclude: [
      'pdfmake-arabic',
      'pdfmake',
    ],
    esbuildOptions: {
      // Handle CommonJS modules
      target: 'es2020',
    },
  },
  server: {
    port: 5173,
    host: true, // Allow access from network
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
      },
    },
  },
})

