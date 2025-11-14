import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Optimize dev server performance
    hmr: {
      overlay: true,
    },
    // Disable pre-bundling for faster startup
    warmup: {
      clientFiles: [],
    },
  },
  // Disable source maps in dev for faster builds
  build: {
    sourcemap: false,
  },
  // Optimize build performance
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
    exclude: ['lovable-tagger'],
  },
  plugins: [
    react(),
    // Only enable component tagger in development if explicitly needed
    mode === 'development' && process.env.ENABLE_TAGGER === 'true' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
}));
