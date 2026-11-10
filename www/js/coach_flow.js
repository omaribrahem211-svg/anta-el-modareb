// أنت المدرب — مسار المدرب: إنشاء المسيرة، الهب، الماتش، نهاية الموسم، العروض
'use strict';
const FKEYS=Object.keys(FORMS);
/* ---------- الشاشة الرئيسية ---------- */
(function(){const h=document.querySelector('#scr-title .brand');if(h)h.innerHTML='أنت <span>المدرب</span>';
 const tg=document.querySelector('#scr-title .tag');if(tg)tg.textContent='من دكة الدرجة الرابعة لمنصة أبطال العالم';
 document.title='أنت المدرب';const b=$('mNew');if(b)b.textContent='مسيرة مدرب جديدة';
 const tabs={player:'الفريق',life:'النادي',career:'مسيرتي'};document.querySelectorAll('#cmTabs button').forEach(x=>{if(tabs[x.dataset.t])x.textContent=tabs[x.dataset.t];});})();
renderTitle=(function(o){return function(){o();const c=App.c;if(c&&c.coachMode){const el=$('mContSub');if(el)el.textContent=c.name+' · '+c.club.name+' · '+c.tierShort;}};})(renderTitle);

/* ---------- إنشاء المسيرة ---------- */
Object.assign(NEW,{step:1,name:'',nat:'EG',start:'EG',clubs:null,club:null});
const CLUB_TAGS=[['فريق قوي','جمهور كبير وطموح الصعود'],['ميزانية كبيرة','ممكن تشتري لاعيبة'],['فريق متوازن','هدف: مركز في النص'],['مشروع شباب','لاعيبة صغيرة وصبر'],['فريق متواضع','التحدي الأكبر'],['فريق عادي','بداية هادية']];
renderCreate=function(){const s=NEW.step;$('crSteps').innerHTML=[1,2].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('');
 $('crT').textContent=['','مين المدرب؟','اختار فريقك'][s];$('crNext').textContent=s===2?'ابدأ المسيرة':'التالي';const B=$('crBody');
 if(s===1){B.innerHTML=`<div class="field"><label for="cName">اسم المدرب</label><input id="cName" maxlength="24" dir="auto" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(NEW.name)}" placeholder="اكتب اسمك"></div><div class="field"><label>الدوري اللي هتبدأ منه (كل الدوريات بتبدأ من الدرجة الرابعة)</label><div class="cgrid">${COUNTRIES.map(C=>`<button class="cbtn ${NEW.start===C.c?'on':''}" data-n="${C.c}">${flagHTML(C.c)}${C.n}</button>`).join('')}</div></div>`;
  $('cName').oninput=e=>{NEW.name=e.target.value;sideCard();};B.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{NEW.nat=NEW.start=b.dataset.n;NEW.clubs=null;NEW.club=null;renderCreate();});}
 if(s===2){const ti=tierInfo({home:NEW.start,tier:0,abroad:{}},0);if(!NEW.clubs||NEW.clubs.cc!==NEW.start){const used=new Set();NEW.clubs=genClubs(NEW.start,6,ti.base,used,2);NEW.clubs.forEach((t,i)=>{t.bud=[1.15,1.5,1,.85,.7,1][i];t.fan=[62,50,48,40,36,44][i];});NEW.clubs.cc=NEW.start;NEW.club=null;}
  B.innerHTML=`<div class="field"><label>${esc(ti.name)} — الفرق المعروضة عليك (الإدارة اختارتك بسبب الطموح)</label><div class="clubs">${NEW.clubs.map((t,i)=>`<button class="clubc ${NEW.club===i?'on':''}" data-k="${i}">${crestHTML(t,'s')}<span>${esc(t.name)}</span><span class="sub">تقييم ${t.R} · ${CLUB_TAGS[i][0]} · ${CLUB_TAGS[i][1]}</span></button>`).join('')}</div></div>`;
  B.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{NEW.club=+b.dataset.k;renderCreate();});}
 sideCard();};
sideCard=function(){const cl=NEW.club!==null&&NEW.clubs?NEW.clubs[NEW.club]:null;const C=CBY[NEW.nat];$('crCard').innerHTML=`<div style="padding:14px;text-align:center"><div class="sub">مدرب</div><div class="ttl" style="font-size:24px">${esc(NEW.name.trim()||'اسمك هنا')}</div><div style="margin:8px 0">${flagHTML(NEW.nat)} ${esc(C?C.n:'')}</div>${cl?crestHTML(cl)+`<div class="tname">${esc(cl.name)}</div><div class="sub">تقييم ${cl.R} · ${CLUB_TAGS[NEW.club][0]}</div>`:'<div class="sub">لسه ماختارتش فريق</div>'}</div>`;};
$('crBack').onclick=()=>{if(NEW.step>1){NEW.step--;renderCreate();}else show('title');};
$('crNext').onclick=()=>{if(NEW.step===1&&!NEW.name.trim()){toast('اكتب اسمك الأول');return;}
 if(NEW.step<2){NEW.step++;renderCreate();return;}if(NEW.club===null){toast('اختار الفريق');return;}
 const cl=NEW.clubs[NEW.club];const club={name:cl.name,short:cl.short,kit:cl.kit,cc:NEW.start,R:cl.R,bonus:cl.bud>=1.4?3:cl.bud>=1.1?1:0};
 App.c=newCoachCareer({name:NEW.name.trim().replace(/\s+/g,' '),nat:NEW.nat,start:NEW.start,club,fan:cl.fan});store();
 showSign(club,'أول عقد كمدرب!','عقد 3 مواسم · هدفك: '+App.c.obj[0].n,()=>show('hub'));};
function newCoachCareer(o){const c=newCareer({name:o.name,nat:o.nat,pos:'CM',num:10,skin:SKINS[1],hair:HAIRS[0],start:o.start,club:o.club});
 Object.assign(c,{coachMode:true,age:40,board:60,rep:8,fans:o.fan||45,followers:900,morale:62,cl:null,mk:null,guest:null,events:[],fac:{train:0,youth:0,stad:0,med:0},inbox:[],feed:[],news:[]});
 c.contract={wage:0,years:3};c.money=startBudget(c,o.club.bonus);c.sponsor=sponsorPerMatch(c);
 mySquad(c);lineup(c);updR(c);makeObjectives(c);
 mail(c,'club','إدارة '+c.club.name,'أهلاً بيك يا كابتن','الإدارة اختارتك لقيادة الفريق. الهدف: '+c.obj[0].n+'. الميزانية '+money(c.money)+' لتدعيم الفريق، وسوق الانتقالات مفتوح من تبويب «النادي».');
 mail(c,'coach','مساعدك — كابتن هشام','التشكيلة والخطة','راجع التشكيلة من تبويب «الفريق» قبل أول ماتش. غيّر الخطة والتكتيك زي ما تحب، وأنا هنبهك لو في لاعب تعبان أو مصاب.');
 addNews(c,'me',c.name+' يتولى تدريب '+c.club.name+' في '+c.tierShort,true);return c;}
/* ---------- أهداف الموسم ---------- */
const _mo=makeObjectives;makeObjectives=function(c){if(!c.coachMode)return _mo(c);const lg=c.league,N=lg.teams.length;const rk=lg.teams.slice().sort((a,b)=>b.R-a.R).findIndex(t=>t.me)+1;const dom=curTier(c).domestic;
 const promo=dom&&c.path.tier<3&&rk<=Math.max(3,Math.round(N*.3));const t=promo?2:Math.max(1,Math.ceil(rk*.8));const pts=Math.round(lg.rounds.length*(promo?1.9:t<=N/3?1.7:t<=N/2?1.35:1.1));
 c.obj=[{k:'pos',n:promo?'الصعود (أول اتنين)':t===1?'المنافسة على اللقب':'خلّص في أول '+t,t},{k:'pts',n:'اجمع '+pts+' نقطة',t:pts},{k:'cup',n:'وصّل الكأس للدور التاني',t:1}];};
const _op=objProg;objProg=function(c,o){if(!c.coachMode)return _op(c,o);const tb=sortTable(c.league),pos=tb.findIndex(x=>x.me)+1,me=tb[pos-1];
 if(o.k==='pos')return[pos,pos<=o.t&&c.league.md>0];if(o.k==='pts')return[me.Pts,me.Pts>=o.t];if(o.k==='cup'){const r=c.cup?(c.cup.won?99:c.cup.round):0;return[r,r>=o.t];}return[c.board,c.board>=(o.t||50)];};
const _bs=buildSeason;buildSeason=function(c){_bs(c);if(c.coachMode){try{mySquad(c);updR(c);if(c.cup&&c.cup.teams&&c.cup.teams[0])c.cup.teams[0].R=c.league.teams[0].R;}catch(e){console.warn(e);}}};
/* ---------- الشريط والهب ---------- */
renderShell=function(id){const c=App.c;$('cmCrest').innerHTML=crestHTML(c.club,'s');$('cmName').textContent=c.club.name;$('cmTier').textContent=c.tierName+' · الموسم '+c.season+' · ثقة الإدارة '+Math.round(c.board)+'%';$('cmMoney').textContent=money(c.money);
 document.querySelectorAll('#cmTabs button').forEach(b=>{b.classList.toggle('on',b.dataset.t===id);b.onclick=()=>show(b.dataset.t);});const un=c.inbox.filter(m=>!m.read).length+((c.events||[]).filter(e=>!e.done).length);const bd=$('cmBadge');bd.textContent=un||'';bd.classList.toggle('on',un>0);
 const f=c.sched[c.si];if(f){const info=fixInfo(c,f);$('cmAdvS').textContent=info.short+' ضد '+info.opp.name;}else $('cmAdvS').textContent='نهاية الموسم';};
renderHub=function(){const c=App.c;if(!c)return show('title');if(!c.coachMode)return show('title');if(c.league&&!c.league.N){wInit(c);buildSeason(c);store();}
 const days=[];for(let i=c.si;i<c.sched.length&&days.length<8;i++){const f=c.sched[i];if(!fixValid(c,f)&&i!==c.si)continue;const info=fixInfo(c,f);days.push(`<div class="cday ${i===c.si?'now':''}"><span class="k ${f.t}">${info.short}</span><span>${esc(info.opp.short||info.opp.name)}</span><small>${f.d?dTxt(f.d):''}</small></div>`);}
 $('hLine').innerHTML=days.join('')||'<div class="cday now"><span>نهاية الموسم</span></div>';const f=c.sched[c.si];updR(c);
 if(f){const info=fixInfo(c,f);const L=lineup(c);$('tNext').innerHTML=`<span class="lbl">${f.d?dTxt(f.d,true)+' · ':''}${esc(info.comp)} · ${esc(info.label)}${info.home===false?' · برّه':info.home?' · على ملعبنا':''}</span><div class="vs"><div>${crestHTML(c.club)}<div class="tname">${esc(c.club.name)}</div><div class="sub" style="text-align:center">${c.league.teams[0].R}</div></div><div class="vsx">VS</div><div>${crestHTML(info.opp)}<div class="tname">${esc(info.opp.name)}</div><div class="sub" style="text-align:center">${info.opp.R}</div></div></div><span class="sm">خطتك ${L.form} · ${esc(TACTICS[L.tac].n)}${mySquad(c).some(p=>p.inj)?' · '+mySquad(c).filter(p=>p.inj).length+' مصاب':''}${c.guest?' · نجم معار: '+esc(c.guest.n):''}</span>`;}
 else $('tNext').innerHTML=`<span class="lbl">الموسم خلص</span><span class="big">دوس «كمّل» تشوف نتيجة الموسم والعروض</span>`;
 $('tObj').innerHTML=`<span class="lbl">أهداف الموسم من الإدارة</span>`+(c.obj||[]).map(o=>{const [v,ok]=objProg(c,o);const pct=o.k==='pos'?(ok?100:clamp((c.league.N+1-v)/(c.league.N+1-o.t)*100,5,95)):clamp(v/o.t*100,0,100);return`<div class="objrow ${ok?'done':''}"><span>${esc(o.n)}</span><b style="text-align:left">${o.k==='pos'?'#'+v:o.k==='cup'?(ok?'تم':c.cup&&c.cup.alive?'شغّال':'خرجنا'):Math.round(v)+(o.k==='fit'?'%':'/'+o.t)}</b><div class="bar"><i style="width:${pct}%;${ok?'':'background:var(--blue)'}"></i></div></div>`;}).join('');
 const S=mySquad(c),inj=S.filter(p=>p.inj).length;$('tPlayer').innerHTML=`<span class="lbl">فريقك</span><div class="row" style="justify-content:space-between"><span class="big" style="font-size:clamp(28px,7vh,44px)">${c.league.teams[0].R}</span><span class="sm" style="text-align:left">${lineup(c).form}<br>${inj?inj+' مصاب':'مفيش مصابين'}</span></div><div class="row"><span class="sm" style="width:58px">المعنويات</span><div class="bar"><i style="width:${c.morale}%"></i></div></div><div class="row"><span class="sm" style="width:58px">الإدارة</span><div class="bar"><i style="width:${c.board}%;background:var(--blue)"></i></div></div><div class="row"><span class="sm" style="width:58px">اللياقة</span><div class="bar"><i style="width:${squadAvgFit(c)}%;background:var(--gold)"></i></div></div>`;
 wInit(c);const news=[];const NK={me:'فريقك',league:'الدوري',transfer:'انتقالات',world:'العالم'};const pend=(c.events||[]).filter(e=>!e.done).length;if(pend)news.push(`<div class="newsi" style="color:var(--gold)"><b>قرار مطلوب:</b> عندك ${pend} موقف محتاج رد (تبويب الأخبار)</div>`);
 c.news.slice(0,3).forEach(n=>news.push(`<div class="newsi"><b>${NK[n.k]||''}:</b> ${esc(n.txt)}</div>`));c.inbox.filter(m=>!m.read).slice(0,1).forEach(m=>news.push(`<div class="newsi"><b>${esc(m.from.split(' ')[0])}:</b> ${esc(m.title)}</div>`));
 $('tNews').innerHTML=`<span class="lbl">آخر الأخبار · الميزانية ${money(c.money)}</span>`+news.join('');
 const tb=sortTable(c.league),pos=tb.findIndex(t=>t.me)+1;const st=Math.max(0,Math.min(pos-3,tb.length-5));
 $('tTable').innerHTML=`<span class="lbl">${esc(c.tierShort)} · المركز ${pos}</span><table class="mini">${tb.slice(st,st+5).map((t,i)=>`<tr class="${t.me?'me':''}"><td>${st+i+1}</td><td>${esc(t.name)}</td><td style="text-align:left">${t.Pts}</td></tr>`).join('')}</table><span class="sm">${esc(c.cup.name)}: ${c.cup.won?'أبطال':c.cup.alive?c.cup.rn[c.cup.round]:'خرجنا'}${c.cont?' · '+esc(c.cont.name)+': '+(c.cont.won?'أبطال':!c.cont.alive?'خرجنا':c.cont.phase==='g'?'الدور الأول':c.cont.ko[c.cont.kr][0]):''}</span>`;
 if(window.Media&&Media.hubHook)Media.hubHook(c);};
/* ---------- قبل الماتش ---------- */
const _openPre=openPre;openPre=function(){const c=App.c;if(!c||!c.coachMode)return _openPre();const f=c.sched[c.si];if(!f)return seasonEnd();
 const info=fixInfo(c,f);const L=lineup(c);updR(c);const myR=c.league.teams[0].R;const S=mySquad(c);
 $('preT').textContent=info.comp+' · '+info.label;$('preS').textContent=info.big?'ماتش كبير — الكل مستني تشكيلتك':'مدرب '+c.club.name;
 $('preVs').innerHTML=`<div>${crestHTML(c.club)}<div class="tname">${esc(c.club.name)}</div><div class="sub" style="text-align:center">تقييم ${myR}</div></div><div class="vsx">VS</div><div>${crestHTML(info.opp)}<div class="tname">${esc(info.opp.name)}</div><div class="sub" style="text-align:center">تقييم ${info.opp.R}</div></div>`;
 c.wx=c.wx&&c.wx.si===c.si?c.wx:{si:c.si,rain:Math.random()<.2};if(!f.oppTac)f.oppTac=oppTac(info.opp.R,myR,c.si);
 const tired=xiOf(c).filter(p=>p.fit<50),inj=S.filter(p=>p.inj);
 $('preInfo').innerHTML=`<span class="pill">معنويات ${c.morale}%</span><span class="pill">لياقة ${chemNote(c)}%</span><span class="pill">${c.wx.rain?'مطر':'جو صافي'}</span>${inj.length?`<span class="pill warn">${inj.length} مصاب</span>`:''}${tired.length?`<span class="pill warn">${tired.length} تعبان في التشكيلة</span>`:''}`;
 const oc=$('preCtl');if(oc)oc.remove();const old=$('preRow');if(old)old.remove();
 const oppS=info.nat?[]:getSquad(c,Object.assign({cc:curTier(c).country},info.opp)).slice().sort((a,b)=>b.ov-a.ov).slice(0,3);
 const diff=info.opp.R-myR;const tip=diff>=4?'الخصم أقوى مننا: جرّب «دفاع ومرتدات» وكمّل بدفاع منظم.':diff<=-4?'إحنا الأقوى: الضغط العالي أو الاستحواذ هيريّحونا.':'الماتش متكافئ: التوازن أحسن، وبدّل بدري لو حد تعب.';
 const xi=xiOf(c);$('preInfo').insertAdjacentHTML('afterend',`<div class="prerow" id="preRow"><div class="instbox"><h4>تشكيلتك</h4><div>الخطة <b>${L.form}</b> · التكتيك <b>${esc(TACTICS[L.tac].n)}</b></div><div class="sub">${xi.map(p=>esc(lastName(p.n))).join(' · ')}</div><button class="btn sm ghost" id="preEdit">عدّل التشكيلة والخطة</button></div>
  <div class="instbox"><h4>كشف الخصم</h4><div>يلعب غالباً: <b>${esc(TACTICS[f.oppTac].n)}</b></div><div class="sub">${oppS.length?'أخطر لاعيبته: '+oppS.map(p=>esc(lastName(p.n))+' ('+p.ov+')').join('، '):'منتخب أو فريق غير معروف'}</div><div class="sub" style="color:var(--acc)">نصيحة المساعد: ${tip}</div></div>
  <div class="instbox" id="preGuest"></div></div>`);
 $('preEdit').onclick=()=>{App.returnTo='pre';show('player');};
 if(window.Media)Media.guestCard($('preGuest'),c);
 $('preGo').classList.remove('hidden');$('preGo').textContent='ابدأ الماتش';$('preSim').textContent=Ads.ready?'تخطّى الماتش (إعلان · نتيجة تلقائية)':'تخطّى الماتش (نتيجة تلقائية)';
 $('preBack').onclick=()=>show('hub');$('preGo').onclick=()=>startFix(false);
 $('preSim').onclick=async()=>{if(!Ads.ready)return startFix(true);const b=$('preSim');b.disabled=true;const t0=b.textContent;b.textContent='بيحمّل الإعلان…';const r=await Ads.reward();b.disabled=false;b.textContent=t0;if(r==='cancel'){toast('لازم تكمّل الإعلان للآخر عشان تتخطى الماتش');return;}if(r==='na')toast('مفيش إعلان متاح دلوقتي، اتخطّى المرة دي ببلاش');startFix(true);};
 App.quick=false;show('pre');};
/* ---------- الماتش ---------- */
function coachScorer(c,mine,club){const pool=mine?xiOf(c):squadDef(c,Object.assign({cc:curTier(c).country},club)).slice(0,11);const W={FW:5,MF:2.4,DF:.7,GK:0};let t=0;for(const p of pool)t+=(W[p.r]||1)*(p.ov||60);let x=Math.random()*t;for(const p of pool){x-=(W[p.r]||1)*(p.ov||60);if(x<=0)return p.n||p.name;}return(pool[0]||{n:'لاعب'}).n;}
const _sf=startFix;startFix=function(sim){const c=App.c;if(!c||!c.coachMode)return _sf(sim);const f=c.sched[c.si],info=fixInfo(c,f);const home=coachHomeDef(c,info);
 const away=Object.assign({},info.opp,{tac:f.oppTac||(f.oppTac=oppTac(info.opp.R,home.R,c.si)),form:f.oppForm||(f.oppForm=pick(FKEYS)),sqBoost:App.settings.diff,sq:info.nat?null:getSquad(c,Object.assign({cc:curTier(c).country},info.opp)),R:Math.round(info.opp.R+(+App.settings.diff>0?3:+App.settings.diff<0?-3:0)),nm:info.opp.nm||(info.opp.cc?CBY[info.opp.cc].nm:CBY[curTier(c).country].nm)});
 if(sim){const s=simScore(home.R,away.R);const ev=[];for(let i=0;i<s[0];i++)ev.push({type:'goal',team:0,min:RI(1,90),name:coachScorer(c,true)});for(let i=0;i<s[1];i++)ev.push({type:'goal',team:1,min:RI(1,90),name:coachScorer(c,false,info.opp)});ev.sort((a,b)=>a.min-b.min);
  return finishFix({score:s,events:ev,star:null,inj:false,poss:RI(42,58),shots:[RI(5,14),RI(5,14)]},true,false);}
 App.coach=true;document.body.classList.add('coachmode');App.quick=false;
 const m=new Match({home,away,human:null,coach:true,halfLen:App.settings.halfLen,intro:false,comp:info.comp+' · '+info.label,weather:c.wx&&c.wx.rain?'rain':'clear',onEvent:(t,d,mm)=>{matchEvent(t,d,mm);window.Board&&Board.ev(t,d,mm||m);},
  onEnd:r=>{App.coach=false;document.body.classList.remove('coachmode');window.Board&&Board.stop();finishFix(r,false,false);}});
 beginMatch(m,info,home,away);window.Board&&Board.start(m);};
/* ---------- بعد الماتش ---------- */
const _fin=finishFix;finishFix=function(r,simmed,absent){const c=App.c;if(!c||!c.coachMode)return _fin(r,simmed,absent);
 const f=c.sched[c.si],info=fixInfo(c,f);const res=Math.sign(r.score[0]-r.score[1]);const pre={money:c.money,morale:c.morale,fans:c.fans,board:c.board};c.sponsor=sponsorPerMatch(c);
 const films=App.settings.films;App.settings.films=0;App._skipped=false;const rr=Object.assign({},r,{star:null,inj:false});
 try{_fin(rr,simmed,true);}finally{App.settings.films=films;}
 try{coachPost(c,r,f,info,simmed,res,pre);}catch(e){console.error(e);}};
function coachPost(c,r,f,info,simmed,res,pre){const home=info.home!==false;c.morale=clamp(c.morale+2,0,100);
 const gate=gateIncome(c,home),wages=wageBill(c);c.money+=gate-wages;const income=gate+(c.sponsor||0);
 const strong=info.opp.R-c.league.teams[0].R;let bd=res>0?3+(strong>=3?2:0):res<0?-3-(strong<=-3?2:0):(strong>=3?1:0);if(info.big)bd*=1.3;c.board=clamp(c.board+bd,0,100);c.rep=clamp((c.rep||0)+(res>0?.6:res<0?-.2:.1)+(strong>=3&&res>0?.8:0),0,100);
 if(simmed)for(const e of r.events||[])if(e.team===0&&e.type==='goal'){const p=mySquad(c).find(q=>q.n===e.name);if(p)p.cs.g++;}
 const inj=afterMatchSquad(c,r,true);if(c.guest){addNews(c,'me',c.guest.n+' يخوض مباراته الوحيدة مع '+c.club.name+' ثم يغادر');c.guest=null;}
 inj.forEach(p=>{addNews(c,'me','إصابة '+p.n+' — غايب '+p.inj+' ماتش');mail(c,'medical','الجهاز الطبي','إصابة '+p.n,p.n+' (رقم '+ROLE_AR[p.r]+') اتصاب في الماتش وهيغيب '+p.inj+' ماتش تقريباً.');});
 if(c.cl&&c.cl.auto)autoPick(c);else autoPick(c,true);updR(c);
 let best=null;if(r.pl&&r.pl.length){const t=res;for(const p of r.pl){if(p.ti!==0)continue;const v=rate(p.st,t);if(!best||v>best.v)best={v,p};}}
 else{const g={};for(const e of r.events||[])if(e.team===0&&e.type==='goal')g[e.name]=(g[e.name]||0)+1;const k=Object.keys(g).sort((a,b)=>g[b]-g[a])[0];if(k)best={v:7+g[k]*.6,p:{n:k,st:{g:g[k],a:0}}};}
 const keep=[...$('poStats').querySelectorAll('.news')].map(n=>n.textContent);
 const d=(a,b)=>{const v=Math.round(a-b);return v?`<b style="color:${v>0?'var(--acc)':'var(--red)'}">${v>0?'+':''}${v}</b>`:'<b>0</b>';};
 $('poStats').innerHTML=`<div class="ttl" style="font-size:22px">${res>0?'فوز مهم':res<0?'خسارة':'تعادل'}${simmed?' · نتيجة تلقائية':''}</div>
  <div class="statg"><div><b>${money(income)}</b><span>إيراد (تذاكر+رعاية)</span></div><div><b>${money(wages)}</b><span>رواتب اللاعيبة</span></div><div><b style="color:${gate+(c.sponsor||0)-wages>=0?'var(--acc)':'var(--red)'}">${money(gate+(c.sponsor||0)-wages)}</b><span>صافي الماتش</span></div></div>
  <div class="statg"><div>${d(c.board,pre.board)}<span>ثقة الإدارة (${Math.round(c.board)}%)</span></div><div>${d(c.morale,pre.morale)}<span>المعنويات (${c.morale}%)</span></div><div>${d(c.fans,pre.fans)}<span>الجمهور (${c.fans}%)</span></div></div>
  ${best?`<div class="news">رجل الماتش: ${esc(best.p.n)}${best.p.st&&best.p.st.g?' — '+best.p.st.g+' هدف':''}</div>`:''}
  ${inj.map(p=>`<div class="news" style="border-color:var(--red)">إصابة ${esc(p.n)} — يغيب ${p.inj} ماتش</div>`).join('')}
  ${xiOf(c).filter(p=>p.fit<45).slice(0,3).map(p=>`<div class="news">${esc(p.n)} تعبان (${p.fit}%) — فكّر تريّحه</div>`).join('')}
  ${keep.map(n=>`<div class="news">${esc(n)}</div>`).join('')}
  ${Ads.ready?'<div class="row" style="gap:8px;margin-top:8px"><button class="btn sm gold" id="poAd2">إعلان قصير ← ضاعف إيراد الماتش</button><button class="btn sm gold" id="poAdHeal">إعلان قصير ← علاج المصابين ورفع اللياقة</button></div>':''}`;
 const ad=(id,fn,msg)=>{const b=$(id);if(!b)return;b.onclick=async()=>{b.disabled=true;const t0=b.textContent;b.textContent='بيحمّل الإعلان…';const x=await Ads.reward();if(x==='ok'){fn();store();toast(msg);b.remove();}else{b.disabled=false;b.textContent=t0;toast(x==='cancel'?'لازم تكمّل الإعلان للآخر':'مفيش إعلان متاح دلوقتي');}};};
 ad('poAd2',()=>{c.money+=income;},'الإيراد اتضاعف');ad('poAdHeal',()=>{mySquad(c).forEach(p=>{p.inj=0;p.fit=Math.min(100,p.fit+30);});updR(c);},'الفريق اتعالج وارتاح');
 if(window.Media)Media.afterMatch(c,r,res,info,best);store();}
/* ---------- نهاية الموسم ---------- */
const _ps=processSeason;processSeason=function(c){if(!c.coachMode)return _ps(c);seasonWrap(c);try{worldSeason(c);}catch(e){console.warn(e);}
 const lg=c.league,tb=sortTable(lg),pos=tb.findIndex(t=>t.me)+1,T=curTier(c);let objDone=0;(c.obj||[]).forEach(x=>{if(objProg(c,x)[1])objDone++;});
 const nObj=(c.obj||[]).length||1;const prize=Math.round(tsOf(c)*(6*(lg.teams.length-pos+1)/lg.teams.length+(pos===1?8:0)));c.money+=prize;c.board=clamp(c.board+objDone*5-(nObj-objDone)*4,0,100);
 const won=[];if(pos===1){c.trophies.push({n:'بطولة '+c.tierName,s:c.season,k:'L'});won.push('أبطال الدوري!');addNews(c,'me',c.club.name+' بطل '+c.tierName+'!',true);}else addNews(c,'league',tb[0].name+' بطل '+c.tierName+' الموسم '+c.season);
 const la=lgAwards(c,tb);la.forEach(a=>{if(!a.w.me)addNews(c,'league',a.w.n+' ('+a.w.club+') يفوز بجائزة '+a.n+' — '+a.v);});
 const me=tb[pos-1];c.history.push({s:c.season,club:c.club.name,pos,pts:me.Pts,W:me.Wn,D:me.D,L:me.Ls,GF:me.GF,GA:me.GA,tier:c.path.tier,obj:objDone+'/'+nObj});
 const dom=T.domestic;let move=0,relA=false;const dnN=relegN(c,c.path.tier);if(dom&&c.path.tier<3&&pos<=relegN(c,c.path.tier+1))move=1;if(dom&&c.path.tier>0&&pos>tb.length-dnN)move=-1;if(!dom&&pos>tb.length-dnN){relA=true;addNews(c,'me','صدمة: '+c.club.name+' يهبط من '+c.tierName);}
 const mv=settleLeague(c,tb);if(mv.up.length)addNews(c,'league','صعود: '+mv.up.join(' و')+' للدرجة الأعلى');if(mv.down.length)addNews(c,'league','هبوط: '+mv.down.join(' و')+(dom?' للدرجة الأقل':' يودّعوا الدوري'));
 if(move>0){addNews(c,'me',c.club.name+' يصعد رسمياً إلى '+tierInfo(c.path,c.path.tier+1).short+'!',true);c.rep=clamp(c.rep+6,0,100);won.push('الصعود للدرجة الأعلى');}if(move<0)addNews(c,'me','صدمة: '+c.club.name+' يهبط إلى '+tierInfo(c.path,c.path.tier-1).short);
 c.rep=clamp(c.rep+objDone*2.5+(pos===1?5:0)+(c.cup&&c.cup.won?3:0)-(move<0||relA?5:0),0,100);
 c.contQ=(c.path.tier>=3||!dom)?(pos<=(BIG5.includes(T.country)?4:2)?1:pos<=(BIG5.includes(T.country)?6:3)?2:0):0;if(c.cup&&c.cup.won&&!c.contQ&&c.path.tier>=2)c.contQ=2;
 c.age++;c.contract.years--;ageStars(c);const youth=youthIntake(c);youth.forEach(y=>addNews(c,'me','الأكاديمية تطلّع الموهبة '+y.n+' ('+y.age+' سنة، تقييم '+y.ov+')'));
 let stayTier=Math.max(0,c.path.tier+move);if(relA){stayTier=c.path.tier-1;c.path.abroad[stayTier]=T.country;}const sacked=c.board<20;const renew=c.contract.years<=0&&!sacked;
 const offers=coachOffers(c,stayTier,sacked,objDone/nObj);offers.forEach(f=>addNews(c,'transfer',f.club.name+' ('+f.tierName+') يعرض على '+c.name+' تدريب الفريق'));
 if(sacked)addNews(c,'me','الإدارة تقرر إقالة '+c.name+' بعد تراجع الثقة',true);
 c.seInfo={pos,move,relA,objDone,nObj,prize,won,la:la.map(a=>({n:a.n,w:a.w.n,club:a.w.club,v:a.v,me:false})),offers,stayTier,renew,sacked,youth:youth.map(y=>y.n),newSal:Math.round(tsOf(c)*.4*(1+c.rep/60)),bTop:null,ballon:false,race:null,spG:0,shownLT:0,shownBF:1,shownAw:0};};
function coachOffers(c,stayTier,sacked,perf){const out=[];const mk=(tier,why)=>{const{ti,cl}=clubFor(c,tier);return{tier,abroad:ti.country,club:{name:cl.name,short:cl.short,kit:cl.kit,kitArr:cl.kitArr,cc:ti.country,real:cl.real,R:cl.R},clubR:cl.R,wage:Math.round(tsOf(c)*.4*(1+c.rep/60)*(1+(tier-stayTier)*.3)),years:RI(2,4),tierName:ti.name,role:'مدرب الفريق الأول',fee:0,why};};
 const gate=t=>t*12<=c.rep+30;
 if(sacked){out.push(mk(Math.max(0,stayTier-1),'بعد الإقالة'));if(stayTier>0&&Math.random()<.5)out.push(mk(Math.max(0,stayTier-1),'فرصة جديدة'));return out;}
 if(stayTier<7&&gate(stayTier+1)&&Math.random()<clamp(.2+perf*.55+c.rep/250,.1,.9))out.push(mk(stayTier+1,'خطوة لقدام'));
 if(stayTier<6&&gate(stayTier+2)&&perf>=.75&&Math.random()<.35)out.push(mk(stayTier+2,'قفزة كبيرة'));
 if(perf>=.5&&Math.random()<.4)out.push(mk(stayTier,'مرتب أعلى'));
 return out.slice(0,3);}
const _ss=seasonScreen;seasonScreen=function(c){if(!c.coachMode)return _ss(c);const I=c.seInfo;const T=tierInfo(c.path,I.stayTier);
 $('seT').textContent='نهاية الموسم '+c.season;$('seS').textContent=c.tierName+' · المركز '+I.pos;
 $('seSum').innerHTML=`<div class="big-score" style="font-size:clamp(40px,12vh,70px)">#${I.pos}</div><div class="ttl" style="font-size:20px">${I.sacked?'الإدارة قررت إقالتك':I.move>0?'الفريق صعد إلى '+tierInfo(c.path,c.path.tier+1).short+'!':I.move<0||I.relA?'الفريق هبط…':'الموسم خلص'}</div><div class="sub">حققت ${I.objDone} من ${I.nObj} هدف · جايزة الموسم ${money(I.prize)} · ثقة الإدارة ${Math.round(c.board)}% · السمعة ${Math.round(c.rep)}</div>${I.won.map(a=>`<div class="news">${esc(a)}</div>`).join('')}${I.youth.length?`<div class="news">اتضافوا من الأكاديمية: ${I.youth.map(esc).join('، ')}</div>`:''}<div class="statg"><div><b>${c.history[c.history.length-1].pts}</b><span>نقطة</span></div><div><b>${c.history[c.history.length-1].W}-${c.history[c.history.length-1].D}-${c.history[c.history.length-1].L}</b><span>فوز-تعادل-خسارة</span></div><div><b>${c.history[c.history.length-1].GF}-${c.history[c.history.length-1].GA}</b><span>أهداف</span></div></div>`;
 let h='';if(!I.sacked)h+=`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">${I.renew?'جدّد مع ':'كمّل مع '}${esc(c.club.name)}</div><div class="sub">${esc(T.name)}${I.renew?' · عقد جديد '+money(I.newSal)+'/أسبوع':' · باقي '+c.contract.years+' سنة'}</div></div><button class="btn sm" id="seStay">${I.renew?'جدّد':'موسم جديد'}</button></div>`;
 else h+=`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">اتفصلت من ${esc(c.club.name)}</div><div class="sub">اختار فرصة جديدة من العروض</div></div></div>`;
 I.offers.forEach((f,i)=>{h+=`<div class="offer">${crestHTML(f.club,'s')}<div class="grow"><div style="font-weight:800;font-size:17px">${esc(f.club.name)} ${flagHTML(f.abroad)} <span class="pill">${esc(f.why)}</span></div><div class="sub">${esc(f.tierName)} · تقييم الفريق ${f.clubR}</div><div class="sub">راتب ${money(f.wage)}/أسبوع · ${f.years} سنين</div></div><button class="btn sm gold" data-o="${i}">اقبل المنصب</button></div>`;});
 if(!I.offers.length&&!I.sacked)h+=`<div class="sub" style="padding:8px">مفيش عروض تدريب الموسم ده. حقق نتايج أحسن وارفع سمعتك.</div>`;
 $('seOff').innerHTML=h;
 if($('seStay'))$('seStay').onclick=()=>{if(I.renew){c.contract={wage:0,years:RI(2,4)};addNews(c,'transfer',c.name+' يجدد عقده مع '+c.club.name);}c.path.tier=I.stayTier;newSeason();show('hub');};
 $('seOff').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const of=I.offers[+b.dataset.o];coachSign(c,of);});show('season');};
function coachSign(c,of){addNews(c,'transfer','رسمياً: '+c.name+' ينتقل لتدريب '+of.club.name,true);c.club=Object.assign({},of.club,{bonus:0});c.contract={wage:0,years:of.years};c.path.tier=of.tier;c.path.abroad[of.tier]=of.abroad;
 c.cl=null;c.mk=null;c.guest=null;c.fac={train:0,youth:0,stad:0,med:0};c.board=55;c.money=startBudget(c,1);c.fans=clamp(40+(of.clubR-50),30,90);
 newSeason();mail(c,'club','إدارة '+c.club.name,'أهلاً بيك مدرباً لنا','الجمهور مستنيك. الميزانية '+money(c.money)+'، وراجع التشكيلة من تبويب «الفريق».');store();
 showSign(c.club,'منصب جديد!',of.years+' سنين · '+of.tierName,()=>show('hub'));}
const _ns=newSeason;newSeason=function(){const c=App.c;if(!c.coachMode)return _ns();c.season++;c.ss={apps:0,g:0,a:0,rs:0,yc:0,motm:0,sh:0,sot:0,p:0,pc:0,tk:0,rc:0};c.seInfo=null;c.energy=100;c.cup=null;c.mk=null;
 buildSeason(c);const S=mySquad(c);S.forEach(p=>{p.fit=100;p.inj=0;p.cs={g:0,a:0,apps:0,rs:0};});c.cl&&(c.cl.auto=true);autoPick(c);updR(c);c.sponsor=sponsorPerMatch(c);store();};
/* ---------- هدافين الدوري: فريقك من لاعيبتك الحقيقيين ---------- */
const _st=scorersTable;scorersTable=function(c){if(!c.coachMode)return _st(c);ensureSc(c);const lg=c.league;const rows=lg.sc.filter((s,i)=>i!==0).map(s=>({n:s.n,club:lg.teams[s.team].name,g:s.g,a:s.a,apps:s.apps,avg:s.apps?s.rs/s.apps:0,age:s.age}));
 mySquad(c).forEach(p=>rows.push({n:p.n,club:c.club.name,g:p.cs.g,a:p.cs.a,apps:p.cs.apps,avg:p.cs.apps?p.cs.rs/p.cs.apps:0,me:true,age:p.age}));return rows;};
/* ---------- بانر الإعلانات: بيظهر خارج الماتش بس ---------- */
show=(function(o){return function(id){o(id);try{Ads.banner(id!=='match'&&id!=='title'&&id!=='cer'&&id!=='award'&&!!App.c);}catch(e){}};})(show);
