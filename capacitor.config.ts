import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.modareb.game',
  appName: 'أنت المدرب',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-5272866425919152~1232269694', // Official AdMob Android App ID
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#059669",
      sound: "beep.wav",
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#020617', // Slate-950 background
  },
};

export default config;
