import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = path.resolve('scripts/patch-admob-init.mjs');
const relative = 'node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/AdMob.java';
let source = fs.readFileSync(relative, 'utf8');
// Reconstruct the original wrapper from the installed patched copy for a clean-install simulation.
source = source.replace('// modareb-admob-background-init\n        new Thread(() -> {', 'runOnMainThread(() -> {')
  .replace('}, "modareb-admob-init").start();', '});');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'admob-init-test-'));
try {
  const target = path.join(temp, relative);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, source);
  const run = () => spawnSync(process.execPath, [script], {cwd:temp,encoding:'utf8'});
  assert.equal(run().status,0);
  const patched = fs.readFileSync(target,'utf8');
  assert.ok(patched.includes('new Thread(() -> {'));
  assert.ok(patched.includes('"modareb-admob-init").start();'));
  const init = patched.slice(patched.indexOf('public void initialize('),patched.indexOf('private void runOnMainThread('));
  assert.equal((init.match(/runOnMainThread\(\(\) ->/g)||[]).length,1, 'view completion must still run on main');
  assert.ok(init.indexOf('runOnMainThread(') > init.indexOf('onInitializationComplete('));
  assert.equal(run().status,0);
  assert.equal(fs.readFileSync(target,'utf8'),patched,'patch must be idempotent');
  fs.writeFileSync(target, 'public class ChangedUpstream {}');
  assert.notEqual(run().status,0,'unknown upstream structure must fail the install');
  console.log('PASS: clean-install patch, background init, main-thread view completion, idempotence, upstream-change failure');
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}
