import { build } from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const calls=[];
const api={
  async setCustomKey(v){calls.push(['key',v]);},
  async log(v){calls.push(['log',v]);},
};
const bundle=await build({
  define:{'import.meta.env.VITE_APP_VERSION':'"test"'},
  entryPoints:['src/services/crashReporting.ts'],bundle:true,write:false,platform:'node',format:'cjs',
  plugins:[{name:'native-test-double',setup(b){
    b.onResolve({filter:/^@capacitor/},args=>({path:args.path,namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='@capacitor/core'
      ? 'export const Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>true};'
      : 'export const FirebaseCrashlytics=globalThis.testCrashPlugin;',loader:'js'}));
  }}],
});
const context={module:{exports:{}},window:{},console,testCrashPlugin:api};
context.globalThis=context;
vm.runInNewContext(bundle.outputFiles[0].text,context);
const {crashStage}=context.module.exports;
const settle=()=>new Promise(r=>setImmediate(r));
crashStage('screen','dashboard');
crashStage('screen','dashboard');
await settle();
assert.equal(calls.filter(c=>c[0]==='key').length,1,'duplicate state must not cross bridge');
assert.equal(calls.filter(c=>c[0]==='log').length,1);
crashStage('season_stage','world_evolution');
crashStage('screen','live_match');
await settle();
assert.equal(calls.filter(c=>c[0]==='key').length,3);
assert.ok(calls.some(c=>c[0]==='key'&&c[1].key==='season_stage'&&c[1].value==='world_evolution'));
crashStage('ad_stage','x'.repeat(200));
await settle();
assert.equal(calls.find(c=>c[0]==='key'&&c[1].key==='ad_stage')[1].value.length,120);
api.setCustomKey=async()=>{throw new Error('Native bridge unavailable');};
crashStage('screen','league');
await settle();
const count=calls.length;
crashStage('screen','squad');
await settle();
assert.equal(calls.length,count,'disabled bridge must stop reporting');
console.log('PASS: state keys/logs, duplicate suppression, size bound, failure isolation');
