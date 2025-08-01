import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: ['src/**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/main.ts',
        '**/polyfills.ts'
      ]
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  esbuild: {
    target: 'es2022'
  },
  optimizeDeps: {
    include: ['@angular/core', '@angular/common', '@angular/platform-browser']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'src/app'),
      '@home': resolve(__dirname, 'src/app/home'),
      '@shared': resolve(__dirname, 'src/app/shared'),
      '@auth': resolve(__dirname, 'src/app/auth'),
      '@pubs': resolve(__dirname, 'src/app/pubs'),
      '@points': resolve(__dirname, 'src/app/points'),
      '@missions': resolve(__dirname, 'src/app/missions'),
      '@check-in': resolve(__dirname, 'src/app/check-in'),
      '@carpets': resolve(__dirname, 'src/app/carpets'),
      '@badges': resolve(__dirname, 'src/app/badges'),
      '@users': resolve(__dirname, 'src/app/users'),
      '@landlord': resolve(__dirname, 'src/app/landlord'),
      '@feedback': resolve(__dirname, 'src/app/feedback'),
      '@widgets': resolve(__dirname, 'src/app/widgets'),
      '@leaderboard': resolve(__dirname, 'src/app/leaderboard')
    }
  }
});