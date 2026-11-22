import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const wsUrl = (process.env.VITE_WS_URL || env.VITE_WS_URL || '').trim();

  const releaseProperties = readFileSync(path.resolve('android/version.properties'), 'utf8');
  const appVersion = releaseProperties.match(/^VERSION_NAME=(.+)$/m)?.[1]?.trim();
  if (!appVersion) throw new Error('Missing Android release version');

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    },
    plugins: [react(), tailwindcss()],
    // Compile JS for older Android WebViews too (e.g. Android 8 devices with a stale WebView)
    build: { target: 'es2019' },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
