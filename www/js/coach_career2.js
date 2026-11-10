// أنت المدرب — جلسة التدريب بإعلان، الرخص التدريبية، ومحفظة المدرب الشخصية
'use strict';
const LIC=[{n:'الرخصة الأولية',cost:0,tiers:'الدرجة الرابعة والتالتة'},{n:'الرخصة الممتازة',cost:3e4,tiers:'الدرجة التانية والدوري الممتاز'},{n:'الرخصة القارية',cost:8e5,tiers:'الدوريات الأقوى والأوروبية الكبيرة'},{n:'الرخصة الأسطورية',cost:8e6,tiers:'أندية العمالقة وقمة العالم'}];
const licNeed=t=>t<=1?0:t<=3?1:t<=5?2:3;
function cc2(c){if(c.lic==null)c.lic=0;if(c.wallet==null)c.wallet=Math.round(TSC[Math.min(7,c.path.tier)]*.8);if(c.earn==null)c.earn=0;return c;}
const salaryM=c=>Math.round(tsOf(c)*.06*(1+(c.rep||0)/60));
const licOk=(c,t)=>licNeed(t)<=c.lic||c.licAd===c.season;
/* ---- راتب المدرب بعد كل ماتش ---- */
(function(){const M=window.Media;if(!M)return;const _amC2=M.afterMatch;M.afterMatch=function(c,r,res,info,best){try{if(c.coachMode){cc2(c);const sal=salaryM(c),bon=res>0?Math.round(sal*.6):0;c.wallet+=sal+bon;c.earn+=sal+bon;
  const box=$('poStats');if(box)box.insertAdjacentHTML('beforeend',`<div class="news">راتبك الشخصي +${money(sal)}${bon?' · مكافأة فوز +'+money(bon):''} (محفظتك ${money(c.wallet)})</div>`);}}catch(e){console.warn(e);}return _amC2.apply(this,arguments);};})();
/* ---- نهاية الموسم: مكافأة + تجديد الرخصة ---- */
const _psC2=processSeason;processSeason=function(c){const res=_psC2(c);try{if(c.coachMode&&c.seInfo){cc2(c);const lg=c.league,N=lg.teams.length,pos=c.seInfo.pos||N;const prize=Math.round(tsOf(c)*(6*(N-pos+1)/N+(pos===1?8:0)));const bonus=Math.round(prize*.25+(pos===1?salaryM(c)*8:0));c.wallet+=bonus;c.earn+=bonus;
 const ren=Math.round(LIC[c.lic].cost*.1);let msg='مكافأة نهاية الموسم +'+money(bonus);if(ren){if(c.wallet>=ren){c.wallet-=ren;msg+=' · تجديد الرخصة -'+money(ren);}else{c.lic--;msg+=' · مقدرتش تجدد رخصتك فنزلت لـ'+LIC[c.lic].n;}}
 mail(c,'club','اتحاد التدريب','كشف حساب المدرب',msg+'. محفظتك '+money(c.wallet)+'.');}}catch(e){console.warn(e);}return res;};
/* ---- الرخصة شرط للعروض ---- */
const _csC2=coachSign;coachSign=function(c,of){if(c.coachMode){cc2(c);if(!licOk(c,of.tier)){const L=LIC[licNeed(of.tier)];toast('محتاج '+L.n+' عشان تقبل العرض ده (من تبويب مسيرتي)');return;}}return _csC2(c,of);};
/* ---- واجهة الرخص ---- */
function licHTML(c){cc2(c);const nx=LIC[c.lic+1];const act=c.licAd===c.season;
 return`<div class="ttl" style="font-size:18px;margin:12px 0 6px">محفظتك والرخص</div><div class="news">محفظتك الشخصية: <b>${money(c.wallet)}</b> · راتبك لكل ماتش ${money(salaryM(c))} · إجمالي الأرباح ${money(c.earn)}</div>
 <div class="news">رخصتك: <b>${LIC[c.lic].n}</b>${act?' (+ رخصة مؤقتة بإعلان لحد آخر الموسم)':''}<br><span class="sub">بتغطي: ${LIC[c.lic].tiers}</span></div>
 ${nx?`<button class="btn sm gold" id="licUp">ترقية: ${nx.n} — ${money(nx.cost)}</button> <span class="sub">تجديد سنوي 10%</span>`:'<div class="sub">وصلت لأعلى رخصة</div>'}
 ${nx&&!act&&Ads.ready?'<div style="margin-top:6px"><button class="btn sm" id="licAd">فتح الرخصة اللي بعدها مؤقتاً بإعلان</button></div>':''}`;}
const _rcC2=renderCareer;renderCareer=function(){_rcC2();const c=App.c;if(!c||!c.coachMode)return;const t=$('caTro');if(!t)return;t.insertAdjacentHTML('afterbegin',licHTML(c));
 const u=$('licUp');if(u)u.onclick=()=>{const nx=LIC[c.lic+1];if(c.wallet<nx.cost){toast('محفظتك مش كفاية');return;}c.wallet-=nx.cost;c.lic++;c.rep=clamp((c.rep||0)+4,0,100);addNews(c,'me',c.name+' يحصل على '+nx.n,true);store();toast('مبروك! '+nx.n);renderCareer();renderShell('career');};
 const a=$('licAd');if(a)a.onclick=async()=>{a.disabled=true;const x=await Ads.reward();if(x==='ok'){c.licAd=c.season;store();toast('اتفتحت رخصة مؤقتة لحد آخر الموسم');renderCareer();}else{a.disabled=false;toast('لازم تكمّل الإعلان للآخر');}};};
/* ---- جلسة التدريب بين الماتشات ---- */
function trainInfo(c){return c.trainSi===c.si;}
function doTrain(c,gain,label){const S=mySquad(c);const fb=((c.fac&&c.fac.train)||0)*3;S.forEach(p=>{p.fit=Math.min(100,p.fit+gain+fb);});c.morale=clamp(c.morale+2,0,100);
 const y=S.filter(p=>p.age<=22&&p.ov<(p.pot||99));let up='';if(y.length&&Math.random()<.3){const p=pick(y);p.ov++;up=' · '+p.n+' اتحسّن (+1)';}
 c.trainSi=c.si;updR(c);store();toast(label+up);if(window.Media)Media.closeModal();renderHub();}
function trainModal(c){const S=mySquad(c);const avg=Math.round(S.reduce((s,p)=>s+p.fit,0)/S.length);
 Media.showModal(`<div class="evh">جلسة تدريب</div><div class="ttl" style="font-size:18px;margin:6px 0">اللياقة العامة ${avg}%</div><div class="sub" style="margin-bottom:10px">الماتشات بتستهلك طاقة اللاعيبة، والتدريب بيرجّعها قبل الماتش الجاي. الجلسة بتتفتح بمشاهدة إعلان قصير.</div>
 <div class="col" style="gap:8px"><button class="btn gold" id="trAd">شوف إعلان ← رجّع +30% طاقة لكل الفريق</button><button class="btn ghost" id="trNo">مش دلوقتي</button></div>`,m=>{
  $('trNo').onclick=Media.closeModal;
  $('trAd').onclick=async()=>{const b=$('trAd');if(!Ads.ready){toast('مفيش إعلان متاح دلوقتي، جرّب بعد شوية');return;}b.disabled=true;b.textContent='بيحمّل الإعلان…';let x='err';try{x=await Ads.reward();}catch(e){}
   if(x!=='ok'){b.disabled=false;b.textContent='شوف إعلان ← رجّع +30% طاقة لكل الفريق';toast(x==='cancel'?'لازم تكمّل الإعلان للآخر عشان التدريب يتحسب':'الإعلان محملش — مفيش تدريب دلوقتي');return;}doTrain(c,30,'الفريق رجّع 30% من طاقته');};});}
const _rhC2=renderHub;renderHub=function(){_rhC2();const c=App.c;if(!c||!c.coachMode)return;const t=$('tNext');if(!t||!c.sched[c.si])return;const old=$('trainBtn');if(old)old.remove();
 const b=document.createElement('button');b.id='trainBtn';b.className='btn sm '+(trainInfo(c)?'ghost':'gold');b.style.cssText='position:absolute;left:14px;bottom:10px';b.textContent=trainInfo(c)?'التدريب خلص ✓':'🏋️ جلسة تدريب';b.disabled=trainInfo(c);b.onclick=()=>trainModal(c);t.appendChild(b);};
window.cc2=cc2;window.salaryM=salaryM;

/* ---- عروض الاهتمام اللي اتفتحت في نص الموسم بتتضاف لعروض آخر الموسم ---- */
const _coC2=coachOffers;coachOffers=function(c,stayTier,sacked,perf){const out=_coC2(c,stayTier,sacked,perf)||[];try{if(c.interest&&!sacked){const t=Math.min(7,Math.max(c.interest.tier,stayTier));const {ti,cl}=clubFor(c,t);if(!out.some(o=>o.tier===t))out.unshift({tier:t,abroad:ti.country,club:{name:cl.name,short:cl.short,kit:cl.kit,kitArr:cl.kitArr,cc:ti.country,real:cl.real,R:cl.R},clubR:cl.R,wage:Math.round(tsOf(c)*.4*(1+c.rep/60)*(1+(t-stayTier)*.3)),years:RI(2,4),tierName:ti.name,role:'مدرب الفريق الأول',fee:0,why:'اهتمام سابق'});}c.interest=null;}catch(e){console.warn(e);}return out.slice(0,3);};
