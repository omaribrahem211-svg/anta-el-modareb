/* ============ عالم المسيرة: دوريات ثابتة، هدافين، أخبار، قيمة سوقية، جوائز ============ */
'use strict';
const WSTARS0=[['ع. ديمبيلي','FR',.97,29],['ل. يامال','ES',.98,19],['ك. مبابي','FR',.97,28],['إ. هالاند','NO',.95,26],['ف. جونيور','BR',.93,26],['ج. بيلينجهام','EN',.92,23],['م. صلاح','EG',.93,34],['ه. كين','EN',.92,33],['ر. رافينيا','BR',.91,29],['ب. ساكا','EN',.9,25],['ف. فيتينيا','PT',.9,26],['ب. بيدري','ES',.91,24],['أ. حكيمي','MA',.9,28],['ج. موسيالا','DE',.89,24],['ر. رودري','ES',.89,30]];
function wInit(c){if(!c.world)c.world={lg:{},stars:null,streak:0};const W=c.world;
 if(!W.stars)W.stars=WSTARS0.slice(0,12).map(s=>({n:s[0],cc:s[1],q:s[2]+R(-.03,.02),age:s[3]+Math.floor((c.season||1)/3),club:null}));
 if(typeof REAL_RENAME!=='undefined'&&(W.rn||0)<2){const RN=REAL_RENAME;const fix=x=>{if(!x)return;if(RN[x.name])x.name=RN[x.name];const ix=REALIDX[x.name];if(ix){x.short=ix.short;x.kitArr=ix.kit;x.real=true;}};
  for(const k in W.lg){const L=W.lg[k];L.clubs.forEach(fix);L.up=(L.up||[]).map(n=>RN[n]||n);L.down=(L.down||[]).map(n=>RN[n]||n);if(RN[L.champ])L.champ=RN[L.champ];}
  if(c.league)c.league.teams.forEach(fix);fix(c.club);if(W.sq){for(const o in W.sq)if(RN[o]||REALIDX[o])delete W.sq[o];}if(c.league)delete c.league.sc;W.rn=2;}
  if(W.rn===2){delete W.lg['EG|3'];delete W.lg['EG|2'];W.rn=3;}if(W.rn===3){if(W.sq)for(const r of REAL.EG)delete W.sq[r[0]];if(c.league&&c.league.teams.some(t=>REAL.EG.some(r=>r[0]===t.name)))delete c.league.sc;W.rn=4;}
 if(!c.news)c.news=[];if(!c.ss.sh)Object.assign(c.ss,{sh:0,sot:0,p:0,pc:0,tk:0,rc:0});if(!c.tot.motm)Object.assign(c.tot,{motm:0,yc:0,rc:0});return W;}
function gl(n){return n+(n>=3&&n<=10?' أهداف':' هدف');}
function addNews(c,k,txt,big){wInit(c);c.news.unshift({k,txt,big:!!big,s:c.season,md:c.league?c.league.md:0});if(c.news.length>80)c.news.length=80;}

/* ---- persistent leagues ---- */
// كل مستويات الاحتراف في نفس البلد (دوري أقوى/أوروبي كبير/نادي عملاق) هي نفس الدوري الحقيقي
function lgKeyOf(ti,tier){return ti.lk||ti.country+'|'+tier;}
function worldClubs(c,tier,ti,n){n=n||(typeof lgSize==='function'?lgSize(c,tier,ti)-1:7);const W=wInit(c);const k=lgKeyOf(ti,tier);let L=W.lg[k];
 if(!L){const used=new Set([c.club.name]);const real=realClubsFor(c,tier,ti,n);real.forEach(x=>used.add(x.name));L=W.lg[k]={clubs:real.concat(genClubs(ti.country,Math.max(0,n-real.length),ti.base,used,RI(0,20))),up:[],down:[],champ:null};}
 return L;}
function seasonClubs(c,tier,ti,n){n=n||7;const L=worldClubs(c,tier,ti,n);const used=new Set(L.clubs.map(x=>x.name).concat([c.club.name]));
 const realLg=!ti.domestic||tier===3;
 // الدوريات الحقيقية: مفيش هبوط لأندية وهمية بره مصر، والأندية الصاعدة للدوري الممتاز من القايمة الحقيقية للدرجة التانية
 let pool=L.clubs.filter(x=>x.name!==c.club.name&&(!ti.domestic||(!L.up.includes(x.name)&&!L.down.includes(x.name))));const fresh=[];
 if(realLg&&pool.length<n){const rows=(ti.domestic?(REAL_D2[ti.country]||[]):[]).concat(REAL[ti.country]||[],ti.domestic?[]:(REAL_D2[ti.country]||[]));for(const r of rows){if(pool.length>=n)break;if(used.has(r[0]))continue;used.add(r[0]);pool.push({name:r[0],short:r[6]||realShort(r[0]),kitArr:[r[2],r[3],r[4]],R:r[1],cc:ti.country,real:true,newcomer:true});fresh.push(r[0]);}}
 while(pool.length<n){const nc=genClubs(ti.country,1,ti.base+(L.down.length?R(-1,2):0),used,RI(0,20))[0];nc.newcomer=true;pool.push(nc);fresh.push(nc.name);}
 if(pool.length>n)pool=pool.sort((a,b)=>(b.pro?100:0)+b.R-(a.pro?100:0)-a.R).slice(0,n);
 pool.forEach(x=>{x.R=Math.round(clamp(x.R+R(-2,2.4),ti.base-6,ti.base+(x.real?10:8)));if(c.season>1)ageSquad(c,x);});if(c.season>1)ageSquad(c,c.club);
 if(fresh.length&&c.season>1)addNews(c,'league','الوجوه الجديدة في '+ti.short+': '+fresh.join(' و'));
 L.clubs=pool.map(x=>({name:x.name,short:x.short,kit:x.kit,kitArr:x.kitArr,R:x.R,cc:x.cc,real:x.real}));pool.forEach(x=>{delete x.pro;delete x.newcomer;});L.up=[];L.down=[];
 return pool.map(x=>Object.assign({},x));}
function settleLeague(c,tb){const ti=curTier(c),tier=c.path.tier;const L=worldClubs(c,tier,ti);const nm=tb.filter(t=>!t.me);
 L.champ=tb[0].name;const dn=relegN(c,tier),upN=ti.domestic&&tier<3?relegN(c,tier+1):0;const up=nm.slice(0,upN).filter(t=>tb.indexOf(t)<upN).map(t=>t.name);
 const down=(tier>0||!ti.domestic)?nm.slice(-dn).filter(t=>tb.indexOf(t)>=tb.length-dn).map(t=>t.name):[];L.up=up;L.down=down;
 if(up.length){const ti2=tierInfo(c.path,tier+1);const L2=worldClubs(c,tier+1,ti2);for(const n of up){const t=tb.find(x=>x.name===n);L2.clubs.push({name:t.name,short:t.short,kit:t.kit,kitArr:t.kitArr,real:t.real,R:Math.round(ti2.base-2+R(-1,2)),cc:t.cc,pro:true});}}
 if(down.length&&ti.domestic&&tier>0){const ti0=tierInfo(c.path,tier-1);const L0=worldClubs(c,tier-1,ti0);for(const n of down){const t=tb.find(x=>x.name===n);L0.clubs.push({name:t.name,short:t.short,kit:t.kit,kitArr:t.kitArr,real:t.real,R:Math.round(ti0.base+2),cc:t.cc,pro:true});}}
 return{up,down};}

/* ---- scorers / ratings of the league ---- */
function ensureSc(c){const lg=c.league;if(!lg||lg.sc)return;const nmOf=t=>(CBY[t.cc||c.path.home]||{nm:'ar'}).nm;
 lg.sc=lg.teams.map((t,i)=>{const S=squadDef(c,t).filter(p=>p.r==='FW').sort((a,b)=>b.ov-a.ov);const p=S[0];return{n:p?p.n:randName(nmOf(t)),team:i,g:0,a:0,apps:0,rs:0,age:p?p.age:RI(18,33)};});}
function creditTeam(c,ti,goals,mine){const lg=c.league;ensureSc(c);const s=lg.sc[ti];if(!s)return;s.apps++;let g=0;
 for(let i=0;i<goals-(mine||0);i++){if(Math.random()<.42){s.g++;g++;}else if(Math.random()<.35)s.a++;}
 s.rs+=clamp(6.25+g*.75+R(-.45,.65)+(goals>0?.15:0),4.8,9.6);}
function scorersTable(c){ensureSc(c);const lg=c.league;const rows=lg.sc.map(s=>({n:s.n,club:lg.teams[s.team].name,g:s.g,a:s.a,apps:s.apps,avg:s.apps?s.rs/s.apps:0,age:s.age}));
 rows.push({n:c.name,club:c.club.name,g:c.ss.g,a:c.ss.a,apps:c.ss.apps,avg:c.ss.apps?c.ss.rs/c.ss.apps:0,me:true,age:c.age});return rows;}

/* ---- market value ---- */
function marketValue(c){const o=ovr(c),avg=c.ss.apps>=3?c.ss.rs/c.ss.apps:6.6;const ageF=c.age<=21?1.45:c.age<=24?1.25:c.age<=28?1:c.age<=31?.7:c.age<=33?.45:.25;
 const form=clamp(.75+(avg-6.6)*.45,.6,1.5);const lg=1+c.path.tier*.35;const v=1800*Math.exp((o-45)*.19)*ageF*form*lg;
 const r=v<1e5?1e3:v<1e6?1e4:v<1e7?1e5:1e6;return Math.max(5000,Math.round(v/r)*r);}

/* ---- transfers ---- */
function clubFor(c,tier){const ti=tierInfo(c.path,tier);const L=worldClubs(c,tier,ti);const cand=L.clubs.filter(x=>x.name!==c.club.name);
 let pool=cand;if(!ti.domestic){const near=cand.filter(x=>Math.abs((x.R||ti.base)-ti.base)<=5);if(near.length)pool=near;else{const s2=cand.slice().sort((a,b)=>Math.abs(a.R-ti.base)-Math.abs(b.R-ti.base));pool=s2.slice(0,3);}}
 const cl=pool.length&&(Math.random()<.85||!ti.domestic)?pick(pool):genClubs(ti.country,1,ti.base,new Set([c.club.name]),RI(0,15))[0];return{ti,cl};}
function makeOfferW(c,tier,why){const{ti,cl}=clubFor(c,tier);const o=ovr(c),val=marketValue(c);
 const role=o>=cl.R+4?'أساسي':o>=cl.R-1?'أساسي غالباً':o>=cl.R-5?'بديل مهم':'للتطوير';
 const wage=Math.round(WAGE[tier]*R(.85,1.2)*(role==='أساسي'?1.15:role==='للتطوير'?.8:1)*clamp(1+(o-TIER_REQ[tier])*.03,.75,1.5)/10)*10;
 const fee=c.contract.years>0?Math.round(val*R(.75,1.25)/1000)*1000:0;
 return{tier,abroad:ti.country,club:{name:cl.name,short:cl.short,kit:cl.kit,kitArr:cl.kitArr,cc:ti.country,real:cl.real,R:cl.real?cl.R:undefined},clubR:cl.R,wage,years:RI(2,5),tierName:ti.name,role,fee,why:why||'',ask:Math.round(val*(c.contract.years>=2?1.1:.9)/1000)*1000};}
function windowOffers(c,stayTier,avg,winter){const o=ovr(c),off=[];if(c.age>=35)return vetOffers(c,stayTier,avg,winter);const has=t=>off.some(x=>x.tier===t);
 const t1=Math.min(7,stayTier+1),t2=Math.min(7,stayTier+2);
 if(stayTier<7&&avg>=6.8&&o>=TIER_REQ[t1]-3&&Math.random()<clamp(.45+(avg-6.8)*.5+(o-TIER_REQ[t1])*.06,.15,.95))off.push(makeOfferW(c,t1,'خطوة لقدام'));
 if(!winter&&stayTier<6&&avg>=7.5&&o>=TIER_REQ[t2]-1&&Math.random()<.55)off.push(makeOfferW(c,t2,'قفزة كبيرة'));
 if(!winter&&avg>=7.1&&Math.random()<.5){const f=makeOfferW(c,stayTier,'مرتب أعلى');f.wage=Math.round(Math.max(f.wage,c.contract.wage*R(1.25,1.6))/10)*10;off.push(f);}
 const dom=tierInfo(c.path,stayTier).domestic;if(dom&&stayTier>=2&&!has(4)&&o>=TIER_REQ[4]-2&&avg>=7&&Math.random()<.6)off.push(makeOfferW(c,4,'احتراف برّه'));
 return off.slice(0,4);}

function vetOffers(c,stayTier,avg,winter){if(winter)return[];const off=[];const n=c.age>=38?1:2;for(let i=0;i<n;i++){if(Math.random()>clamp(.25+(avg-6.3)*.4+(40-c.age)*.08,.08,.85))continue;const t=Math.max(0,stayTier-RI(1,2));const f=makeOfferW(c,t,c.age>=38?'آخر محطة':'خبرة');f.years=1;f.fee=0;f.wage=Math.round(f.wage*R(.45,.7)/10)*10;f.role=Math.random()<.6?'بديل مهم':'للتطوير';off.push(f);}
 if(c.age>=36&&Math.random()<.5){const cc=pick(['SA','QA','AE','US']);const tier=4;const ti={country:cc};const f=makeOfferW(c,Math.max(0,stayTier-1),'تجربة أخيرة');f.years=1;f.fee=0;f.wage=Math.round(f.wage*R(.8,1.3)/10)*10;off.push(f);}return off;}
/* ---- awards ---- */
function lgAwards(c,tb){const rows=scorersTable(c),me=rows.find(r=>r.me),pos=tb.findIndex(t=>t.me)+1;const out=[];
 const top=rows.slice().sort((a,b)=>b.g-a.g||b.a-a.a||(a.me?-1:1));out.push({n:'هداف الدوري',w:top[0],v:gl(top[0].g)});
 const ast=rows.slice().sort((a,b)=>b.a-a.a||b.g-a.g||(a.me?-1:1));out.push({n:'ملك الأسيست',w:ast[0],v:ast[0].a+' أسيست'});
 const sc=r=>{const tp=tb.findIndex(t=>t.name===r.club)+1;return (r.apps>=6?r.avg:5.5)+(r.g+r.a*.7)/Math.max(6,r.apps)*.9+(tp===1?.35:tp<=3?.18:0);};
 const mvp=rows.slice().sort((a,b)=>sc(b)-sc(a));out.push({n:'أحسن لاعب في الدوري',w:mvp[0],v:'تقييم '+mvp[0].avg.toFixed(2)});
 const yg=rows.filter(r=>r.age<=21).sort((a,b)=>sc(b)-sc(a));if(yg.length)out.push({n:'أحسن لاعب شاب',w:yg[0],v:'تقييم '+yg[0].avg.toFixed(2)});
 if(me.apps>=8&&me.avg>=7.1&&mvp.indexOf(me)<6)out.push({n:'تشكيلة الموسم',w:me,v:'متوسط '+me.avg.toFixed(2)});
 return out;}
function ballonRace(c,seasonTrophies){const W=wInit(c);const o=ovr(c),avg=c.ss.apps?c.ss.rs/c.ss.apps:6;
 const mine=o*1.2+avg*10+(c.ss.g+c.ss.a*.6)*1.1+seasonTrophies*12+(c.cont&&c.cont.won?20:0)+c.path.tier*6+(c.intl.called?4:0);
 const list=W.stars.map(s=>({n:s.n,cc:s.cc,p:200+s.q*72+R(-16,16)-(s.age>31?(s.age-31)*5:0)}));list.push({n:c.name,cc:c.nat,p:mine,me:true});
 list.sort((a,b)=>b.p-a.p);return list;}
function ageStars(c){const W=wInit(c);W.stars.forEach(s=>{s.age++;s.q=clamp(s.q+(s.age<27?R(0,.04):s.age>30?-R(.02,.07):R(-.03,.03)),.6,1);});
 W.stars.forEach(s=>{if(!s.ra)s.ra=RI(35,40);});const gone=W.stars.filter(s=>s.age>=s.ra||s.q<.6);if(gone.length){W.stars=W.stars.filter(s=>!gone.includes(s));for(const g of gone){addNews(c,'world',g.n+' يعلن اعتزاله… نهاية حقبة');const nm=pick(['EN','ES','FR','DE','IT','BR','AR','PT','NL','MA','EG','TR']);const N=CBY[nm]||{nm:'en'};W.stars.push({n:(N.nm==='ar'?'':pick(['ليو','نوا','أدريان','سامي','كاي','إيلاي','ماكس','زين','إيفان','ريان'])+' ')+randName(N.nm||'en'),cc:nm,q:R(.74,.92),age:RI(19,22)});}}}
const WHEAD=['{s} يسجل هاتريك ويقود فريقه لفوز كبير','{s} يرفض التجديد… والأندية الكبيرة تترقب','تقارير: {s} الأقرب للكرة الذهبية الموسم ده','{s} يتعرض لإصابة ويغيب أسابيع','{s} يكسر رقم قياسي جديد في التمريرات الحاسمة','جدل كبير بعد تصريحات {s} عن الحكام'];
function worldTick(c){const W=wInit(c);if(Math.random()<.4){const s=pick(W.stars);addNews(c,'world',pick(WHEAD).split('{s}').join(s.n));}}
function leagueNews(c){const lg=c.league,tb=sortTable(lg),ld=tb[0];
 if(lg.md>=3&&lg.leader!==ld.name)addNews(c,'league',(ld.me?c.club.name+' (فريقك)':ld.name)+' يخطف صدارة '+c.tierShort+' برصيد '+ld.Pts+' نقطة',ld.me);lg.leader=ld.name;
 if(lg.md%3===0){const top=scorersTable(c).sort((a,b)=>b.g-a.g||(a.me?-1:1))[0];if(top.g>0)addNews(c,'league','سباق الهدافين: '+(top.me?'إنت':top.n+' ('+top.club+')')+' في الصدارة بـ '+gl(top.g));}
 const big=(lg.res||[]).find(x=>x[0]!==0&&x[1]!==0&&Math.abs(x[2]-x[3])>=4);if(big)addNews(c,'league','نتيجة تقيلة: '+lg.teams[big[0]].name+' '+big[2]+'-'+big[3]+' '+lg.teams[big[1]].name);
 const pos=tb.findIndex(t=>t.me)+1;
 const RR=lg.rounds.length;if(lg.md===Math.floor(RR/2))addNews(c,'league','نهاية الدور الأول: '+c.club.name+' في المركز '+pos+' برصيد '+tb[pos-1].Pts+' نقطة');
 if(lg.md===RR-2){const gap=tb[0].Pts-tb[1].Pts;addNews(c,'league',gap<=3?'صراع ناري على اللقب: '+tb[0].name+' و'+tb[1].name+' والفرق '+gap+' نقط بس':tb[0].name+' قرّب جداً من اللقب بفارق '+gap+' نقط');}
 worldTick(c);}
/* ---- أحداث العالم كل موسم ---- */
const LG_TITLE={EN:'الدوري الإنجليزي',ES:'الدوري الإسباني',IT:'الدوري الإيطالي',DE:'الدوري الألماني',FR:'الدوري الفرنسي',PT:'الدوري البرتغالي',NL:'الدوري الهولندي',TR:'الدوري التركي',SA:'الدوري السعودي',EG:'الدوري المصري',MA:'الدوري المغربي',BR:'الدوري البرازيلي',AR:'الدوري الأرجنتيني',US:'الدوري الأمريكي'};
function wPick(list,rf,k){const mx=Math.max(...list.map(rf));let tot=0;const w=list.map(x=>{const v=Math.exp((rf(x)-mx)/(k||2.5));tot+=v;return v;});let r=Math.random()*tot;for(let i=0;i<list.length;i++){r-=w[i];if(r<=0)return list[i];}return list[0];}
function worldSeason(c){const W=wInit(c);const myKey=curTier(c).country;const Y=seasonYear(c);
 for(const cc in LG_TITLE){if(cc===myKey&&curTier(c).domestic===(cc===c.path.home)&&c.path.tier>=3)continue;const L=REAL[cc];if(!L)continue;const w=wPick(L.slice(0,10),r=>r[1]);addNews(c,'world',w[0]+' بطل '+LG_TITLE[cc]+' '+Y+'-'+(Y+1));}
 const cont=[['دوري أبطال أوروبا',['EN','ES','IT','DE','FR']],['دوري أبطال أفريقيا',['EG','MA','TN','DZ']],['دوري أبطال آسيا للنخبة',['SA','QA','AE']],['كوبا ليبرتادوريس',['BR','AR']]];
 for(const [n,ccs] of cont){if(c.cont&&c.cont.name===n)continue;const pool=[];ccs.forEach(cc=>(REAL[cc]||[]).slice(0,6).forEach(r=>pool.push(r)));const w=wPick(pool,r=>r[1],2);addNews(c,'world',w[0]+' يتوج بلقب '+n+' '+(Y+1),true);}
 const yr=Y+1;const confs=['eu','af','as','sa','na'];const mine=c.ntc&&(c.ntc.tt||c.ntc.tj);
 if(yr%4===2){if(!(mine&&mine.wc)){const pool=['البرازيل','الأرجنتين','فرنسا','إسبانيا','إنجلترا','ألمانيا','البرتغال','هولندا','المغرب','إيطاليا','بلجيكا','كرواتيا','أوروجواي','كولومبيا','اليابان','السنغال','المكسيك','أمريكا','مصر','السعودية'];const w=wPick(pool.map(natByName),t=>t.R,2.2);addNews(c,'world',w.name+' بطل كأس العالم '+yr+'!',true);}}
 for(const cf of confs){const T=TOURN[cf]&&TOURN[cf][yr];if(!T)continue;if(mine&&mine.name===T)continue;const w=wPick(CONF_NATS[cf].map(natByName),t=>t.R,2.2);addNews(c,'world',w.name+' بطل '+T+' '+yr,true);}
 if(c.path.tier<4){const race=ballonRace(c,0).filter(x=>!x.me);W.lastBallon=race.slice(0,3).map(x=>({n:x.n,cc:x.cc,club:(W.stars.find(s=>s.n===x.n)||{}).club||''}));addNews(c,'world',race[0].n+' يفوز بالكرة الذهبية '+(yr)+'، ووصيفه '+race[1].n,true);}
 for(let i=0;i<2;i++){const s=pick(W.stars);const eu=['EN','ES','FR','DE','IT'];const cc=pick(eu);const dest=pick(REAL[cc].slice(0,6));const fee=Math.round(R(60,180));addNews(c,'transfer','صفقة الصيف: '+s.n+' ينتقل إلى '+dest[0]+' مقابل '+fee+' مليون دولار',true);s.club=dest[0];if(W.sq){let pl=null;for(const k in W.sq){const i=W.sq[k].findIndex(p=>p.n===s.n);if(i>=0){pl=W.sq[k][i];W.sq[k].splice(i,1);}}if(pl&&W.sq[dest[0]])W.sq[dest[0]].push(pl);}}
 if(ASIAN_CUP_JAN[yr]&&!(c.ntc&&c.ntc.tj)){const w=wPick(CONF_NATS.as.map(natByName),t=>t.R,2.2);addNews(c,'world',w.name+' بطل '+ASIAN_CUP_JAN[yr]+' '+yr,true);}
}
