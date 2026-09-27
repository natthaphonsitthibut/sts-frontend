import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    // jsdom page tests take ~0.2s alone but can pass 5s (vitest's default) on
    // a loaded or cold CI machine; the headroom stops those runs from flaking.
    testTimeout: 15_000,
  },
})
