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
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
