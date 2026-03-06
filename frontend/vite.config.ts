/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load all env vars from project root (../) — no prefix filter
  const rootEnv = loadEnv(mode, '..', '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Expose only safe, public env vars to the browser.
      // Server-only secrets (SUPABASE_JWT_SECRET, KAKAO_REST_KEY) are NOT exposed.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(rootEnv.SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(rootEnv.SUPABASE_ANON_KEY),
      'import.meta.env.VITE_KAKAO_JS_KEY': JSON.stringify(rootEnv.KAKAO_JS_KEY),
      'import.meta.env.VITE_KAKAO_SDK_URL': JSON.stringify(
        rootEnv.KAKAO_SDK_URL || 'https://dapi.kakao.com/v2/maps/sdk.js',
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
