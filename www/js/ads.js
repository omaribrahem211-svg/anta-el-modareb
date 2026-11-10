// أنت المدرب — إعلانات AdMob (بنفس أكواد لعبة أنت المدرب القديمة: بانر + مكافأة) (@capacitor-community/admob)
// بيني: بعد كل 3 ماتشات وإنت خارج من شاشة نهاية الماتش. بمكافأة: رجّع طاقتك بعد الماتش، أو تخطّى ماتش.
// لحد ما الأكواد الحقيقية تتحط هنا، بيشتغل بإعلانات جوجل التجريبية.
'use strict';
const ADS={
 testing:true, // بيتحدد لوحده: نسخة التجربة (APK debug) = إعلانات تجريبية، نسخة جوجل بلاي (AAB release) = إعلانات حقيقية
 interId:'ca-app-pub-5272866425919152/9607323788', // الإعلان البيني (Interstitial)
 rewardId:'ca-app-pub-5272866425919152/2559138701', // الإعلان بمكافأة (نفس كود لعبة أنت المدرب)
 bannerId:'ca-app-pub-5272866425919152/4077924883', // البانر السفلي (نفس كود لعبة أنت المدرب)
 interEvery:3, // إعلان بيني كل كام ماتش
 interGapMs:120000, // أقل وقت بين إعلانين بينيين
 energyGain:40 // الطاقة اللي بترجع من إعلان المكافأة
};
const Ads=(()=>{
 const A=()=>{try{return Nat&&window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.AdMob||null;}catch(e){return null;}};
 let ready=false,rw=false,it=false,busy=false,lastInter=Date.now();
 const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
 function once(name,ms){const a=A();return new Promise(res=>{let h=null,done=false;const fin=v=>{if(done)return;done=true;try{h&&h.remove&&h.remove();}catch(e){}res(v);};
  Promise.resolve(a.addListener(name,()=>fin(true))).then(x=>{h=x;if(done)try{x.remove();}catch(e){}}).catch(()=>{});if(ms)setTimeout(()=>fin(false),ms);});}
 async function init(){const a=A();if(!a)return;try{const inf=Nat&&Nat.info?await Nat.info():null;ADS.testing=!!(inf&&inf.debuggable);}catch(e){ADS.testing=false;}try{await a.initialize({initializeForTesting:ADS.testing});
   try{const ci=await a.requestConsentInfo();if(ci&&ci.isConsentFormAvailable&&String(ci.status).toUpperCase()==='REQUIRED')await a.showConsentForm();}catch(e){}
   ready=true;loadR();loadI();}catch(e){setTimeout(init,60000);}}
 async function loadR(){const a=A();if(!a||!ready||rw)return;try{await a.prepareRewardVideoAd({adId:ADS.rewardId,isTesting:ADS.testing});rw=true;}catch(e){rw=false;setTimeout(loadR,30000);}}
 async function loadI(){const a=A();if(!a||!ready||it)return;try{await a.prepareInterstitial({adId:ADS.interId,isTesting:ADS.testing});it=true;}catch(e){it=false;setTimeout(loadI,45000);}}
 function hasReward(){return ready&&rw&&!busy;}
 // بيرجّع 'ok' لو اتفرج للآخر، 'cancel' لو قفله بدري، 'na' لو مفيش إعلان متاح
 async function reward(){const a=A();if(!hasReward())return'na';busy=true;rw=false;SFX.crowd&&SFX.crowd(0,.2);
  const got=once('onRewardedVideoAdReward',0),closed=once('onRewardedVideoAdDismissed',180000),fail=once('onRewardedVideoAdFailedToShow',0);let ok=false,failed=false;
  got.then(v=>{if(v)ok=true;});fail.then(v=>{if(v)failed=true;});
  try{const r=await a.showRewardVideoAd();if(r&&+r.amount>0)ok=true;}catch(e){failed=true;}
  if(!failed&&!ok)await Promise.race([closed,wait(180000)]);await wait(250);busy=false;loadR();return ok?'ok':failed?'na':'cancel';}
 async function inter(){const a=A();if(!a||!ready||!it||busy||Date.now()-lastInter<ADS.interGapMs)return false;busy=true;it=false;
  const closed=once('interstitialAdDismissed',90000);let shown=true;try{await a.showInterstitial();}catch(e){shown=false;}
  if(shown)await Promise.race([closed,wait(90000)]);lastInter=Date.now();busy=false;loadI();return shown;}
 // بعد كل ماتش: c.adN بيزيد، وكل ADS.interEvery ماتشات يظهر إعلان بيني وإنت خارج
 function due(c){return!!(c&&ready&&it&&c.adN>0&&c.adN%ADS.interEvery===0&&c.adShown!==c.adN);}
 async function afterMatch(c){if(!due(c))return;c.adShown=c.adN;await inter();}
 // بانر سفلي (بيتشال وقت الماتش). العمليات متسلسلة عشان ماتحصلش مشكلة hideBanner في الإضافة
 let bq=Promise.resolve(),bOn=false;
 function banner(on){bq=bq.then(async()=>{const a=A();if(!a||!ready||on===bOn)return;try{if(on)await a.showBanner({adId:ADS.bannerId,adSize:'ADAPTIVE_BANNER',position:'BOTTOM_CENTER',margin:0,isTesting:ADS.testing});else await a.removeBanner();bOn=on;document.body.classList.toggle('bnr',on);}catch(e){bOn=false;document.body.classList.remove('bnr');}}).catch(()=>{});return bq;}
 setTimeout(init,2500);
 return{reward,inter,afterMatch,due,hasReward,banner,get ready(){return ready;}};})();
