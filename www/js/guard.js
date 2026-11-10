// مسيرة نجم — الحماية والخدمات: حفظ آمن (نسخة في الجهاز + بصمة)، تشفير القيم المهمة في الذاكرة ضد برامج التهكير،
// كشف برامج الغش، كشف مانع الإعلانات، وفحص التحديثات على Google Play
'use strict';
const Nat=(()=>{try{const C=window.Capacitor;if(!C||!(C.isNativePlatform?C.isNativePlatform():C.platform&&C.platform!=='web'))return null;return C.Plugins&&C.Plugins.Native||(C.registerPlugin?C.registerPlugin('Native'):null);}catch(e){return null;}})();
const Guard=(()=>{
 const SALT='mN#7q!'+'sTar'+'2026';
 function hash(str){let h1=0xdeadbeef^31,h2=0x41c6ce57^17;const s=SALT+str+SALT.length;for(let i=0;i<s.length;i++){const ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36);}
 // القيم المهمة بتتخزن في الذاكرة كنص مشفّر بمفتاح عشوائي كل تشغيلة، فبرامج زي GameGuardian ما تلاقيش الرقم الظاهر في الشاشة
 const K=1+Math.floor(Math.random()*9e5),done=new WeakSet(),box=new WeakMap();
 const enc=v=>{const n=Number(v)||0;const s=String(n*7+K);return s.split('').reverse().join('')+'~'+hash(s).slice(0,4);};
 const dec=e=>{const i=e.lastIndexOf('~');const s=e.slice(0,i).split('').reverse().join('');if(hash(s).slice(0,4)!==e.slice(i+1)){Guard.cheat('mem');return 0;}return Math.round((Number(s)-K)/7*1e6)/1e6;};
 function wrap(o,keys){if(!o||typeof o!=='object')return;let st=box.get(o);if(!st){st={};box.set(o,st);}
  for(const k of keys){const d=Object.getOwnPropertyDescriptor(o,k);if(!d||d.get)continue;st[k]=enc(d.value);
   Object.defineProperty(o,k,{enumerable:true,configurable:true,get(){return dec(st[k]);},set(v){st[k]=enc(v);}});}}
 function protect(c){if(!c)return c;if(!done.has(c)){done.add(c);}wrap(c,['money','sp','followers','energy','won']);if(c.attrs&&!done.has(c.attrs)){done.add(c.attrs);wrap(c.attrs,Object.keys(c.attrs));}return c;}
 let cheated=false;
 function cheat(why){if(cheated)return;cheated=true;try{console.warn('guard:',why);}catch(e){}setTimeout(()=>block('cheat'),0);}
 // شاشة بتوقف اللعب لحد ما المشكلة تتحل
 function block(kind,extra){let el=document.getElementById('guardBlk');if(!el){el=document.createElement('div');el.id='guardBlk';document.body.appendChild(el);}
  const T={cheat:['اكتشفنا تلاعب في اللعبة','قفل أي برنامج تهكير أو تعديل (زي GameGuardian أو Lucky Patcher) وافتح اللعبة من جديد.'],
   apps:['لازم تقفل برامج التهكير','لقينا على جهازك برامج بتستخدم في تهكير الألعاب'+(extra?': '+extra:'')+'. امسحها أو اقفلها وبعدين دوس «جرّب تاني».'],
   ads:['اقفل مانع الإعلانات','الإعلانات هي اللي بتخلّي اللعبة مجانية. اقفل مانع الإعلانات (أو الـ Private DNS زي AdGuard) وبعدين دوس «جرّب تاني».']}[kind];
  el.innerHTML=`<div class="gbox"><div class="gico">!</div><h2>${T[0]}</h2><p>${T[1]}</p>${kind==='cheat'?'':'<button class="btn" id="guardRe">جرّب تاني</button>'}</div>`;el.className='on';
  if(typeof App!=='undefined'&&App.match&&!App.match.paused&&typeof togglePause==='function')togglePause();
  const b=document.getElementById('guardRe');if(b)b.onclick=()=>{b.textContent='بنتأكد…';(kind==='ads'?adCheck():appCheck()).then(bad=>{if(!bad)el.className='';else b.textContent='جرّب تاني';});};}
 // برامج الغش المعروفة (لازم تبقى مكتوبة كمان في AndroidManifest جوه <queries>)
 async function appCheck(){if(!Nat||!Nat.info)return false;try{const r=await Nat.info();const bad=(r&&r.bad)||[];if(bad.length){block('apps',bad.join('، '));return true;}}catch(e){}return false;}
 // مانع الإعلانات: لو النت شغال وسيرفر الإعلانات بس اللي مقفول
 async function adCheck(){if(!Nat||!navigator.onLine||location.protocol==='file:')return false;const ping=(u)=>Promise.race([fetch(u,{mode:'no-cors',cache:'no-store'}).then(()=>true,()=>false),new Promise(r=>setTimeout(()=>r(null),6000))]);
  const ok=await ping('https://www.gstatic.com/generate_204?'+Date.now());if(!ok)return false;
  const a=await ping('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?'+Date.now()),b=a?await ping('https://googleads.g.doubleclick.net/pagead/id?'+Date.now()):false;
  if(a===false||b===false){block('ads');return true;}return false;}
 async function updCheck(){if(!Nat||!Nat.checkUpdate)return;try{const r=await Nat.checkUpdate();if(!r||!r.available)return;
  let el=document.getElementById('updBox');if(!el){el=document.createElement('div');el.id='updBox';document.body.appendChild(el);}
  el.innerHTML=`<div class="gbox"><div class="gico up">↑</div><h2>في تحديث جديد!</h2><p>نزلت نسخة جديدة من أنت المدرب على Google Play فيها تحسينات وإصلاحات. حدّث دلوقتي عشان تكمل بأحسن نسخة.</p><div class="row" style="gap:10px;justify-content:center"><button class="btn" id="updGo">حدّث دلوقتي</button>${r.force?'':'<button class="btn ghost" id="updLater">بعدين</button>'}</div></div>`;el.className='on';
  document.getElementById('updGo').onclick=()=>{Nat.startUpdate().catch(()=>{});};const l=document.getElementById('updLater');if(l)l.onclick=()=>{el.className='';};}catch(e){}}
 function boot(){setTimeout(()=>{appCheck();updCheck();},1500);setTimeout(adCheck,4000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){appCheck();}});}
 return{hash,protect,cheat,block,boot,appCheck,adCheck,updCheck};})();
