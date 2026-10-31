/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // relative paths so the build works on any host or sub-folder
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
})
