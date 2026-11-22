import fs from 'node:fs';
import path from 'node:path';

// Keep this patch reproducible after npm install and fail closed on upstream changes.
// Google recommends background SDK initialization; all banner/view work stays on main.
const target = path.resolve('node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/AdMob.java');
const marker = 'modareb-admob-background-init';
const original = fs.readFileSync(target, 'utf8');
if (original.includes(marker)) {
  console.log('AdMob background initialization patch already applied');
} else {
  const start = original.indexOf('public void initialize(');
  const end = original.indexOf('private void runOnMainThread(', start);
  if (start < 0 || end < start) throw new Error('AdMob initialize structure changed; review background-init patch');
  const block = original.slice(start, end);
  const wrapper = block.indexOf('runOnMainThread(() -> {');
  const close = block.lastIndexOf('});');
  if (wrapper < 0 || close < wrapper || !block.includes('MobileAds.initialize(') || !block.includes('bannerExecutor.awaitViewGroup')) {
    throw new Error('AdMob initialization implementation changed; manual review required');
  }
  let updated = block.slice(0, wrapper) + '// ' + marker + '\n        new Thread(() -> {' + block.slice(wrapper + 'runOnMainThread(() -> {'.length, close) + '}, "modareb-admob-init").start();' + block.slice(close + 3);
  // View setup in the SDK completion callback must still dispatch to the UI thread.
  if (!updated.includes('runOnMainThread(() -> {')) throw new Error('Missing main-thread view setup');
  updated = updated.replace(/^.*\/\/ Same as banner\/interstitial:.*$/m, '        // SDK initialization runs off main; banner/view completion remains on main.');
  fs.writeFileSync(target, original.slice(0, start) + updated + original.slice(end));
  console.log('Patched AdMob: SDK initialization on named background thread; views remain on main');
}
