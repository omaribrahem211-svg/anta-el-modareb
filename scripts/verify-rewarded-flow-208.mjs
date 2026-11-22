import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const mocks={
  '@capacitor/core':'export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>"android"};',
  '@capacitor/app':'export const App={addListener:async()=>({remove:async()=>{}})};',
  '@capacitor-community/admob':`export const AdMob=globalThis.testAdMob;
    export const RewardAdPluginEvents={Loaded:'Loaded',FailedToLoad:'FailedToLoad',Showed:'Showed',Rewarded:'Rewarded',Dismissed:'Dismissed',FailedToShow:'FailedToShow'};
    export const BannerAdPluginEvents={Loaded:'BannerLoaded',FailedToLoad:'BannerFailed'};
    export const BannerAdSize={};export const BannerAdPosition={};`,
  './consentService':'export const gatherConsent=()=>globalThis.testConsent();',
  '../config/admobConfig':'export const ADMOB_CONFIG={IS_TEST_MODE:false,ENABLE_LOGS:false,ENABLE_BANNER:false,ENABLE_REWARDS:true,REWARDED_ID:"production-rewarded"};export const TEST_AD_IDS={};',
  './adRewardService':'export const AdRewardManager={createAdSession:()=>"session",verifyAndConsumeReward:()=>({success:true})};',
  './billingService':'export const billingService={isPremium:()=>globalThis.testPremium};',
  './crashReporting':'export const crashStage=()=>{};',
};
const bundle=await build({entryPoints:['src/services/adManager.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'test-dependencies',setup(b){
  b.onResolve({filter:/.*/},args=>args.path in mocks?{path:args.path,namespace:'mock'}:undefined);
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
}}]});
const drain=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function setup({consent=true,premium=false,initPending=false,initError=false}={}){
  let now=100000,nextId=1;const timers=new Map(),listeners=new Map();
  const calls={init:0,prepare:0,show:0},initialization=deferred(),presentation=deferred();
  const addListener=async(event,cb)=>{const entry={cb,removed:false};if(!listeners.has(event))listeners.set(event,[]);listeners.get(event).push(entry);return {remove:async()=>{entry.removed=true;}};};
  const api={addListener,initialize:async()=>{calls.init++;if(initError)throw new Error('SDK init failed');if(initPending)await initialization.promise;},
    prepareRewardVideoAd:async()=>{calls.prepare++;},showRewardVideoAd:()=>{calls.show++;return presentation.promise;}};
  const sandbox={module:{exports:{}},testAdMob:api,testPremium:premium,testConsent:async()=>({canRequestAds:consent}),
    console:{log(){},warn(){},error(){}},performance:{now:()=>now},Date:class extends Date{static now(){return now;}},
    setTimeout:(fn,delay=0)=>{const id=nextId++;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),
    window:{localStorage:{},dispatchEvent(){}},localStorage:{getItem:()=>null,setItem(){}},CustomEvent:class{constructor(type){this.type=type;}}};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
  const manager=sandbox.module.exports.AdManager;
  const emit=async(event,payload={})=>{for(const e of [...(listeners.get(event)||[])])if(!e.removed)e.cb(payload);await drain();};
  const advance=async(ms)=>{const end=now+ms;while(true){let chosen;for(const [id,t] of timers)if(t.at<=end&&(!chosen||t.at<chosen[1].at))chosen=[id,t];if(!chosen)break;now=chosen[1].at;timers.delete(chosen[0]);chosen[1].fn();await drain();}now=end;await drain();};
  const counts={reward:0,dismiss:[],failure:0};
  const show=()=>manager.showRewardedForAction({actionType:'heal_player',onUserEarnedReward:()=>counts.reward++,onDismiss:v=>counts.dismiss.push(v),onFailure:()=>counts.failure++});
  return {manager,emit,advance,show,counts,calls,initialization,presentation,sandbox};
}
{
 const t=setup({consent:false});assert.equal(await t.manager.loadRewarded(),false);assert.equal(await t.show(),false);
 assert.equal(t.calls.init,0);assert.equal(t.calls.prepare,0);assert.equal(t.calls.show,0);assert.equal(t.counts.reward,0);
 console.log('PASS consent denied: no initialize, prepare, show or reward');
}
{
 const t=setup({initError:true});assert.equal(await t.manager.loadRewarded(),false);assert.equal(t.calls.prepare,0);
 console.log('PASS initialization failure: no ad request');
}
{
 const t=setup({initPending:true});const loading=t.manager.loadRewarded(100);await drain();await t.advance(101);assert.equal(await loading,false);
 t.initialization.resolve();await drain();assert.equal(t.calls.prepare,0);
 console.log('PASS timed-out initialization cannot start a late ad request');
}
{
 const t=setup();const loading=t.manager.loadRewarded(6000);await drain();assert.equal(t.calls.prepare,1);await t.emit('Loaded');assert.equal(await loading,true);
 assert.equal(await t.show(),true);await t.emit('Showed');await t.advance(36000);assert.equal(t.counts.reward,0);assert.equal(t.counts.dismiss.length,0);assert.equal(t.manager.isRewardedShowing,true);
 assert.equal(await t.show(),false);assert.equal(t.calls.show,1,'no second ad may replace a long-running session');
 await t.emit('Rewarded',{type:'reward',amount:1});await t.emit('Rewarded',{type:'reward',amount:1});t.presentation.resolve({type:'reward',amount:1});await drain();
 assert.equal(t.counts.reward,1);await t.emit('Dismissed');await t.emit('Dismissed');assert.deepEqual(t.counts.dismiss,[true]);
 console.log('PASS long ad: no 35-second reward, no 12-second reset, real completion grants exactly once');
}
{
 const t=setup();t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;
 assert.equal(await t.show(),true);await t.emit('Showed');await t.emit('Dismissed');await t.advance(1000);
 assert.equal(t.counts.reward,0);assert.equal(t.counts.dismiss.length,0);
 await t.emit('Rewarded',{type:'reward',amount:1});await t.advance(4001);
 assert.equal(t.counts.reward,1);assert.deepEqual(t.counts.dismiss,[true]);
 console.log('PASS delayed reward after dismissal: five-second bridge grace preserves confirmed reward');
}
{
 const t=setup();t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;
 await t.show();await t.emit('Showed');await t.emit('Dismissed');await t.advance(5001);
 assert.equal(t.counts.reward,0);assert.deepEqual(t.counts.dismiss,[false]);assert.equal(t.manager.isRewardedShowing,false);
 await t.emit('Rewarded',{type:'reward',amount:1});assert.equal(t.counts.reward,0,'closed sessions ignore late duplicate callbacks');
 console.log('PASS early close: no reward, safe cleanup, no late-session reward');
}
{
 const t=setup();t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;await t.show();await t.emit('Showed');
 t.presentation.resolve({type:'reward',amount:1});await drain();assert.equal(t.counts.reward,1);
 await t.emit('Rewarded',{type:'reward',amount:1});assert.equal(t.counts.reward,1);
 console.log('PASS confirmed native show-result fallback and duplicate event grant only once');
}
{
 const t=setup();t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;await t.show();
 await t.emit('FailedToShow',{code:1});t.presentation.reject(new Error('failed'));await drain();
 assert.equal(t.counts.failure,1);assert.equal(t.counts.reward,0);assert.equal(t.manager.isRewardedShowing,false);
 console.log('PASS show failure/rejection race reports once without reward');
}
{
 const t=setup({consent:false,premium:true});assert.equal(await t.show(),true);assert.equal(t.counts.reward,1);assert.deepEqual(t.counts.dismiss,[true]);assert.equal(t.calls.show,0);
 console.log('PASS paid premium ad-free entitlement unchanged');
}
{
 const t=setup({consent:false});t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;
 assert.equal(await t.show(),false);assert.equal(t.calls.show,0);
 console.log('PASS consent gate also blocks an already-preloaded ad');
}
{
 const t=setup();let n=0;t.sandbox.testConsent=async()=>({canRequestAds:++n===1});
 assert.equal(await t.manager.loadRewarded(),false);assert.equal(t.calls.init,0);assert.equal(t.calls.prepare,0);
 console.log('PASS initialize() consent refusal is respected after initial consent check');
}
{
 const t=setup();t.manager.isInitialized=true;t.manager.isRewardedLoaded=true;await t.show();await t.emit('Showed');
 for(const data of [undefined,{}, {type:'reward',amount:NaN},{type:'reward',amount:-1}])await t.emit('Rewarded',data);
 assert.equal(t.counts.reward,0);await t.emit('Rewarded',{type:'reward',amount:0});assert.equal(t.counts.reward,1);
 console.log('PASS malformed confirmations ignored; SDK-confirmed zero-valued custom reward preserved');
}
{
 let allowed=true,requests=0;
 const realConsent=await build({entryPoints:['src/services/consentService.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'consent-sdk',setup(b){
  b.onResolve({filter:/^@capacitor-community\/admob$/},args=>({path:args.path,namespace:'consent-mock'}));
  b.onLoad({filter:/.*/,namespace:'consent-mock'},()=>({contents:'export const AdMob=globalThis.sdk;export const AdmobConsentStatus={REQUIRED:"REQUIRED",OBTAINED:"OBTAINED",NOT_REQUIRED:"NOT_REQUIRED"};'}));
 }}]});
 const ctx={module:{exports:{}},console,sdk:{requestConsentInfo:async()=>{requests++;return {status:allowed?'OBTAINED':'REQUIRED',canRequestAds:allowed};},showPrivacyOptionsForm:async()=>{allowed=false;}}};ctx.globalThis=ctx;
 vm.runInNewContext(realConsent.outputFiles[0].text,ctx);const c=ctx.module.exports;
 assert.equal((await c.gatherConsent()).canRequestAds,true);assert.equal((await c.gatherConsent()).canRequestAds,true);assert.equal(requests,1);
 await c.showPrivacyOptions();assert.equal((await c.gatherConsent()).canRequestAds,false);assert.equal(requests,2);
 assert.equal((await c.gatherConsent()).canRequestAds,false);assert.equal(requests,3);
 console.log('PASS real consent module: privacy changes invalidate cache; refusal can be retried');
}
