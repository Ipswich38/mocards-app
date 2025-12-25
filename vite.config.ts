import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and related libraries
          vendor: ['react', 'react-dom'],
          // Chart and data visualization
          charts: ['recharts'],
          // UI icons
          icons: ['lucide-react'],
          // Supabase and cloud sync
          database: ['@supabase/supabase-js'],
          // Authentication and security - removed problematic node modules
          auth: ['bcryptjs'],
        },
      },
    },
    // Increase chunk size warning limit to 600kb
    chunkSizeWarningLimit: 600,
    // Use esbuild for faster builds instead of terser
    minify: 'esbuild',
    // Optimize dependencies
    target: 'esnext',
  },
  // Optimize dev server
  server: {
    host: true,
    port: 5173,
  },
})
