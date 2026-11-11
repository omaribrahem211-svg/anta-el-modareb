/* أكواد الهدايا (من داشبورد الأدمن عبر Firestore) + مكافأة الدخول اليومي — الاتنين لازم إعلان */
(function(){
const FB={pid:'lucid-trail-tf6jr',db:'ai-studio-antaelmodareb-86e9b4cd-cdbd-45fa-991c-c4aa57a27d9d',key:'AIzaSyAmcW8B_IOiXCwX2Ybq7SsRN5VC0E8GOwU'};
const BASE='https://firestore.googleapis.com/v1/projects/'+FB.pid+'/databases/'+FB.db+'/documents/promo_codes';
const LS_DEV='anta_el_modareb_guest_device_token_v1',LS_RED='anta_el_modareb_redeemed_codes_v1',LS_RL='anta_el_modareb_promo_rate_limit_v1';
const ls={g(k){try{return localStorage.getItem(k);}catch(e){return null;}},s(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
function devId(){let d=ls.g(LS_DEV);if(!d){d='dev_'+Date.now()+'_'+Math.random().toString(36).slice(2,12);ls.s(LS_DEV,d);}return d;}
function clean(r){return String(r||'').replace(/[​-‍﻿‎‏‪-‮ \s]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).toUpperCase();}
/* Firestore REST <-> JS */
function dec(v){if(!v)return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return +v.integerValue;if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if('nullValue'in v)return null;if('arrayValue'in v)return(v.arrayValue.values||[]).map(dec);if('mapValue'in v){const o={};for(const k in(v.mapValue.fields||{}))o[k]=dec(v.mapValue.fields[k]);return o;}return null;}
function enc(x){if(x==null)return{nullValue:null};if(typeof x==='string')return{stringValue:x};if(typeof x==='boolean')return{booleanValue:x};if(typeof x==='number')return Number.isInteger(x)?{integerValue:String(x)}:{doubleValue:x};if(Array.isArray(x))return{arrayValue:{values:x.map(enc)}};const f={};for(const k in x)f[k]=enc(x[k]);return{mapValue:{fields:f}};}
async function tf(url,opt,ms){const ct=new AbortController(),t=setTimeout(()=>ct.abort(),ms||9000);try{return await fetch(url,Object.assign({signal:ct.signal},opt||{}));}finally{clearTimeout(t);}}
async function getCode(id){const r=await tf(BASE+'/'+encodeURIComponent(id)+'?key='+FB.key);if(r.status===404)return null;if(!r.ok)throw new Error('net');const j=await r.json();const o={};for(const k in(j.fields||{}))o[k]=dec(j.fields[k]);o._id=id;return o;}
async function findCode(code){let d=await getCode(code);if(d)return d;const s=code.replace(/[-_]/g,'');if(s!==code){d=await getCode(s);if(d)return d;}
  /* احتياطي: بحث في كل الأكواد (الكود ممكن يتخزن بـ id مختلف) */
  const r=await tf(BASE+'?pageSize=200&key='+FB.key);if(!r.ok)throw new Error('net');const j=await r.json();for(const doc of(j.documents||[])){const f=doc.fields||{};const cc=clean(dec(f.code)||'');if(cc===code||cc.replace(/[-_]/g,'')===s){const o={};for(const k in f)o[k]=dec(f[k]);o._id=doc.name.split('/').pop();return o;}}return null;}
async function patchUse(d,rec,ids,by){const q=['usedCount','usedByManagerIds','redeemedBy'].map(k=>'updateMask.fieldPaths='+k).join('&');
  const body={fields:{usedCount:enc((d.usedCount||0)+1),usedByManagerIds:enc(ids),redeemedBy:enc(by)}};
  const r=await tf(BASE+'/'+encodeURIComponent(d._id)+'?'+q+'&key='+FB.key,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.ok;}
function rlCheck(){try{const d=JSON.parse(ls.g(LS_RL)||'null');if(d&&d.blockedUntil&&Date.now()<d.blockedUntil)return Math.ceil((d.blockedUntil-Date.now())/1000);}catch(e){}return 0;}
function rlFail(){let d;try{d=JSON.parse(ls.g(LS_RL)||'null');}catch(e){}const n=Date.now();if(!d||n-d.ws>120000)d={a:1,ws:n};else d.a++;if(d.a>=5)d.blockedUntil=n+90000;ls.s(LS_RL,JSON.stringify(d));}
function redeemed(){try{return JSON.parse(ls.g(LS_RED)||'[]');}catch(e){return[];}}
function mark(c){const l=redeemed();if(!l.includes(c)){l.push(c);ls.s(LS_RED,JSON.stringify(l));}}
/* تحقق قبل الإعلان */
async function validate(raw){const code=clean(raw);if(!code)throw new Error('اكتب الكود الأول');const w=rlCheck();if(w)throw new Error('استنى '+w+' ثانية قبل ما تجرّب كود تاني');
  const loc=redeemed();if(loc.includes(code)||loc.includes(code.replace(/[-_]/g,'')))throw new Error('انت استخدمت الكود ده قبل كده على الجهاز ده');
  let d;try{d=await findCode(code);}catch(e){throw new Error('محتاج إنترنت عشان تستخدم الكود');}
  if(!d){rlFail();throw new Error('الكود غلط، اتأكد من الحروف والأرقام');}
  const off=clean(d.code||d._id);if(loc.includes(off))throw new Error('انت استخدمت الكود ده قبل كده');
  if(d.isActive===false){rlFail();throw new Error('الكود ده متوقف من الإدارة');}
  if(d.expiresAt&&Date.now()>d.expiresAt){rlFail();throw new Error('الكود ده انتهت صلاحيته');}
  if((d.usedCount||0)>=(d.maxUses||1)){rlFail();throw new Error('الكود ده خلص عدد استخداماته');}
  if(!(d.rewardAmount>0)){rlFail();throw new Error('الكود ده مفيهوش مكافأة');}
  const ids=Array.isArray(d.usedByManagerIds)?d.usedByManagerIds:[];if(ids.includes(devId()))throw new Error('انت استخدمت الكود ده قبل كده');
  return{d,off,code};}
/* بعد الإعلان: تسجيل الاستخدام في السحابة ثم صرف الفلوس. لو التسجيل فشل ما يتصرفش حاجة */
async function commit(c,v){let d=v.d;for(let i=0;i<3;i++){
    const ids=Array.from(new Set([...(Array.isArray(d.usedByManagerIds)?d.usedByManagerIds:[]),devId()]));
    const by=[...(Array.isArray(d.redeemedBy)?d.redeemedBy:[]),{userId:devId(),managerName:c.name||'المدرب',clubName:(c.club&&c.club.name)||'',redeemedAt:Date.now(),amount:d.rewardAmount}].slice(-100);
    let ok=false;try{ok=await patchUse(d,null,ids,by);}catch(e){}
    if(ok){w0(c);c.wallet=(c.wallet||0)+d.rewardAmount;c.earn=(c.earn||0)+d.rewardAmount;mark(v.off);mark(v.code);try{store();}catch(e){}return d.rewardAmount;}
    try{const n=await getCode(v.d._id);if(!n||(n.usedCount||0)>=(n.maxUses||1)||n.isActive===false)throw 0;if((n.usedByManagerIds||[]).includes(devId()))throw 0;d=n;}catch(e){return -1;}}
  return -1;}
function redeemModal(){const c=App.c;if(!c)return;
  Media.showModal(`<div class="evh">🎁 كود هدية</div><div class="sub" style="margin:6px 0 10px">اكتب الكود وبعدها شوف إعلان قصير، والفلوس بتنزل في محفظتك (محفظتك ${money(c.wallet||0)}).</div>
  <input id="cdIn" dir="ltr" autocomplete="off" autocapitalize="characters" placeholder="CODE" style="width:100%;padding:12px;border-radius:10px;border:1px solid #2a3a33;background:#0b1410;color:#fff;font-size:18px;text-align:center;letter-spacing:2px;margin-bottom:6px">
  <div id="cdMsg" class="sub" style="min-height:20px;margin-bottom:8px"></div>
  <div class="col" style="gap:8px"><button class="btn gold" id="cdGo">تحقق وشوف إعلان</button><button class="btn ghost" id="cdNo">إغلاق</button></div>`,m=>{
   const msg=t=>{$('cdMsg').textContent=t;};$('cdNo').onclick=Media.closeModal;
   $('cdGo').onclick=async()=>{const b=$('cdGo');b.disabled=true;msg('بنتحقق من الكود…');let v;
     try{v=await validate($('cdIn').value);}catch(e){msg('⚠ '+e.message);b.disabled=false;return;}
     if(!Ads.ready){msg('⚠ مفيش إعلان متاح دلوقتي، جرّب بعد شوية (الكود لسه معاك)');b.disabled=false;return;}
     msg('الكود صحيح ✓ بيحمّل الإعلان…');let x='err';try{x=await Ads.reward();}catch(e){}
     if(x!=='ok'){msg(x==='cancel'?'⚠ لازم تكمّل الإعلان للآخر عشان الفلوس توصل':'⚠ الإعلان محملش، جرّب تاني');b.disabled=false;return;}
     msg('بنسجّل الكود…');const amt=await commit(c,v);
     if(amt<0){msg('⚠ حصلت مشكلة في الاتصال وقت التسجيل، جرّب تاني (الكود لسه صالح)');b.disabled=false;return;}
     Media.showModal(`<div class="evh">🎉 مبروك يا كابتن</div><div class="ttl" style="font-size:26px;margin:10px 0;color:#7CFFB0">+${money(amt)}</div><div class="sub" style="margin-bottom:10px">اتضافت لمحفظتك. رصيدك دلوقتي ${money(c.wallet)}.</div><button class="btn gold" id="cdOk">تمام</button>`,()=>{$('cdOk').onclick=()=>{Media.closeModal();try{renderCareer();renderHub();}catch(e){}};});};});}
window.redeemModal=redeemModal;
/* ===== مكافأة الدخول اليومي (7 أيام) ===== */
const DAILY=[{f:100e3,x:'+3% طاقة'},{f:100e3,x:''},{f:150e3,x:'+طاقة للفريق ⚡',en:1},{f:150e3,x:''},{f:200e3,x:'+معنويات 🔥',mo:1},{f:250e3,x:''},{f:2e6,x:'الجائزة الكبرى 🏆 طاقة ومعنويات كاملة',en:1,mo:1,big:1}];
DAILY[0].x='';
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dayDiff(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);}
function w0(c){if(c.wallet==null)c.wallet=Math.round(TSC[Math.min(7,c.path.tier)]*.8);if(c.earn==null)c.earn=0;}
function dl(c){if(!c.dl)c.dl={streak:0,last:null,total:0};return c.dl;}
function nextDay(c){const s=dl(c);if(!s.last)return 1;const d=dayDiff(s.last,today());if(d<=0)return 0;return d===1?(s.streak%7)+1:1;}
let shown=false;
function dailyModal(){const c=App.c;if(!c||!c.coachMode)return;const day=nextDay(c);if(!day)return;const R=DAILY[day-1];
  const grid=DAILY.map((r,i)=>`<div style="flex:1;min-width:0;padding:6px 2px;border-radius:8px;text-align:center;font-size:11px;background:${i+1===day?'#1f6b45':i+1<day?'#14261d':'#0f1d17'};border:1px solid ${i+1===day?'#7CFFB0':'#223229'}"><div>يوم ${i+1}</div><div style="font-weight:700">${money(r.f)}</div></div>`).join('');
  Media.showModal(`<div class="evh">🎁 مكافأة الدخول اليومي</div><div class="sub" style="margin:6px 0 8px">اليوم ${day} من 7 — ادخل كل يوم من غير ما تفوّت عشان توصل للجائزة الكبرى.</div>
  <div style="display:flex;gap:4px;margin-bottom:10px">${grid}</div>
  <div class="ttl" style="font-size:22px;margin:6px 0;color:#7CFFB0">+${money(R.f)}</div><div class="sub" style="margin-bottom:10px">${R.x||'في محفظتك'}</div><div id="dlMsg" class="sub" style="min-height:18px"></div>
  <div class="col" style="gap:8px"><button class="btn gold" id="dlGo">شوف إعلان واستلم</button><button class="btn ghost" id="dlNo">بعدين</button></div>`,m=>{
   $('dlNo').onclick=Media.closeModal;
   $('dlGo').onclick=async()=>{const b=$('dlGo');if(!Ads.ready){$('dlMsg').textContent='⚠ مفيش إعلان متاح دلوقتي، جرّب بعد شوية';return;}b.disabled=true;$('dlMsg').textContent='بيحمّل الإعلان…';let x='err';try{x=await Ads.reward();}catch(e){}
    if(x!=='ok'){$('dlMsg').textContent=x==='cancel'?'⚠ لازم تكمّل الإعلان للآخر عشان المكافأة توصل':'⚠ الإعلان محملش، جرّب تاني';b.disabled=false;return;}
    const s=dl(c);if(nextDay(c)!==day){Media.closeModal();return;}s.streak=day;s.last=today();s.total++;w0(c);c.wallet=(c.wallet||0)+R.f;c.earn=(c.earn||0)+R.f;
    try{const S=mySquad(c);if(R.en)S.forEach(p=>{p.fit=Math.min(100,p.fit+(R.big?100:30));});if(R.mo)c.morale=clamp(c.morale+(R.big?30:10),0,100);if(day===1)S.forEach(p=>{p.fit=Math.min(100,p.fit+3);});}catch(e){}
    try{store();}catch(e){}
    Media.showModal(`<div class="evh">🎉 استلمت مكافأة اليوم ${day}</div><div class="ttl" style="font-size:24px;margin:10px 0;color:#7CFFB0">+${money(R.f)}</div><div class="sub" style="margin-bottom:10px">ارجع بكرة للمكافأة الجاية. محفظتك ${money(c.wallet)}.</div><button class="btn gold" id="dlOk">تمام</button>`,()=>{$('dlOk').onclick=()=>{Media.closeModal();try{renderHub();}catch(e){}};});};});}
window.dailyModal=dailyModal;
/* زرار الكود في الشريط العلوي + فتح مكافأة اليوم أول ما الهب يظهر */
const _rhCd=renderHub;renderHub=function(){_rhCd.apply(this,arguments);const c=App.c;if(!c||!c.coachMode)return;
  if(!$('cdBtn')){const r=document.querySelector('.cmright');if(r){const b=document.createElement('button');b.id='cdBtn';b.className='cmico';b.setAttribute('aria-label','كود هدية');b.textContent='🎁';b.style.fontSize='18px';b.onclick=redeemModal;r.insertBefore(b,r.firstChild);}}
  if(!shown&&nextDay(c)&&!document.getElementById('mdl').classList.contains('on')){shown=true;setTimeout(()=>{if(!document.getElementById('mdl').classList.contains('on'))dailyModal();},700);}};
})();
