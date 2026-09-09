import fs from 'fs';
import path from 'path';

const targetPath = path.resolve(
  'node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/banner/BannerExecutor.java'
);
const patchPath = path.resolve('patches/BannerExecutor.java');

try {
  if (fs.existsSync(patchPath) && fs.existsSync(path.dirname(targetPath))) {
    fs.copyFileSync(patchPath, targetPath);
    console.log('✓ Successfully applied AdMob multi-banner patch to BannerExecutor.java');
  }
} catch (err) {
  console.warn('Notice: Could not apply AdMob patch:', err.message);
}
