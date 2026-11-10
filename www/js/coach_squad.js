// أنت المدرب — نموذج الفريق: التشكيلة، اللياقة، الاقتصاد، سوق الانتقالات، المنشآت
'use strict';
const TSC=[8e3,4e4,2e5,1e6,4e6,1e7,2.5e7,5e7];           // مقياس مالي حسب الدرجة
const ROLE_AR={GK:'حارس',DF:'دفاع',MF:'وسط',FW:'هجوم'};
let _uid=1;
function tsOf(c){return TSC[Math.min(7,c.path.tier)];}
function pVal(ov,age){const a=age<=21?1.5:age<=25?1.2:age<=29?1:age<=32?.65:.35;return Math.max(1000,Math.round(1000*Math.pow(1.25,ov-40)*a/1000)*1000);}
function ensureIds(S){for(const p of S){if(!p.id)p.id='p'+Date.now().toString(36)+(_uid++);if(p.fit==null)p.fit=100;if(p.inj==null)p.inj=0;if(!p.cs)p.cs={g:0,a:0,apps:0,rs:0};if(!p.pot)p.pot=Math.min(95,p.ov+(p.age<=21?RI(4,12):p.age<=25?RI(1,5):0));}return S;}
function myClubDef(c){return Object.assign({cc:c.club.cc||c.path.home},c.club,{R:c.club.R||(c.league&&c.league.teams[0].R)||50});}
function mySquad(c){wInit(c);const club=myClubDef(c);let S=getSquad(c,club);
 if(S.length<22){const avoid=new Set(S.map(p=>p.n));for(const r of['GK','DF','DF','MF','MF','FW']){if(S.length>=22)break;const y=genSquadPlayer(c,club,r,avoid);y.age=RI(17,30);S.push(y);}}
 return ensureIds(S);}
function pById(c,id){return mySquad(c).find(p=>p.id===id);}
function scoreP(p){return p.ov*(.8+.2*p.fit/100);}
/* ---- التشكيلة ---- */
function lineup(c){const S=mySquad(c);let L=c.cl;if(!L)L=c.cl={form:'4-3-3',tac:'bal',auto:true,xi:[],bench:[]};
 const ok=L.xi.length===11&&L.xi.every(id=>{const p=S.find(q=>q.id===id);return p&&!p.inj;});if(L.auto||!ok)autoPick(c,!L.auto);return L;}
function autoPick(c,keep){const L=c.cl,S=mySquad(c);const av=S.filter(p=>!p.inj);const used=new Set(),xi=[];
 if(keep)for(const id of L.xi){const p=av.find(q=>q.id===id);if(p&&!used.has(id)){used.add(id);xi.push(p);}}
 const cnt={GK:0,DF:0,MF:0,FW:0};(FORMS[L.form]||F433).forEach(s=>cnt[s.r]++);xi.forEach(p=>cnt[p.r]--);
 const best=(f)=>av.filter(q=>!used.has(q.id)&&f(q)).sort((a,b)=>scoreP(b)-scoreP(a))[0];
 for(const r of['GK','DF','MF','FW'])while(cnt[r]>0){const p=best(q=>q.r===r)||best(()=>true);if(!p)break;used.add(p.id);xi.push(p);cnt[r]--;}
 const bench=[];for(const r of['DF','MF','MF','FW','FW']){const p=best(q=>q.r===r&&!bench.includes(q))||best(q=>!bench.includes(q));if(p){bench.push(p);used.add(p.id);}}
 L.xi=xi.map(p=>p.id);L.bench=bench.map(p=>p.id);}
function xiOf(c){const L=lineup(c),S=mySquad(c);return L.xi.map(id=>S.find(p=>p.id===id)).filter(Boolean);}
function updR(c){if(!c.league)return;const xi=xiOf(c);const a=xi.reduce((s,p)=>s+p.ov*(.88+.12*p.fit/100),0)/(xi.length||1);c.league.teams[0].R=Math.round(clamp(a+2+(c.morale-60)/30,30,95));return c.league.teams[0].R;}
function chemNote(c){const xi=xiOf(c);const m=xi.reduce((s,p)=>s+p.fit,0)/(xi.length||1);return Math.round(m);}
/* ---- الماتش: تعريف الفريق ---- */
function coachHomeDef(c,info){const S=mySquad(c),L=lineup(c);updR(c);
 let xi=L.xi.map(id=>S.find(p=>p.id===id)).filter(Boolean),bench=L.bench.map(id=>S.find(p=>p.id===id)).filter(Boolean);
 if(c.guest){const g=c.guest;const i=xi.map((p,k)=>[p,k]).filter(([p])=>p.r===g.r).sort((a,b)=>a[0].ov-b[0].ov)[0];if(i)xi[i[1]]=g;else xi[xi.length-1]=g;}
 return{name:c.club.name,short:c.club.short,kit:c.club.kit,kitArr:c.club.kitArr,R:c.league.teams[0].R,nm:CBY[c.club.cc||c.path.home].nm,form:L.form,tac:L.tac,sq:S,lineup:{xi,bench}};}
/* ---- بعد الماتش: لياقة وإحصائيات وإصابات ---- */
function afterMatchSquad(c,r,played){const S=mySquad(c);const L=c.cl;const med=(c.fac&&c.fac.med)||0,tr=(c.fac&&c.fac.train)||0;const inj=[];
 const names={};if(r&&r.pl)for(const p of r.pl)if(p.ti===0)names[p.n]=p;
 const xiIds=new Set(L.xi);const bIds=new Set(L.bench);
 for(const p of S){const o=names[p.n];const start=xiIds.has(p.id);const came=!start&&o&&(o.st.p||o.st.tk||o.st.sh||o.st.g);
  if(p.inj>0){p.inj--;p.fit=Math.min(100,p.fit+8+med*3);continue;}
  if(played&&(start||came)){p.fit=Math.max(10,p.fit-(start?RI(14,22):RI(5,9)));p.cs.apps++;if(o){p.cs.g+=o.st.g||0;p.cs.a+=o.st.a||0;const t=Math.sign(r.score[0]-r.score[1]);p.cs.rs+=rate(o.st,t);}else p.cs.rs+=6.4;
   const risk=.025*(p.fit<40?2.2:1)*(1-med*.12);if(Math.random()<risk){p.inj=RI(1,5);inj.push(p);}
   if(p.age<=23&&Math.random()<.03+tr*.012+(p.cs.apps%10===0?.05:0)&&p.ov<p.pot){p.ov++;for(const k in p.st)if(k!=='gk'||p.r==='GK')p.st[k]=clamp(p.st[k]+1,20,99);}}
  else p.fit=Math.min(100,p.fit+RI(8,13)+tr*2);}
 return inj;}
function squadAvgFit(c){const S=mySquad(c);return Math.round(S.reduce((s,p)=>s+p.fit,0)/S.length);}
/* ---- الاقتصاد ---- */
function wageBill(c){const S=mySquad(c);return Math.round(tsOf(c)*.7*(S.length/22)*(.85+(c.league.teams[0].R-50)/260));}
function gateIncome(c,home){if(!home)return 0;const f=(c.fans||50)/100;const st=(c.fac&&c.fac.stad)||0;return Math.round(tsOf(c)*(.45+f*.9)*(1+st*.18));}
function sponsorPerMatch(c){return Math.round(tsOf(c)*.2*(1+(c.rep||0)/70));}
function startBudget(c,bonus){return Math.round(tsOf(c)*(22+(bonus||0)*6));}
/* ---- سوق الانتقالات ---- */
function genMarket(c){const lg=c.league,out=[];const club=myClubDef(c);const R0=lg.teams[0].R;
 const srcs=lg.teams.slice(1).sort(()=>Math.random()-.5).slice(0,10);
 for(const t of srcs){const S=getSquad(c,Object.assign({cc:c.path.abroad[c.path.tier]||c.path.home},t));const cands=S.filter(p=>p.ov>=R0-7&&p.ov<=R0+11);if(!cands.length)continue;const p=pick(cands);ensureIds([p]);out.push({club:t.name,pid:p.id,p,price:Math.round(pVal(p.ov,p.age)*R(.95,1.3)/1000)*1000});}
 for(let i=0;i<4;i++){const nmf=CBY[c.club.cc||c.path.home].nm;const r=pick(['GK','DF','DF','MF','MF','FW','FW']);const age=RI(19,33);const ov=clamp(Math.round(R0+R(-6,7)),35,90);const p={n:randName(nmf),r,ov,age,st:genStats(ov,r)};ensureIds([p]);out.push({club:null,pid:p.id,p,price:Math.round(pVal(ov,age)*.35/1000)*1000});}
 c.mk={md:lg.md,si:c.si,list:out.sort((a,b)=>b.p.ov-a.p.ov)};return c.mk;}
function market(c){if(!c.mk||c.mk.season!==c.season||Math.abs((c.league?c.league.md:0)-c.mk.md)>=4){genMarket(c);c.mk.season=c.season;}return c.mk;}
function buyPlayer(c,it){if(c.natJob)return'السوق مقفول أثناء مهمة المنتخب';const S=mySquad(c);if(c.money<it.price)return'مفيش ميزانية كفاية';if(S.length>=26)return'التشكيلة ممتلئة (26 لاعب)';
 c.money-=it.price;if(it.club){const W=wInit(c);const L=W.sq&&W.sq[it.club];if(L){const i=L.findIndex(q=>q.id===it.p.id||q.n===it.p.n);if(i>=0)L.splice(i,1);}}
 const p=Object.assign({},it.p);p.fit=100;S.push(p);c.mk.list=c.mk.list.filter(x=>x!==it);addNews(c,'transfer','رسمياً: '+c.club.name+' يضم '+p.n+(it.club?' من '+it.club:' (لاعب حر)')+' مقابل '+money(it.price),it.price>tsOf(c)*10);
 if(c.cl&&c.cl.auto)autoPick(c);store();return null;}
function sellPlayer(c,p){if(c.natJob)return'السوق مقفول أثناء مهمة المنتخب';const S=mySquad(c);if(S.length<=18)return'لازم يفضل 18 لاعب على الأقل';if(p.r==='GK'&&S.filter(q=>q.r==='GK').length<=2)return'لازم يفضل حارسين';
 const price=Math.round(pVal(p.ov,p.age)*.85/1000)*1000;const i=S.indexOf(p);S.splice(i,1);c.money+=price;if(c.cl){c.cl.xi=c.cl.xi.filter(x=>x!==p.id);c.cl.bench=c.cl.bench.filter(x=>x!==p.id);autoPick(c,true);}
 addNews(c,'transfer','رسمياً: '+c.club.name+' يبيع '+p.n+' مقابل '+money(price));store();return price;}
/* ---- المنشآت ---- */
const FAC={train:['مركز التدريب','لياقة أسرع وتطور أسرع للصغار'],youth:['أكاديمية الناشئين','مواهب شابة جديدة كل موسم'],stad:['الاستاد','دخل تذاكر أعلى'],med:['الجهاز الطبي','إصابات أقل وعلاج أسرع']};
function facCost(c,k){const l=(c.fac&&c.fac[k])||0;return Math.round(tsOf(c)*(6+l*7));}
function upgradeFac(c,k){c.fac=c.fac||{train:0,youth:0,stad:0,med:0};if(c.fac[k]>=5)return'وصلت للحد الأقصى';const cost=facCost(c,k);if(c.money<cost)return'الميزانية مش كفاية';c.money-=cost;c.fac[k]++;addNews(c,'me',c.club.name+' يطوّر '+FAC[k][0]+' للمستوى '+c.fac[k]);store();return null;}
function youthIntake(c){const S=mySquad(c);const lv=(c.fac&&c.fac.youth)||0;const n=1+(lv>=3?1:0);const out=[];
 for(let i=0;i<n;i++){const club=myClubDef(c);const avoid=new Set(S.map(p=>p.n));const r=pick(['DF','MF','FW','MF','FW','GK']);const y=genSquadPlayer(c,club,r,avoid);y.age=RI(16,18);y.ov=clamp(Math.round(c.league.teams[0].R-RI(10,16)+lv*2),30,80);y.st=genStats(y.ov,y.r);y.pot=Math.min(94,y.ov+RI(8,18)+lv*2);ensureIds([y]);y.pot=Math.min(94,y.ov+RI(8,18)+lv*2);if(S.length<26){S.push(y);out.push(y);}}
 return out;}
