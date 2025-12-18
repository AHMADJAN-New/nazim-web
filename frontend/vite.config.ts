import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

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
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

