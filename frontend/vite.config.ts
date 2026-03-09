/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load env vars: .env file first, then fallback to process.env (Render, etc.)
  const rootEnv = loadEnv(mode, '..', '')
  const get = (key: string) => rootEnv[key] || process.env[key] || ''

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Expose only safe, public env vars to the browser.
      // Server-only secrets (SUPABASE_JWT_SECRET, KAKAO_REST_KEY) are NOT exposed.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(get('SUPABASE_URL')),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(get('SUPABASE_ANON_KEY')),
      'import.meta.env.VITE_KAKAO_JS_KEY': JSON.stringify(get('KAKAO_JS_KEY')),
      'import.meta.env.VITE_KAKAO_SDK_URL': JSON.stringify(
        get('KAKAO_SDK_URL') || 'https://dapi.kakao.com/v2/maps/sdk.js',
      ),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      css: false,
    },
    server: {
      port: 3000,
      allowedHosts: true,
      proxy: {
        '/api': 'http://localhost:5173',
      },
    },
    build: {
      outDir: '../app/static/dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            i18n: ['i18next', 'react-i18next'],
          },
        },
      },
    },
  }
})
