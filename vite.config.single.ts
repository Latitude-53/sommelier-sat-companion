/**
 * Конфигурация single-file сборки: весь бандл (JS + CSS + шрифты) инлайнится
 * в один самодостаточный HTML — аналог прежнего монолита index.html.
 *
 * Отличия от продовой PWA-сборки (vite.config.ts):
 *  - без vite-plugin-pwa: service worker рядом с одиночным файлом невозможен;
 *    virtual:pwa-register алиасится на no-op заглушку src/pwa-register-stub.ts;
 *  - viteSingleFile инлайнит ассеты (assetsInlineLimit → ~100 МБ), шрифты
 *    превращаются в base64 data-URL прямо в CSS;
 *  - favicon инлайнится в data-URL, apple-touch-icon срезается.
 * Открытие с диска (file://) работает: IndexedDB подменяется localStorage-фолбэком
 * (см. src/db/index.ts).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Инлайн-favicon + срез ссылок, которым нечего открывать рядом с одиночным файлом. */
function singleFileHead(): Plugin {
  return {
    name: 'single-file-head',
    transformIndexHtml(html) {
      const svg = readFileSync(
        fileURLToPath(new URL('./public/favicon.svg', import.meta.url)),
        'utf8',
      );
      const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      return html
        .replace(
          /<link rel="icon"[^>]*>/i,
          `<link rel="icon" type="image/svg+xml" href="${dataUrl}" />`,
        )
        .replace(/<link rel="apple-touch-icon"[^>]*>\s*/i, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true }), singleFileHead()],
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-register-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-single',
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 10_000,
  },
});
