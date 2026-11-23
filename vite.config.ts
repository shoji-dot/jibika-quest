/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 耳鼻科クエスト ビルド設定
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Phaser は大きいため警告閾値を上げる（分割は v0.2 以降で検討）
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: '耳鼻科クエスト',
        short_name: '耳鼻科Q',
        description: '耳の世界を冒険する2DアクションRPG（試遊版）',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1b1020',
        theme_color: '#1b1020',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
