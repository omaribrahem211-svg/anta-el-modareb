/* مسيرة نجم — فيديوهات المراسم (تتويج، أوضة اللبس، رجل الماتش، الكرة الذهبية، المؤتمر الصحفي)
   كل فيديو عبارة عن لقطات متتابعة بحركة حقيقية: لاعيبة بتنط وتصقف وتمشي وترفع الكاس، جمهور وأعلام، إضاءة وكاميرا. */
'use strict';
const FSKIN=['#C68E64','#8D5524','#E0AC69','#F1C27D','#5C3A21','#A0522D','#D2A27A'],FHAIR=['#1A1A1A','#3B2414','#6B4423','#111111','#C9A15B','#2a1a10'];
let figN=0;
// لاعب متحرك (SVG): ذراعين ورجلين ورأس بتتحرك بالـ CSS حسب الحالة (jump / clap / walk / lift / wave / huddle / spray / idle)
function figSVG(o){o=o||{};const k=o.k||['#1E88E5','#FFFFFF'],sk=o.skin||pick(FSKIN),hr=o.hair||pick(FHAIR),sh=o.sh||(lum(k[0])>.75?'#222':k[1]),fg=lum(k[0])>.6?'#111':'#fff';
 const sock=o.sock||k[0];const id='f'+(++figN);
 const held=o.hold==='cup'?`<g class="hold">${cupSVG(0)}</g>`:o.hold==='ball'?`<g class="hold"><circle cx="30" cy="-20" r="17" fill="url(#gGold)" stroke="#a87b10" stroke-width="1.2"/><path d="M14 -24 Q30 -14 46 -24 M17 -10 Q30 -18 43 -10 M30 -37 Q24 -20 30 -3" fill="none" stroke="#a87b10" stroke-width="1.2" opacity=".7"/></g>`:o.hold==='mini'?`<g class="hold mini"><path d="M22 52 h16 c0 9 -3 13 -8 14 c-5 -1 -8 -5 -8 -14z" fill="url(#gGold)"/><rect x="28" y="66" width="4" height="6" fill="#C9A227"/><rect x="24" y="72" width="12" height="4" rx="1" fill="#6b4a12"/></g>`:'';
 const bottle=o.bottle?`<g class="btl"><rect x="41" y="74" width="7" height="18" rx="2" fill="#1d5a2a"/><rect x="43" y="68" width="3" height="7" fill="#c9a227"/></g>`:'';
 const suit=o.suit;// بدلة رسمية (حفل الكرة الذهبية)
 const top=suit?'#14161c':k[0],slv=suit?'#14161c':k[0],shorts=suit?'#14161c':sh,legC=suit?'#14161c':sk,sockC=suit?'#14161c':sock;
 return`<svg class="fig" id="${id}" viewBox="0 -62 60 222" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
 <g class="lgL"><rect x="20.5" y="94" width="9" height="56" rx="4" fill="${legC}"/><rect x="20.5" y="${suit?94:126}" width="9" height="${suit?54:24}" rx="3" fill="${sockC}"/><path d="M19 149 h12 v6 h-15 q0 -6 3 -6z" fill="#0d0d0d"/></g>
 <g class="lgR"><rect x="30.5" y="94" width="9" height="56" rx="4" fill="${legC}"/><rect x="30.5" y="${suit?94:126}" width="9" height="${suit?54:24}" rx="3" fill="${sockC}"/><path d="M29 149 h12 q3 0 3 6 h-15z" fill="#0d0d0d"/></g>
 <rect x="18" y="80" width="24" height="${suit?22:20}" rx="3" fill="${shorts}"/>
 <g class="arL"><rect x="12" y="44" width="7" height="34" rx="3.5" fill="${suit?'#14161c':sk}"/><rect x="11.5" y="35" width="9" height="13" rx="3" fill="${slv}"/>${suit?`<rect x="12" y="74" width="7" height="6" rx="3" fill="${sk}"/>`:''}</g>
 <path d="M16 36 Q30 30 44 36 L42 84 L18 84 Z" fill="${top}"/>${suit?`<path d="M26 34 L30 52 L34 34 Z" fill="#fff"/><path d="M29 36 h2 l1 4 -2 2 -2 -2z" fill="#C9A227"/>`:`<path d="M24 33 Q30 38 36 33" fill="none" stroke="${k[1]}" stroke-width="2.4"/>${o.num!=null?`<text x="30" y="66" text-anchor="middle" font-size="15" font-weight="800" fill="${fg}" font-family="Changa,sans-serif">${o.num}</text>`:''}`}
 <rect x="26.5" y="26" width="7" height="9" fill="${sk}"/>
 <g class="hd"><circle cx="30" cy="18" r="10.5" fill="${sk}"/><path d="M19.5 17 Q20 5 30 5.5 Q40 5 40.5 17 Q37 11 30 11 Q23 11 19.5 17z" fill="${hr}"/></g>
 <g class="arR"><rect x="41" y="44" width="7" height="34" rx="3.5" fill="${suit?'#14161c':sk}"/><rect x="39.5" y="35" width="9" height="13" rx="3" fill="${slv}"/>${suit?`<rect x="41" y="74" width="7" height="6" rx="3" fill="${sk}"/>`:''}${bottle}</g>
 ${held}</svg>`;}
function cupSVG(dy){return`<g transform="translate(0 ${dy||0})"><path d="M13 -54 h34 c0 20 -6 30 -17 32 c-11 -2 -17 -12 -17 -32z" fill="url(#gGold)" stroke="#a87b10" stroke-width="1"/><path d="M13 -50 c-9 0 -9 14 3 16 M47 -50 c9 0 9 14 -3 16" fill="none" stroke="url(#gGold)" stroke-width="3"/><rect x="27" y="-22" width="6" height="12" fill="#C9A227"/><rect x="20" y="-10" width="20" height="9" rx="2" fill="#6b4a12"/><rect x="22" y="-8" width="16" height="2" fill="#C9A227"/><path d="M18 -50 q4 12 8 18" fill="none" stroke="#fff6c8" stroke-width="2" opacity=".7"/></g>`;}
// مجموعة لاعيبة في صف واحد
function figRow(n,o){o=o||{};let h='';for(let i=0;i<n;i++){const x=(o.x0!=null?o.x0:6)+i*((o.x1!=null?o.x1:94)-(o.x0!=null?o.x0:6))/Math.max(1,n-1);const st=o.star!=null&&i===o.star;const a=st&&o.starAnim?o.starAnim:(typeof o.anim==='function'?o.anim(i):o.anim||'jump');
  h+=`<div class="fw ${a} ${st?'star':''}" style="left:${x.toFixed(1)}%;bottom:${o.y||8}%;height:${(o.h||46)*(st?1.08:1)*(o.depth?1-o.depth*(i%2):1)}vh;--d:${(o.dl!=null?o.dl:(i*.13)%0.6).toFixed(2)}s;z-index:${st?5:2+(i%3)}">${st&&o.label?`<span class="flab">${esc(o.label)}</span>`:''}${figSVG(Object.assign({},o.fig||{},st?(o.starFig||{}):{num:o.nums?o.nums[i]:null}))}</div>`;}return h;}
function crowdHTML(k){return`<div class="fcrowd" style="--c1:${k[0]};--c2:${k[1]}"><i class="cw"></i></div><div class="fflags">${[8,22,37,55,70,86].map((x,i)=>`<span class="fflag" style="left:${x}%;--d:${(i*.23).toFixed(2)}s;background:linear-gradient(180deg,${i%2?k[0]:k[1]} 0 50%,${i%2?k[1]:k[0]} 50%)"></span>`).join('')}</div>`;}
function tickerTape(n,cols){return`<div class="tape">${Array.from({length:n},(_,i)=>`<i style="left:${(Math.random()*100).toFixed(1)}%;background:${cols[i%cols.length]};--d:${(Math.random()*2.2).toFixed(2)}s;--t:${(2.2+Math.random()*1.8).toFixed(2)}s;--r:${Math.round(Math.random()*720-360)}deg"></i>`).join('')}</div>`;}
function sprayHTML(n,side){return`<div class="spray ${side||''}">${Array.from({length:n},(_,i)=>`<i style="--a:${(-70+Math.random()*60).toFixed(0)}deg;--d:${(Math.random()*1.2).toFixed(2)}s;--l:${(18+Math.random()*24).toFixed(0)}vh"></i>`).join('')}</div>`;}
function snapSnd(){try{const C=SFX.ctx;if(!C||!SFX.on)return;const n=C.sampleRate*.06,bf=C.createBuffer(1,n,C.sampleRate),d=bf.getChannelData(0);for(let j=0;j<n;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/n,3);const sr=C.createBufferSource(),g=C.createGain();g.gain.value=.22;sr.buffer=bf;sr.connect(g);g.connect(C.destination);sr.start();}catch(e){}}
function drumRoll(sec){try{const C=SFX.ctx;if(!C||!SFX.on)return;const t0=C.currentTime;for(let i=0;i<sec*14;i++){const n=C.sampleRate*.04,bf=C.createBuffer(1,n,C.sampleRate),d=bf.getChannelData(0);for(let j=0;j<n;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/n,2);const s=C.createBufferSource(),g=C.createGain(),f=C.createBiquadFilter();f.type='lowpass';f.frequency.value=900;g.gain.value=.05+.18*i/(sec*14);s.buffer=bf;s.connect(f);f.connect(g);g.connect(C.destination);s.start(t0+i/14);}}catch(e){}}

/* محرك الفيديو: لقطات + انتقالات + شريط سفلي + أشرطة سينما */
const Film={
 run(o){try{return this._run(o);}catch(e){console.warn('film',e);o.then&&o.then();}},
 _run(o){const box=$('cer');const k=o.k||['#1E88E5','#FFFFFF'],fg=lum(k[0])>.6?'#111':'#fff';
  box.innerHTML=`<div class="film ${o.cls||''}" style="--c1:${k[0]};--c2:${k[1]};--fg:${fg}"><svg width="0" height="0" style="position:absolute"><defs><linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".45" stop-color="#F5C542"/><stop offset="1" stop-color="#B8860B"/></linearGradient></defs></svg>
   ${o.shots.map((s,i)=>`<div class="sh ${s.c||''}">${s.h}</div>`).join('')}
   <div class="lt"><div class="ltc">${o.ltIcon||''}</div><div class="ltt"><b></b><small></small></div></div>
   <div class="bug"><i></i>${o.bug||'أنت المدرب TV'}</div><div class="lb t"></div><div class="lb b"></div><div class="vig"></div><div class="grain"></div><div class="whip"></div></div>`;
  const F=box.firstElementChild,S=[...F.querySelectorAll('.sh')],ltb=F.querySelector('.ltt b'),lts=F.querySelector('.ltt small');let i=-1,tm=null,ti=[],done=false;
  const later=(f,ms)=>ti.push(setTimeout(f,ms));const clr=()=>{clearTimeout(tm);ti.forEach(clearTimeout);ti=[];};
  const finish=()=>{if(done)return;done=true;clr();box.onclick=null;$('cerSkip').onclick=null;o.then&&o.then();};
  const go=n=>{clr();if(n>=S.length)return finish();F.classList.remove('wh');void F.offsetWidth;if(i>=0)F.classList.add('wh');
   later(()=>{S.forEach(x=>x.classList.remove('on'));void F.offsetWidth;S[n].classList.add('on');i=n;const sh=o.shots[n];
    if(sh.lt){ltb.textContent=sh.lt[0];lts.textContent=sh.lt[1]||'';F.classList.remove('lton');void F.offsetWidth;F.classList.add('lton');}else F.classList.remove('lton');
    try{sh.cue&&sh.cue(F,later);}catch(e){console.warn(e);}if(sh.d)tm=setTimeout(()=>go(n+1),sh.d);},i>=0?230:0);};
  box.onclick=e=>{const b=e.target.closest('[data-fgo]');if(b)return finish();if(e.target.closest('button'))return;if(o.shots[i]&&o.shots[i].hold)return;go(i+1);};
  $('cerSkip').onclick=e=>{e.stopPropagation();finish();};show('cer');go(0);return{F,next:()=>go(i+1),finish,later};}
};

/* ---------- التتويج بالبطولة: صافرة النهاية ← منصة التتويج ← لفة الشرف مع الجمهور ← أوضة اللبس ---------- */
function trophyFilm(o,then){const c=App.c;const k=o.k,Y=seasonYear(c),me=o.me!==false;const sk=c.skin||'#C68E64',hr=c.hair||'#1A1A1A';
 const starFig={k,skin:sk,hair:hr,num:o.num,hold:'cup'},label=lastName(c.name);
 const mates=i=>({k,num:o.nums?o.nums[i]:null});
 const nums=[1,4,5,2,3,o.num||9,8,6,7,10,11].map((v,i)=>v);
 const shots=[
 {c:'tr1',d:3600,h:`<div class="stadbg"></div>${crowdHTML(k)}<div class="flood a"></div><div class="flood b"></div>
   <div class="ttlk"><small>${esc(o.comp)} · ${Y}-${Y+1}</small><b>أبطال!</b><span>${esc(o.team)}</span></div>
   <div class="runin">${figRow(7,{x0:8,x1:92,y:6,h:40,anim:'jump',fig:{k},nums:[4,7,o.num,10,2,8,5],star:me?3:null,starAnim:'jump',starFig:{k,skin:sk,hair:hr,num:o.num},label})}</div>`,
  cue:(F,later)=>{SFX.whistle&&SFX.whistle(3);later(()=>{SFX.roar&&SFX.roar();FX.fireworks(6);},500);}},
 {c:'tr2',d:7200,lt:[o.team+' يرفع الكاس',o.comp+' — موسم '+Y+'-'+(Y+1)],h:`<div class="stadbg night"></div>${crowdHTML(k)}<div class="pyro l"></div><div class="pyro r"></div>
   <div class="stage"><div class="stban">${esc(o.comp)}<em>الأبطال ${Y}</em></div><div class="plat"></div></div>
   <div class="onstage">${figRow(9,{x0:14,x1:86,y:15,h:44,anim:i=>i===4?'':'huddle',fig:{k},nums:[1,3,4,5,o.num,7,8,10,11],star:4,starAnim:'lift',starFig:me?starFig:{k,num:10,hold:'cup'},label:me?label:'الكابتن'})}</div>
   ${tickerTape(70,[k[0],k[1],'#F5C542','#FFFFFF'])}`,
  cue:(F,later)=>{const st=F.querySelector('.tr2 .fw.star');later(()=>{drumRoll(1.6);},200);later(()=>{st&&st.classList.add('up');F.querySelector('.tr2').classList.add('boom');flashDom();SFX.roar&&SFX.roar();FX.confetti(260,[k[0],k[1],'#F5C542','#FFFFFF']);FX.fireworks(10);F.classList.add('shake');later(()=>F.classList.remove('shake'),400);},2000);later(()=>{SFX.chant&&SFX.chant();},3600);}},
 {c:'tr3',d:5200,lt:['لفة الشرف','اللاعيبة بيحتفلوا مع الجمهور'],h:`<div class="stadbg day"></div><div class="pan">${crowdHTML(k)}<div class="scarves">${Array.from({length:14},(_,i)=>`<i style="left:${i*7.2+1}%;--d:${(i*.17).toFixed(2)}s;background:repeating-linear-gradient(90deg,${k[0]} 0 10px,${k[1]} 10px 20px)"></i>`).join('')}</div></div>
   <div class="lap">${figRow(6,{x0:4,x1:70,y:5,h:50,anim:i=>i%2?'walk wave':'walk clapw',fig:{k},nums:[3,5,o.num,8,11,2],star:2,starAnim:'walk lifth',starFig:me?starFig:{k,num:7,hold:'cup'},label:me?label:''})}</div>`,
  cue:(F,later)=>{SFX.chant&&SFX.chant();later(()=>SFX.chant&&SFX.chant(),2400);}},
 {c:'tr4',d:6200,lt:['أوضة اللبس','الاحتفالات مكمّلة جوّه'],h:`<div class="locker" style="--c1:${k[0]};--c2:${k[1]}">${[2,4,5,7,o.num,8,10,11].map(n=>`<div class="lk"><div class="hook">${jerseySVG(k,'',n)}</div></div>`).join('')}</div><div class="bench"></div>
   <div class="dr">${figRow(7,{x0:10,x1:90,y:4,h:52,anim:i=>i===1||i===5?'spray':'huddle',fig:{k,bottle:true},nums:[4,10,o.num,7,2,8,5],star:2,starAnim:'lift',starFig:me?Object.assign({},starFig):{k,num:10,hold:'cup'},label:me?label:'',depth:.06})}</div>
   ${sprayHTML(18,'l')}${sprayHTML(18,'r')}<div class="selfie"></div>`,
  cue:(F,later)=>{const st=F.querySelector('.tr4 .fw.star');st&&st.classList.add('up');[700,1500,2600,3900].forEach(ms=>later(()=>{snapSnd();},ms));later(()=>{SFX.chant&&SFX.chant();},300);later(()=>FX.confetti(120,[k[0],k[1],'#FFFFFF']),900);}}];
 Film.run({k,shots,then,ltIcon:`<svg viewBox="0 -60 60 64" width="26" height="28">${cupSVG(0)}</svg>`,bug:'أنت المدرب TV · تتويج'});}

/* ---------- رجل الماتش بعد كل ماتش ---------- */
function motmFilm(o,then){const c=App.c;const k=o.k;const me=!!o.me;const sk=me?(c.skin||'#C68E64'):pick(FSKIN),hr=me?(c.hair||'#1A1A1A'):pick(FHAIR);
 const tiles=Array.from({length:24},(_,i)=>`<span>${i%3===2?esc(o.sponsor||'أنت المدرب'):i%3===1?'رجل المباراة':'⭐'}</span>`).join('');
 const shots=[{c:'mo1',d:5200,lt:[o.name,'رجل المباراة · '+o.match],h:`<div class="backdrop">${tiles}</div><div class="mospot"></div>
   <div class="mofig">${figRow(1,{x0:50,x1:50,y:6,h:66,anim:'',fig:{k},star:0,starAnim:'present',starFig:{k,skin:sk,hair:hr,num:o.num,hold:'mini'},label:''})}</div>
   <div class="mocard"><small>رجل المباراة</small><b>${esc(o.name)}</b><div class="mort"><span class="rtv" data-rt="${o.rt.toFixed(1)}">0.0</span><em>تقييم</em></div><div class="mochips">${o.g?`<span>⚽ ${o.g}</span>`:''}${o.a?`<span>🅰️ ${o.a}</span>`:''}<span>${esc(o.team)}</span></div></div>
   <div class="fls">${Array.from({length:7},(_,i)=>`<i style="left:${(i*29+7)%92}%;top:${(i*41+9)%70}%;animation-delay:${(.2+i*.31).toFixed(2)}s"></i>`).join('')}</div>`,
  cue:(F,later)=>{const el=F.querySelector('.rtv'),T=+el.dataset.rt;let v=0;const iv=setInterval(()=>{v=Math.min(T,v+T/26);el.textContent=v.toFixed(1);if(v>=T)clearInterval(iv);},34);later(()=>clearInterval(iv),3000);[300,800,1300,1900,2600].forEach(ms=>later(snapSnd,ms));if(me)later(()=>FX.confetti(90,[k[0],k[1],'#F5C542']),900);}}];
 Film.run({k,shots,then,ltIcon:'<span class="ltstar">★</span>',bug:'أنت المدرب TV · بعد الماتش'});}

/* ---------- الكرة الذهبية كل سنة: الحفل ← المرشحين ← الإعلان ← المؤتمر الصحفي ---------- */
function ballonFilm(o,then){const c=App.c;const Y=o.year;const top=o.top.slice(0,3);const W=top[0];const wMe=!!W.me;const sk=wMe?(c.skin||'#C68E64'):pick(FSKIN),hr=wMe?(c.hair||'#1A1A1A'):pick(FHAIR);
 const nm=x=>x.me?c.name:x.n;const card=(x,r)=>`<div class="nom r${r}"><em>#${r}</em><div class="nf">${flagHTML(x.cc)}</div><b>${esc(nm(x))}</b><small>${esc(x.club||(CBY[x.cc]||{}).n||'')}</small></div>`;
 const quote=wMe?pick(['الجايزة دي لكل واحد آمن بيا من أول يوم في الدرجة الرابعة.','حلمت باللحظة دي من وأنا صغير… وده لسه البداية.','شكراً لزمايلي والجهاز الفني… من غيرهم مكنتش هوصل هنا.']):pick(['دي ليلة مش هنساها أبداً، شكراً لزمايلي.','الجايزة دي بتاعة الفريق كله.','هكمّل أشتغل عشان أكسبها تاني السنة الجاية.']);
 const gold=['#F5C542','#FFF3C4','#FFFFFF','#C9A227'];
 const shots=[
 {c:'bo1',d:3800,h:`<div class="gala"></div><div class="chand">${[18,50,82].map(x=>`<i style="left:${x}%"></i>`).join('')}</div><div class="gspot a"></div><div class="gspot b"></div>
   <div class="gball"><svg viewBox="0 -40 60 44" width="100%" height="100%"><circle cx="30" cy="-20" r="17" fill="url(#gGold)" stroke="#a87b10" stroke-width="1"/><path d="M14 -24 Q30 -14 46 -24 M17 -10 Q30 -18 43 -10 M30 -37 Q24 -20 30 -3" fill="none" stroke="#a87b10" stroke-width="1" opacity=".7"/></svg></div>
   <div class="gttl"><small>حفل توزيع الجوائز · ${Y}</small><b>الكرة الذهبية</b></div>`,cue:(F,later)=>{SFX.crowd&&SFX.crowd(.12,1);}},
 {c:'bo2',d:4600,lt:['المرشحين','أفضل 3 لاعيبة في العالم الموسم ده'],h:`<div class="gala"></div><div class="noms">${card(top[2],3)}${card(top[1],2)}<div class="nom r1 hid"><em>؟</em><b>…</b></div></div>`,cue:(F,later)=>{[300,1300].forEach(ms=>later(snapSnd,ms));}},
 {c:'bo3',d:6400,hold:false,h:`<div class="gala"></div><div class="gspot a on"></div><div class="gspot b on"></div><div class="env"><div class="flap"></div><div class="paper2"><small>والفائز بالكرة الذهبية ${Y} هو…</small><b>${esc(nm(W))}</b><span>${flagHTML(W.cc)} ${esc((CBY[W.cc]||{}).n||'')}</span></div></div>
   <div class="wwalk">${figRow(1,{x0:50,x1:50,y:4,h:56,fig:{suit:true},star:0,starAnim:'walkin',starFig:{suit:true,skin:sk,hair:hr,hold:'ball'},label:''})}</div>${tickerTape(50,gold)}`,
  cue:(F,later)=>{drumRoll(2);later(()=>{F.querySelector('.bo3').classList.add('open');flashDom();SFX.roar&&SFX.roar();},2100);later(()=>{F.querySelector('.bo3').classList.add('walk');FX.confetti(wMe?300:140,gold);if(wMe)FX.fireworks(10);},2900);later(()=>{const s=F.querySelector('.bo3 .fw.star');s&&s.classList.add('up');},4700);}},
 {c:'bo4',d:6800,lt:[nm(W),'المؤتمر الصحفي بعد التتويج'],h:`<div class="pressbg">${Array.from({length:24},(_,i)=>`<span>${i%2?'الكرة الذهبية':Y}</span>`).join('')}</div>
   <div class="ptable"><div class="mics">${[0,1,2,3,4].map(i=>`<i style="--r:${(i-2)*9}deg"></i>`).join('')}</div></div>
   <div class="pfig">${figRow(1,{x0:50,x1:50,y:18,h:52,fig:{suit:true},star:0,starAnim:'talk',starFig:{suit:true,skin:sk,hair:hr},label:''})}</div>
   <div class="gball sm"><svg viewBox="0 -40 60 44" width="100%" height="100%"><circle cx="30" cy="-20" r="17" fill="url(#gGold)"/></svg></div>
   <div class="subt" data-q="«${esc(quote)}»"></div><div class="fls">${Array.from({length:8},(_,i)=>`<i style="left:${(i*23+5)%92}%;top:${(i*37+12)%60}%;animation-delay:${(i*.29).toFixed(2)}s"></i>`).join('')}</div>`,
  cue:(F,later)=>{const el=F.querySelector('.bo4 .subt'),q=el.dataset.q;let j=0;const iv=setInterval(()=>{j++;el.textContent=q.slice(0,j);if(j>=q.length)clearInterval(iv);},38);later(()=>clearInterval(iv),6500);[200,700,1100,1800,2600,3400].forEach(ms=>later(snapSnd,ms));}}];
 Film.run({k:['#C9A227','#14161c'],shots,then,ltIcon:'<span class="ltstar">●</span>',bug:'أنت المدرب TV · الكرة الذهبية'});}

/* ---------- المؤتمر الصحفي بعد الماتش (خلفية متحركة للشاشة) ---------- */
function pressRoomHTML(k,c){return`<div class="prroom" style="--c1:${k[0]};--c2:${k[1]}"><div class="pressbg">${Array.from({length:24},(_,i)=>`<span>${i%2?esc(c.club.short||shortOf(c.club.name)):'مسيرة نجم'}</span>`).join('')}</div>
 <div class="pfig">${figRow(1,{x0:50,x1:50,y:16,h:50,fig:{k},star:0,starAnim:'talk',starFig:{k,skin:c.skin,hair:c.hair,num:c.num},label:''})}</div><div class="ptable"><div class="mics">${[0,1,2,3,4].map(i=>`<i style="--r:${(i-2)*9}deg"></i>`).join('')}</div></div>
 <div class="fls">${Array.from({length:6},(_,i)=>`<i style="left:${(i*31+5)%92}%;top:${(i*37+12)%60}%;animation-delay:${(i*.53).toFixed(2)}s"></i>`).join('')}</div></div>`;}
