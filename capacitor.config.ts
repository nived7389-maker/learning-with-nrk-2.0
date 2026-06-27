import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.learningwithnrk.app',
  appName: 'Learning With NRK',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
