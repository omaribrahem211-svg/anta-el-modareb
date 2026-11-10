/* ============ الموسم الحقيقي: تقويم بتواريخ، دوري بحجمه، كأس خروج مغلوب، بطولات قارية ودولية ============ */
'use strict';
const DAY=864e5;
function dU(y,m,d){return Date.UTC(y,m-1,d);}
function dIso(t){return new Date(t).toISOString().slice(0,10);}
function nextDow(t,dow){const w=new Date(t).getUTCDay();return t+((dow-w+7)%7)*DAY;}
const AR_MON=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const AR_DOW=['الأحد','الاتنين','التلات','الأربع','الخميس','الجمعة','السبت'];
function dTxt(iso,full){const d=new Date(iso+'T00:00:00Z');return (full?AR_DOW[d.getUTCDay()]+' ':'')+d.getUTCDate()+' '+AR_MON[d.getUTCMonth()]+(full?' '+d.getUTCFullYear():'');}
function seasonYear(c){return 2026+(c.season||1)-1;}
/* أحجام الدوريات الحقيقية (الدرجة الأولى) */
const LG_N={EN:20,ES:20,IT:20,DE:18,FR:18,PT:18,NL:18,TR:18,SA:18,EG:20,MA:16,DZ:16,TN:16,AE:14,QA:12,JO:12,IQ:20,BR:20,AR:20,US:18};
function lgSize(c,tier,ti){const top=(ti.domestic&&tier===3)||!ti.domestic;const n=top?(LG_N[ti.country]||18):(ti.domestic&&tier===0?16:18);return n;}
function intlWins(Y){return[[Y,9,1],[Y,10,6],[Y,11,10],[Y+1,3,19]].map(([y,m,d])=>{const a=nextDow(dU(y,m,d),4);return[a,a+5*DAY];});}
function inWin(t,W){return W.some(([a,b])=>t>=a-2*DAY&&t<=b+1*DAY);}
/* ---- البطولات القارية حسب الاتحاد ---- */
const CONF_OF=cc=>({eu:'eu',af:'af',as:'as',sa:'sa',na:'na'})[CBY[cc].cont]||'eu';
const CONT_DEF={
 eu:[{n:'دوري أبطال أوروبا',fmt:'swiss',N:36,md:8,ko:[['الملحق',2],['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]},{n:'الدوري الأوروبي',fmt:'swiss',N:36,md:8,ko:[['الملحق',2],['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]}],
 af:[{n:'دوري أبطال أفريقيا',fmt:'groups',G:4,ko:[['ربع النهائي',2],['نصف النهائي',2],['النهائي',2]]},{n:'الكونفدرالية الأفريقية',fmt:'groups',G:4,ko:[['ربع النهائي',2],['نصف النهائي',2],['النهائي',2]]}],
 as:[{n:'دوري أبطال آسيا للنخبة',fmt:'swiss',N:12,md:8,ko:[['دور الـ16',2],['ربع النهائي',1],['نصف النهائي',1],['النهائي',1]]},{n:'دوري أبطال آسيا 2',fmt:'groups',G:8,ko:[['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]}],
 sa:[{n:'كوبا ليبرتادوريس',fmt:'groups',G:8,ko:[['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]},{n:'كوبا سودأمريكانا',fmt:'groups',G:8,ko:[['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]}],
 na:[{n:'كأس أبطال الكونكاكاف',fmt:'ko',ko:[['دور الـ16',2],['ربع النهائي',2],['نصف النهائي',2],['النهائي',1]]}]};
function contClubs(c,conf,me,n){const pool=[];for(const cc in REAL){if(CONF_OF(cc)!==conf)continue;for(const r of REAL[cc])if(r[0]!==me.name)pool.push({name:r[0],short:r[6],kitArr:[r[2],r[3],r[4]],R:r[1],cc,real:true});}
 const out=shuffle(pool).sort((a,b)=>Math.abs(a.R-me.R)-Math.abs(b.R-me.R)).slice(0,Math.min(n,Math.round(n*.75)));
 const ccs=COUNTRIES.filter(x=>CONF_OF(x.c)===conf);const used=new Set(out.map(x=>x.name));while(out.length<n){const cc=pick(ccs).c;const g=genClubs(cc,1,me.R+R(-6,2),used,RI(0,20))[0];out.push(g);}return out;}
/* ---- المنتخبات ---- */
function natTeam(cc,name){if(cc&&CBY[cc]){const C=CBY[cc];return{name:'منتخب '+C.n,short:C.n,kitArr:natKit(cc),R:natR(cc),nm:C.nm,cc};}return{name:'منتخب '+name,short:name,kitArr:KITS[(name.length*3)%KITS.length],R:Math.round(55+(NAT_STR[name]||.55)*30),nm:'af'};}
const CONF_NATS={af:['مصر','المغرب','الجزائر','تونس','السنغال','نيجيريا','الكاميرون','غانا','كوت ديفوار','مالي','جنوب أفريقيا','بوركينا فاسو'],as:['السعودية','قطر','الإمارات','الأردن','العراق','اليابان','كوريا','إيران','أستراليا','أوزبكستان'],eu:['إنجلترا','إسبانيا','إيطاليا','ألمانيا','فرنسا','البرتغال','هولندا','تركيا','بلجيكا','كرواتيا','الدنمارك','سويسرا'],sa:['البرازيل','الأرجنتين','أوروجواي','كولومبيا','الإكوادور','باراجواي','تشيلي','بيرو'],na:['أمريكا','المكسيك','كندا','بنما','كوستاريكا','جامايكا']};
function natByName(n){const C=COUNTRIES.find(x=>x.n===n);return natTeam(C&&C.c,n);}
const TOURN={eu:{2028:'كأس الأمم الأوروبية',2032:'كأس الأمم الأوروبية'},af:{2027:'كأس الأمم الأفريقية',2028:'كأس الأمم الأفريقية',2032:'كأس الأمم الأفريقية'},as:{2031:'كأس آسيا'},sa:{2028:'كوبا أمريكا',2032:'كوبا أمريكا'},na:{2027:'الكأس الذهبية',2029:'الكأس الذهبية',2031:'الكأس الذهبية',2033:'الكأس الذهبية'}};
function tournFor(conf,year){if(year%4===2)return{n:'كأس العالم',wc:true,N:48};const n=TOURN[conf]&&TOURN[conf][year];return n?{n,N:conf==='sa'||conf==='na'?16:24}:null;}
const ASIAN_CUP_JAN={2027:'كأس آسيا'};
/* ================= بناء الموسم ================= */
function buildSeason(c){const ti=curTier(c);c.path.abroad[c.path.tier]=ti.country;c.tierName=ti.name;c.tierShort=ti.short;wInit(c);
 const N=lgSize(c,c.path.tier,ti);const used=new Set([c.club.name]);
 const me=Object.assign({},c.club,{me:true,R:c.club.real&&c.club.R?Math.round(clamp(c.club.R,ti.base-4,ti.base+10)):Math.round(ti.base-1+Math.max(0,(c.club.bonus||0)))});
 const others=seasonClubs(c,c.path.tier,ti,N-1);const teams=[me].concat(others);teams.forEach(t=>Object.assign(t,{P:0,Wn:0,D:0,Ls:0,GF:0,GA:0,Pts:0}));
 c.league={teams,rounds:shuffle(rrDouble(N).slice(0,N-1)).concat([]),md:0,N};c.league.rounds=c.league.rounds.concat(c.league.rounds.map(r=>r.map(([a,b])=>[b,a])));ensureSc(c);c.league.leader=null;
 const Y=seasonYear(c),W=intlWins(Y),start=nextDow(dU(Y,8,8),6),end=nextDow(dU(Y+1,5,17),6);
 const sats=[];for(let t=start;t<=end;t+=7*DAY)if(!inWin(t,W))sats.push(t);const R2=c.league.rounds.length;let slots=sats.slice();
 for(let k=0;slots.length<R2&&k<60;k++){const i=Math.floor((k*7+3)%sats.length);const wd=sats[i]+4*DAY;if(!slots.includes(wd)&&!inWin(wd,W))slots.push(wd);}
 slots.sort((a,b)=>a-b);const pickS=slots.length>R2?Array.from({length:R2},(_,i)=>slots[Math.round(i*(slots.length-1)/(R2-1))]):slots.slice(0,R2);
 const s=[];pickS.forEach((t,md)=>s.push({t:'L',md,d:dIso(t),press:md%5===4}));
 // الكأس
 buildCup(c,ti,Y,s);
 // البطولة القارية
 buildCont(c,ti,Y,s,me);
 // المنتخب
 buildNat(c,Y,W,s);
 s.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
 // ما يبقاش في يومين نفس التاريخ
 for(let i=1;i<s.length;i++)if(s[i].d<=s[i-1].d)s[i].d=dIso(Date.parse(s[i-1].d+'T00:00:00Z')+DAY);
 const half=Math.floor(R2/2);const wf=s.find(x=>x.t==='L'&&x.d>=dIso(dU(Y+1,1,1)));if(wf)wf.winter=true;
 c.sched=s;c.si=0;skipInvalid(c);makeObjectives(c);}
function relegN(c,t){const ti=tierInfo(c.path,t);return lgSize(c,t,ti)>=18?3:2;}
/* انتقال في نص الموسم: الدوري الجديد بيكمّل من نفس التاريخ وكل الفرق لعبت نفس العدد */
function joinMidSeason(c,now,oldNtc){const lg=c.league;const keep=[];
 for(const f of c.sched){if(f.d>=now){if(f.t!=='K')keep.push(f);continue;}
  if(f.t==='L'){for(const [a,b] of lg.rounds[f.md]){const sc=simScore(lg.teams[a].R,lg.teams[b].R);applyResult(lg,a,b,sc[0],sc[1]);creditTeam(c,a,sc[0]);creditTeam(c,b,sc[1]);}lg.md++;}
  else if(f.t==='C'&&c.cup.alive&&c.cup.round===f.r){const o=cupOpp(c);if(o){const A=c.cup.teams[o.me],Bt=c.cup.teams[o.oi];const sc=simScore(A.R,Bt.R);const w=koWinner(sc[0],sc[1],A.R,Bt.R);cupAdvance(c,w);if(!w){c.cup.alive=false;}}}}
 c.cont=null;if(oldNtc)c.ntc=oldNtc;c.sched=keep;c.si=0;skipInvalid(c);}
/* ---- الكأس المحلية ---- */
function buildCup(c,ti,Y,s){const lg=c.league.teams;const used=new Set(lg.map(t=>t.name));let teams=lg.map((t,i)=>({name:t.name,short:t.short,kit:t.kit,kitArr:t.kitArr,R:t.R,cc:t.cc||ti.country,real:t.real,li:i}));
 const size=teams.length>16?32:16;while(teams.length<size){const g=genClubs(ti.country,1,ti.base-RI(3,10),used,RI(0,20))[0];g.cc=ti.country;teams.push(g);}
 if(teams.length>size)teams=[teams[0]].concat(shuffle(teams.slice(1)).slice(0,size-1));
 const idx=shuffle(teams.map((_,i)=>i));const pairs=[];for(let i=0;i<idx.length;i+=2)pairs.push([idx[i],idx[i+1]]);
 const rn=size===32?['دور الـ32','دور الـ16','ربع النهائي','نصف النهائي','النهائي']:['دور الـ16','ربع النهائي','نصف النهائي','النهائي'];
 c.cup={name:'كأس '+CBY[ti.country].n,teams,pairs,round:0,alive:true,rn,won:false,winner:null};
 const dates=size===32?[[Y,9,23],[Y,10,28],[Y+1,1,27],[Y+1,3,3],[Y+1,5,23]]:[[Y,10,28],[Y+1,1,27],[Y+1,3,3],[Y+1,5,23]];
 dates.forEach(([y,m,d],r)=>s.push({t:'C',r,d:dIso(nextDow(dU(y,m,d),r===rn.length-1?6:3)),press:r>=rn.length-2}));}
function cupOpp(c){const cp=c.cup;const me=cp.teams.findIndex(t=>t.name===c.club.name);const p=cp.pairs.find(p=>p[0]===me||p[1]===me);if(!p)return null;return{me,oi:p[0]===me?p[1]:p[0],home:p[0]===me};}
function cupAdvance(c,myWin){const cp=c.cup;const me=cp.teams.findIndex(t=>t.name===c.club.name);const next=[];
 for(const [a,b] of cp.pairs){let w;if((a===me||b===me)&&myWin!==undefined){w=myWin?me:(a===me?b:a);}else{const A=cp.teams[a],B=cp.teams[b],sc=simScore(A.R,B.R);w=koWinner(sc[0],sc[1],A.R,B.R)?a:b;}next.push(w);}
 cp.round++;if(next.length===1){cp.winner=cp.teams[next[0]].name;cp.pairs=[];return;}cp.pairs=[];for(let i=0;i<next.length;i+=2)cp.pairs.push([next[i],next[i+1]]);}
function cupFinish(c){const cp=c.cup;if(!cp||cp.winner)return;let g=0;while(!cp.winner&&g++<8)cupAdvance(c,undefined);}
/* ---- القارية ---- */
function buildCont(c,ti,Y,s,me){c.cont=null;const q=c.contQ;if(!q)return;const conf=CONF_OF(ti.country);const defs=CONT_DEF[conf];const def=defs[Math.min(defs.length-1,(q===2?1:0))];if(!def)return;
 const meT={name:c.club.name,short:c.club.short,kit:c.club.kit,kitArr:c.club.kitArr,R:me.R,cc:ti.country,me:true};
 const K={name:def.n,fmt:def.fmt,ko:def.ko,alive:true,won:false,phase:def.fmt==='ko'?'ko':'g',kr:0,res:{},winner:null};
 if(def.fmt==='swiss'){K.teams=[meT].concat(contClubs(c,conf,meT,def.N-1));K.md=def.md;const opp=shuffle(K.teams.map((_,i)=>i).slice(1)).slice(0,def.md);K.my=opp.map((o,i)=>({o,home:i%2===0}));}
 else if(def.fmt==='groups'){const n=def.G*4;K.teams=[meT].concat(contClubs(c,conf,meT,n-1));K.md=6;const ix=shuffle(K.teams.map((_,i)=>i).slice(1));K.groups=[];K.groups.push([0].concat(ix.slice(0,3)));for(let g=1;g<def.G;g++)K.groups.push(ix.slice(3+(g-1)*4,3+g*4));K.rr=rrDouble(4);}
 else{K.teams=[meT].concat(contClubs(c,conf,meT,15));const ix=shuffle(K.teams.map((_,i)=>i));K.pairs=[];for(let i=0;i<16;i+=2)K.pairs.push([ix[i],ix[i+1]]);}
 K.tab={};K.teams.forEach((_,i)=>K.tab[i]={P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});c.cont=K;
 const gD=def.fmt==='swiss'?[[Y,9,16],[Y,9,30],[Y,10,21],[Y,11,4],[Y,11,25],[Y,12,9],[Y+1,1,20],[Y+1,1,28]]:[[Y,10,14],[Y,10,21],[Y,11,25],[Y,12,2],[Y+1,1,20],[Y+1,1,27]];
 if(def.fmt!=='ko')for(let i=0;i<K.md;i++)s.push({t:'K',st:'g',md:i,d:dIso(nextDow(dU(...gD[i]),2)),press:i===K.md-1});
 const kD=[[Y+1,2,17],[Y+1,3,10],[Y+1,4,7],[Y+1,4,28],[Y+1,5,30]];const off=K.ko.length<kD.length?kD.length-K.ko.length:0;
 K.ko.forEach(([n,legs],r)=>{const base=kD[r+off]||kD[kD.length-1];const t1=nextDow(dU(...base),2);for(let l=1;l<=legs;l++)s.push({t:'K',st:'ko',r,leg:l,legs,d:dIso(t1+(l-1)*7*DAY),press:l===legs});});}
function contStandings(K,ids){return ids.map(i=>Object.assign({i},K.tab[i])).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);}
function contApply(K,a,b,ga,gb){const A=K.tab[a],B=K.tab[b];A.P++;B.P++;A.GF+=ga;A.GA+=gb;B.GF+=gb;B.GA+=ga;if(ga>gb){A.W++;B.L++;A.Pts+=3;}else if(ga<gb){B.W++;A.L++;B.Pts+=3;}else{A.D++;B.D++;A.Pts++;B.Pts++;}}
function contOppG(K,md){if(K.fmt==='swiss'){const x=K.my[md];return{oi:x.o,home:x.home};}const g=K.groups[0];const pr=K.rr[md].find(p=>g[p[0]]===0||g[p[1]]===0);const a=g[pr[0]],b=g[pr[1]];return{oi:a===0?b:a,home:a===0};}
function contGroupDay(K,md,myScore){const sim=(a,b)=>{const A=K.teams[a],B=K.teams[b];const sc=simScore(A.R,B.R);contApply(K,a,b,sc[0],sc[1]);};
 if(K.fmt==='swiss'){const x=K.my[md];if(myScore)contApply(K,0,x.o,myScore[0],myScore[1]);for(let i=1;i<K.teams.length;i++){if(i===x.o)continue;let j;do{j=RI(1,K.teams.length-1);}while(j===i);const A=K.teams[i],B=K.teams[j];const sc=simScore(A.R,B.R);const T=K.tab[i];T.P++;T.GF+=sc[0];T.GA+=sc[1];if(sc[0]>sc[1]){T.W++;T.Pts+=3;}else if(sc[0]===sc[1]){T.D++;T.Pts++;}else T.L++;}}
 else K.groups.forEach((g,gi)=>{for(const [p,q] of K.rr[md]){const a=g[p],b=g[q];if(a===0||b===0){if(myScore)contApply(K,a,b,a===0?myScore[0]:myScore[1],a===0?myScore[1]:myScore[0]);continue;}sim(a,b);}});}
function contAfterGroups(K){let q=[];if(K.fmt==='swiss'){const st=contStandings(K,K.teams.map((_,i)=>i));K.final=st.map(x=>x.i);const top8=K.final.slice(0,8);
  if(K.ko[0][0]==='الملحق'){const po=K.final.slice(8,24);K.direct=top8;K.pairs=[];for(let i=0;i<8;i++)K.pairs.push([po[i],po[15-i]]);K.kr=0;if(top8.includes(0)){K.kr=1;K.pairs=null;K.skipPO=true;}else if(!po.includes(0)){K.alive=false;}}
  else{const top=K.final.slice(0,8);const east=['أوراوا الأحمر','يوكوهاما الأزرق','كاواساكي الأزرق','أولسان الأزرق','جيونبوك الأخضر','بوهانغ الأحمر','شنغهاي بورت الأحمر','بوريرام الأزرق'].map((n,i)=>({name:n,short:n.split(' ')[0],kit:(i*3+2)%KITS.length,R:RI(74,80),cc:'US'}));const base=K.teams.length;east.forEach((t,i)=>{K.teams.push(t);K.tab[base+i]={P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0};});K.pairs=pairUp(top.concat(east.map((_,i)=>base+i)));K.kr=0;if(!top.includes(0))K.alive=false;}}
 else{K.groups.forEach(g=>{const st=contStandings(K,g);q.push(st[0].i,st[1].i);});const A=q.filter((_,i)=>i%2===0),B=shuffle(q.filter((_,i)=>i%2===1));K.pairs=A.map((a,i)=>[a,B[(i+1)%B.length]]);K.kr=0;if(!q.includes(0))K.alive=false;}
 K.phase='ko';}
function pairUp(ids){const s=shuffle(ids);const p=[];for(let i=0;i+1<s.length;i+=2)p.push([s[i],s[i+1]]);return p;}
function contKoResolve(K,myWin){const winners=[];const pairs=K.skipPO&&K.kr===1&&!K.pairs?null:K.pairs;
 if(K.kr===0&&K.ko[0][0]==='الملحق'){for(const [a,b] of K.pairs){let w;if(a===0||b===0)w=myWin?0:(a===0?b:a);else{const sc=simScore(K.teams[a].R,K.teams[b].R);w=koWinner(sc[0],sc[1],K.teams[a].R,K.teams[b].R)?a:b;}winners.push(w);}
  K.pairs=pairUp(K.direct.concat(winners));K.kr=1;if(!K.pairs.flat().includes(0))K.alive=false;return;}
 for(const [a,b] of K.pairs){let w;if(a===0||b===0)w=myWin?0:(a===0?b:a);else{const sc=simScore(K.teams[a].R,K.teams[b].R);w=koWinner(sc[0],sc[1],K.teams[a].R,K.teams[b].R)?a:b;}winners.push(w);}
 K.kr++;if(winners.length===1){K.winner=K.teams[winners[0]].name;K.pairs=[];if(winners[0]===0)K.won=true;K.alive=false;return;}
 K.pairs=[];for(let i=0;i<winners.length;i+=2)K.pairs.push([winners[i],winners[i+1]]);if(!winners.includes(0))K.alive=false;}
function contFinish(c){const K=c.cont;if(!K||K.winner)return;
 if(K.phase==='g'){for(let md=(K.mdDone||0);md<K.md;md++)contGroupDay(K,md,null);contAfterGroups(K);}
 let k=0;while(!K.winner&&k++<8){if(K.kr===1&&K.skipPO&&!K.pairs){K.pairs=pairUp(K.direct.concat(K.final.slice(8,16)));}contKoResolve(K,false);}}
function contKoOpp(K){if(K.kr===1&&K.skipPO&&!K.pairs){K.pairs=pairUp(K.direct.concat(shuffle(K.final.slice(8,24)).slice(0,8)));}const p=(K.pairs||[]).find(p=>p[0]===0||p[1]===0);return p?{oi:p[0]===0?p[1]:p[0],home:p[0]===0}:null;}
/* ---- المنتخب: تصفيات/ودية/بطولة ---- */
function buildNat(c,Y,W,s){const conf=CONF_OF(c.nat);const H=CBY[c.nat];const nextT=tournFor(conf,Y+1);c.ntc={conf,Y};
 const opp=CONF_NATS[conf].filter(n=>n!==H.n);
 if(nextT){const g=[natTeam(c.nat)].concat(shuffle(opp).slice(0,4).map(natByName));c.ntc.q={name:'تصفيات '+nextT.n,teams:g,rr:rrDouble(6),tab:g.map(()=>({P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0})),rd:0,done:false,qual:null};c.ntc.T=nextT;}
 else c.ntc.fr=shuffle(opp.concat(['البرازيل','الأرجنتين','فرنسا','إسبانيا','اليابان','السنغال'].filter(n=>n!==H.n))).map(natByName);
 let k=0;W.forEach(([a,b])=>{s.push({t:'N',kind:c.ntc.q?'q':'f',n:k++,d:dIso(a)});s.push({t:'N',kind:c.ntc.q?'q':'f',n:k++,d:dIso(b)});});
 const jan=conf==='as'&&ASIAN_CUP_JAN[Y+1];if(jan){c.ntc.jan={n:jan};for(let i=0;i<7;i++)s.push({t:'N',kind:'T',jan:true,n:i,d:dIso(dU(Y+1,1,8)+i*4*DAY),press:i>=3});}
 if(nextT)for(let i=0;i<8;i++)s.push({t:'N',kind:'T',n:i,d:dIso(dU(Y+1,6,14)+i*4*DAY),press:i>=3});}
function ntQOpp(c,n){const Q=c.ntc.q;// جولات الدوري بـ6 مقاعد (المقعد 5 = راحة)
 while(Q.rd<10){const r=Q.rr[Q.rd];const mine=r.find(p=>p[0]===0||p[1]===0);const other=mine[0]===0?mine[1]:mine[0];if(other===5){ntQSimRound(c,Q.rd,null);Q.rd++;continue;}return{oi:other,home:mine[0]===0};}return null;}
function ntQSimRound(c,rd,my){const Q=c.ntc.q;for(const [a,b] of Q.rr[rd]){if(a===5||b===5)continue;if(a===0||b===0){if(my){const A=a===0?my[0]:my[1],B=a===0?my[1]:my[0];ntApply(Q,a,b,A,B);}continue;}const sc=simScore(Q.teams[a].R,Q.teams[b].R);ntApply(Q,a,b,sc[0],sc[1]);}}
function ntApply(Q,a,b,ga,gb){const A=Q.tab[a],B=Q.tab[b];A.P++;B.P++;A.GF+=ga;A.GA+=gb;B.GF+=gb;B.GA+=ga;if(ga>gb){A.W++;B.L++;A.Pts+=3;}else if(ga<gb){B.W++;A.L++;B.Pts+=3;}else{A.D++;B.D++;A.Pts++;B.Pts++;}}
function ntQFinish(c){const Q=c.ntc&&c.ntc.q;if(!Q||Q.done)return;while(Q.rd<10){ntQSimRound(c,Q.rd,null);Q.rd++;}Q.done=true;const st=Q.tab.map((t,i)=>Object.assign({i},t)).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA));const pos=st.findIndex(x=>x.i===0)+1;
 const host=(c.ntc.T.wc&&['ES','PT','MA'].includes(c.nat));Q.pos=pos;Q.qual=host||pos===1||(pos===2&&(!c.ntc.T.wc||Math.random()<.5))||(pos===3&&!c.ntc.T.wc&&c.ntc.T.N>=24&&Math.random()<.35);
 addNews(c,'world',Q.qual?'منتخب '+CBY[c.nat].n+' يتأهل رسمياً لـ'+c.ntc.T.n+'!':'منتخب '+CBY[c.nat].n+' يفشل في التأهل لـ'+c.ntc.T.n+' (المركز '+pos+')',Q.qual);}
function ntTourn(c,jan){const key=jan?'tj':'tt';if(c.ntc[key])return c.ntc[key];const conf=c.ntc.conf;const T=jan?(c.ntc.jan?{n:c.ntc.jan.n,N:24}:null):c.ntc.T;if(!T)return null;const pool=(T.wc?['البرازيل','الأرجنتين','فرنسا','إسبانيا','إنجلترا','ألمانيا','البرتغال','هولندا','المغرب','اليابان','السنغال','المكسيك','أمريكا','كولومبيا','أوروجواي','كوريا']:CONF_NATS[conf]).filter(n=>n!==CBY[c.nat].n);
 const g=[natTeam(c.nat)].concat(shuffle(pool).slice(0,3).map(natByName));const X={name:T.n,wc:!!T.wc,N:T.N,teams:g,tab:g.map(()=>({P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0})),gm:0,ko:-1,alive:true,won:false,koOpp:null,pool};
 X.rn=T.N===48?['دور الـ32','دور الـ16','ربع النهائي','نصف النهائي','النهائي']:T.N===24?['دور الـ16','ربع النهائي','نصف النهائي','النهائي']:['ربع النهائي','نصف النهائي','النهائي'];c.ntc[key]=X;return X;}
function ntQualified(c){const Q=c.ntc.q;if(!Q)return false;if(!Q.done){let lastQ=-1;c.sched.forEach((x,i)=>{if(x.t==='N'&&x.kind==='q')lastQ=i;});if(c.si<=lastQ)return false;ntQFinish(c);}return Q.qual;}
function ntTournValid(c,f){const X=f.jan?c.ntc.jan&&ntTourn(c,true):(ntQualified(c)?ntTourn(c,false):null);if(!X||!X.alive)return false;if(f.n<3)return X.gm===f.n;return X.gm===3&&X.ko===f.n-3&&f.n-3<X.rn.length;}
/* ================= صلاحية المواعيد ومعلوماتها ================= */
function fixValid(c,f){if(f.t==='C')return !!c.cup&&c.cup.alive&&c.cup.round===f.r;
 if(f.t==='K'){const K=c.cont;if(!K||!K.alive)return false;if(f.st==='g')return K.phase==='g'&&(K.mdDone||0)===f.md;return K.phase==='ko'&&K.kr===f.r&&(f.leg===1?!K.leg1:!!K.leg1);}
 if(f.t==='N'){if(!c.ntc)return false;if(f.kind==='T')return c.intl.called&&ntTournValid(c,f);if(!c.intl.called){if(f.kind==='q'&&c.ntc.q){/* بيتلعب من غيرك */}return false;}return true;}
 return true;}
function skipInvalid(c){while(c.si<c.sched.length&&!fixValid(c,c.sched[c.si]))c.si++;}
const RNAME=['ربع النهائي','نصف النهائي','النهائي'];
function fixInfo(c,f){const base={d:f.d};
 if(f.t==='L'){const lg=c.league,pr=lg.rounds[f.md].find(p=>p[0]===0||p[1]===0);const oi=pr[0]===0?pr[1]:pr[0];return Object.assign(base,{opp:lg.teams[oi],oi,comp:c.tierName,label:'الجولة '+(f.md+1),short:'دوري',k:'L',home:pr[0]===0});}
 if(f.t==='C'){const o=cupOpp(c);const cp=c.cup;return Object.assign(base,{opp:o?cp.teams[o.oi]:cp.teams[1],home:o?o.home:true,comp:cp.name,label:cp.rn[f.r],short:'كأس',k:'C',big:f.r>=cp.rn.length-2,ko:true});}
 if(f.t==='K'){const K=c.cont;let o;if(f.st==='g')o=contOppG(K,f.md);else{o=contKoOpp(K);if(o&&f.leg===2)o.home=!o.home;}const oi=o?o.oi:1;
  return Object.assign(base,{opp:K.teams[oi],oi,home:o?o.home:true,comp:K.name,label:f.st==='g'?(K.fmt==='swiss'?'مرحلة الدوري — الجولة '+(f.md+1):'دور المجموعات — الجولة '+(f.md+1)):K.ko[f.r][0]+(f.legs===2?(f.leg===1?' (ذهاب)':' (إياب)'):''),short:'قارية',k:'K',big:true,ko:f.st==='ko'});}
 if(f.t==='N'){const H=CBY[c.nat];let opp,label,comp;
  if(f.kind==='q'){const o=ntQOpp(c,f.n)||{oi:1,home:true};opp=c.ntc.q.teams[o.oi];comp=c.ntc.q.name;label='الجولة '+(Math.min(10,c.ntc.q.rd+1));base.home=o.home;}
  else if(f.kind==='f'){opp=c.ntc.fr[f.n%c.ntc.fr.length];comp='مباراة دولية ودية';label='منتخب '+H.n;}
  else{const X=ntTourn(c,!!f.jan)||ntTourn(c,!f.jan);if(!X){opp=natByName('اليابان');comp='مباراة دولية ودية';label='';return Object.assign(base,{opp,comp,label,short:'منتخب',k:'N',nat:true});}comp=X.name;if(X.gm<3){opp=X.teams[X.gm+1];label='دور المجموعات — الماتش '+(X.gm+1);}else{if(!X.koOpp)X.koOpp=natByName(pick(X.pool));opp=X.koOpp;label=X.rn[X.ko];}base.ko=X.gm>=3;}
  return Object.assign(base,{opp,comp,label,short:'منتخب',k:'N',big:true,nat:true});}}
/* ================= بعد الماتش ================= */
function compAfter(c,f,info,score,news,s){let koWon=null;const res=Math.sign(score[0]-score[1]);
 const trophy=(name,k)=>{c.trophies.push({n:name,s:c.season,k});(App.troQ=App.troQ||[]).push({comp:name,team:k==='N'?'منتخب '+CBY[c.nat].n:c.club.name,k:k==='N'?natKit(c.nat):kitOf(c.club),me:!!s,num:c.num});news.push('أبطال '+name+'!!');addNews(c,'me',(k==='N'?'منتخب '+CBY[c.nat].n:c.club.name)+' يتوج بلقب '+name+'!',true);c.morale=clamp(c.morale+10,0,100);c.fans=clamp(c.fans+8,0,100);c.followers+=Math.round(c.followers*.15+500);c.money+=c.contract.wage*4;};
 if(f.t==='C'){koWon=koWinner(score[0],score[1],home_R(c,info),info.opp.R);if(res===0)news.push(koWon?'كسبنا بضربات الترجيح!':'خسرنا بضربات الترجيح…');cupAdvance(c,koWon);if(!koWon){c.cup.alive=false;cupFinish(c);addNews(c,'league',c.club.name+' يودّع '+c.cup.name+' من '+info.label);}else if(c.cup.winner){c.cup.won=true;c.cup.alive=false;trophy(c.cup.name,'C');}}
 if(f.t==='K'){const K=c.cont;if(f.st==='g'){contGroupDay(K,f.md,info.home?score:[score[0],score[1]]);K.mdDone=(K.mdDone||0)+1;if(K.mdDone>=K.md){contAfterGroups(K);news.push(K.alive?'اتأهلنا للأدوار الإقصائية في '+K.name+'!':'خرجنا من '+K.name);addNews(c,'me',K.alive?c.club.name+' يتأهل لإقصائيات '+K.name:c.club.name+' يودّع '+K.name+' من الدور الأول');}}
  else{if(f.legs===2&&f.leg===1){K.leg1=[score[0],score[1]];}else{const agg=f.legs===2?[K.leg1[0]+score[0],K.leg1[1]+score[1]]:score;K.leg1=null;koWon=agg[0]!==agg[1]?agg[0]>agg[1]:koWinner(0,0,home_R(c,info),info.opp.R);if(f.legs===2)news.push('مجموع المباراتين '+agg[0]+'-'+agg[1]+(agg[0]===agg[1]?(koWon?' وكسبنا بالترجيح':' وخسرنا بالترجيح'):''));else if(res===0)news.push(koWon?'كسبنا بضربات الترجيح!':'خسرنا بضربات الترجيح…');
   contKoResolve(K,koWon);if(K.won)trophy(K.name,'K');else if(!koWon){contFinish(c);addNews(c,'league',K.name+': '+c.club.name+' يخرج من '+info.label.replace(/ \(.*\)/,''));}}}}
 if(f.t==='N'){if(s){c.intl.caps++;c.intl.g+=s.g;}
  if(f.kind==='q'){const Q=c.ntc.q;ntQSimRound(c,Q.rd,info.home?score:[score[0],score[1]]);Q.rd++;}
  if(f.kind==='T'){const X=ntTourn(c,!!f.jan)||ntTourn(c,!f.jan);if(X)if(X.gm<3){const i=X.gm+1;ntApply(X,0,i,score[0],score[1]);const o=[1,2,3].filter(x=>x!==i);const sc=simScore(X.teams[o[0]].R,X.teams[o[1]].R);ntApply(X,o[0],o[1],sc[0],sc[1]);X.gm++;
    if(X.gm===3){const st=X.tab.map((t,j)=>Object.assign({j},t)).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA));const p=st.findIndex(x=>x.j===0)+1;const adv=p<=2||(p===3&&X.N>16&&(X.tab[0].Pts>=4||X.tab[0].Pts===3&&Math.random()<.5));if(adv){X.ko=0;news.push('اتأهلنا من المجموعة في '+X.name+'!');}else{X.alive=false;news.push('خرجنا من دور المجموعات في '+X.name);}addNews(c,'world','منتخب '+CBY[c.nat].n+(adv?' يتأهل لـ'+X.rn[0]+' في '+X.name:' يودّع '+X.name+' من دور المجموعات'),adv);}}
   else{koWon=koWinner(score[0],score[1],natR(c.nat),info.opp.R);if(res===0)news.push(koWon?'كسبنا بضربات الترجيح!':'خسرنا بضربات الترجيح…');X.koOpp=null;if(koWon){X.ko++;if(X.ko>=X.rn.length){X.won=true;X.alive=false;trophy(X.name,'N');}}else{X.alive=false;addNews(c,'world','منتخب '+CBY[c.nat].n+' يودّع '+X.name+' من '+info.label);}}}}
 return koWon;}
/* نهاية الموسم: كمّل البطولات اللي خرجت منها عشان الأخبار */
function seasonWrap(c){cupFinish(c);if(c.cup&&c.cup.winner&&!c.cup.won)addNews(c,'league',c.cup.winner+' بطل '+c.cup.name);if(c.cont){contFinish(c);if(c.cont.winner&&!c.cont.won)addNews(c,'world',c.cont.winner+' بطل '+c.cont.name);}if(c.ntc&&c.ntc.q)ntQFinish(c);}
/* ---- أهداف الموسم ---- */
function makeObjectives(c){const t=c.path.tier,n=c.league.rounds.length,gT=Math.round(({ST:.55,RW:.4,LW:.4,CAM:.3,CM:.18}[c.pos])*n*(.7+Math.min(t,4)*.08)),aT=Math.round(({ST:.18,RW:.28,LW:.28,CAM:.38,CM:.28}[c.pos])*n*.7);
 const N=c.league.N||8;c.obj=[{k:'apps',n:'العب '+Math.round(n*.6)+' ماتش',t:Math.round(n*.6)},{k:'g',n:'سجّل '+gT+' هدف',t:gT},{k:'a',n:'اصنع '+aT+' أهداف',t:aT},{k:'avg',n:'متوسط تقييم 6.8',t:6.8},{k:'pos',n:t<3&&curTier(c).domestic?'الصعود (أول اتنين)':'خلّص في أول 4',t:t<3&&curTier(c).domestic?2:4}];}
function objProg(c,o){const avg=c.ss.apps?c.ss.rs/c.ss.apps:0;const pos=sortTable(c.league).findIndex(x=>x.me)+1;
 if(o.k==='apps')return[c.ss.apps,c.ss.apps>=o.t];if(o.k==='g')return[c.ss.g,c.ss.g>=o.t];if(o.k==='a')return[c.ss.a,c.ss.a>=o.t];if(o.k==='avg')return[avg,avg>=o.t&&c.ss.apps>=3];return[pos,pos<=o.t&&c.league.md>0];}
/* ================= التقويم ================= */
function calendarHTML(c){const K={L:['دوري','#C6F432'],C:['كأس','#F5C542'],K:['قارية','#4FC3F7'],N:['منتخب','#FF5A5F']};let h='',mon='';
 c.sched.forEach((f,i)=>{const valid=i>=c.si?fixValid(c,f)||i===c.si:!!f.res;if(i>=c.si&&!valid&&!(f.t==='K'||f.t==='C'||(f.t==='N'&&c.intl.called)))return;if(i>c.si&&!valid&&((f.t==='C'&&!c.cup.alive)||(f.t==='K'&&!c.cont.alive)))return;if(i<c.si&&!f.res)return;
  const m=f.d.slice(0,7);if(m!==mon){mon=m;const d=new Date(f.d+'T00:00:00Z');h+=`<div class="calm">${AR_MON[d.getUTCMonth()]} ${d.getUTCFullYear()}</div>`;}
  let opp='',lab='';if(i<c.si){opp=f.res.opp;lab=f.res.label;}else if(i>c.si&&f.t==='N'&&f.kind==='q'){opp=c.ntc.q?c.ntc.q.name:'تصفيات';lab='';}else if(i>c.si&&((f.t==='C'&&f.r!==c.cup.round)||(f.t==='K'&&f.st==='ko'&&(c.cont.phase!=='ko'||f.r!==c.cont.kr))||(f.t==='N'&&f.kind==='T'))){opp='لو اتأهلنا';lab='';}else if(valid){try{const inf=fixInfo(c,f);opp=inf.opp.name+(inf.home===false?' (برّه)':inf.home?' (ملعبنا)':'');lab=inf.label;}catch(e){opp='—';}}else{opp='لو اتأهلنا';lab='';}
  h+=`<div class="calr ${i===c.si?'now':''} ${i<c.si?'done':''}"><span class="cd">${dTxt(f.d,true)}</span><span class="ck" style="background:${K[f.t][1]}">${K[f.t][0]}</span><span class="co">${esc(opp)}<small>${esc(lab||'')}</small></span><span class="cr">${f.res?f.res.sc:i===c.si?'الجاي':''}</span></div>`;});
 return h||'<div class="sub">مافيش مواعيد</div>';}
