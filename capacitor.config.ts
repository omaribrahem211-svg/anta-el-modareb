import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.modareb.game',
  appName: 'أنت المدرب',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~3347511713', // Google AdMob Test App ID (Android)
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#020617', // Slate-950 background
  },
};

export default config;
