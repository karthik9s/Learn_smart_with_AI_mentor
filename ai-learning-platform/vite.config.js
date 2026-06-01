import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800, // slightly higher to account for AI/Supabase libs
    rolldownOptions: {
      output: {
        // Split heavy third-party libs into a separate cached chunk.
        // Browsers cache vendor chunks independently, so students only
        // re-download your app code when you ship updates — not React/Supabase.
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui:     ['lucide-react', 'react-hot-toast'],
          http:   ['axios'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
