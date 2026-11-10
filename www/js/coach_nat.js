// أنت المدرب — تدريب منتخب قبل البطولة الكبيرة والرجوع للنادي بعدها
'use strict';
/* مفيش إيراد/رواتب نادي أثناء مهمة المنتخب */
(function(){const wb=wageBill,gi=gateIncome,sp=sponsorPerMatch;wageBill=c=>c.natJob?0:wb(c);gateIncome=(c,h)=>c.natJob?0:gi(c,h);sponsorPerMatch=c=>c.natJob?0:sp(c);})();
function natOffers(c){const Y=seasonYear(c);const all=[];for(const cc in CBY){const T=tournFor(CONF_OF(cc),Y+1);if(T)all.push({cc,T});}
 if(!all.length)return[];const mine=all.filter(o=>o.cc===c.nat),rest=shuffle(all.filter(o=>o.cc!==c.nat));return mine.concat(rest).slice(0,3);}
function natModal(c,O){const Y=seasonYear(c)+1;
 Media.showModal(`<div class="evh">اتحاد الكرة بيتصل بيك</div><div class="ttl" style="font-size:18px;margin:6px 0">عايزينك تقود منتخبنا في بطولة قدّام</div><div class="sub" style="margin-bottom:10px">هتسيب ناديك مؤقتاً لحد ما البطولة تخلص وبعدها ترجع لنفس التشكيلة والميزانية.</div>
 <div class="col" style="gap:8px">${O.map((o,i)=>`<button class="btn gold" data-n="${i}">منتخب ${esc(CBY[o.cc].n)} — ${esc(o.T.n)} ${Y}</button>`).join('')}<button class="btn ghost" id="nNo">لا شكراً، أكمّل مع ناديّ</button></div>`,m=>{
  [...m.querySelectorAll("[data-n]")].forEach(b=>b.onclick=()=>{Media.closeModal();startNatJob(c,O[+b.dataset.n]);});$('nNo').onclick=()=>{Media.closeModal();seasonEnd();};});}
function startNatJob(c,o){const C=CBY[o.cc],Y=seasonYear(c);
 c.natJob={cc:o.cc,T:o.T.n,orig:{club:c.club,cl:c.cl,nat:c.nat,board:c.board,money:c.money,morale:c.morale,fans:c.fans,R:c.league.teams[0].R,ntc:c.ntc,guest:c.guest,mk:c.mk,called:c.intl.called}};
 c.club={name:'منتخب '+C.n,short:C.n,kit:0,kitArr:natKit(o.cc),cc:o.cc,R:natR(o.cc),nat:true};c.cl=null;c.guest=null;c.mk=null;c.nat=o.cc;
 c.ntc={conf:CONF_OF(o.cc),Y,T:o.T,q:{name:'',teams:[],tab:[],rr:[],rd:10,done:true,qual:true,pos:1}};c.intl.called=true;
 c.sched=c.sched.filter(x=>!(x.t==='N'&&x.kind==='T'));let last=c.sched.length?Date.parse(c.sched[c.sched.length-1].d+'T00:00:00Z'):0;const t0=Math.max(dU(Y+1,6,14),last+7*DAY);const base=c.sched.length;
 for(let i=0;i<8;i++)c.sched.push({t:'N',kind:'T',n:i,d:dIso(t0+i*4*DAY),press:i>=3});c.si=base;
 mySquad(c);lineup(c);updR(c);addNews(c,'me',c.name+' يتولى تدريب منتخب '+C.n+' في '+o.T.n,true);store();show('hub');}
function endNatJob(c){const J=c.natJob,O=J.orig;const X=c.ntc&&(c.ntc.tt);const won=!!(X&&X.won),sal=salaryM(c);const rnd=X?(X.gm<3?1:2+X.ko):0;
 const pay=Math.round(sal*(8+rnd*3+(won?25:0)));cc2(c);c.wallet+=pay;c.earn+=pay;const repG=won?8:X&&X.gm>=3?4:1;
 c.club=O.club;c.cl=O.cl;c.nat=O.nat;c.ntc=O.ntc;c.board=O.board;c.money=O.money;c.morale=O.morale;c.fans=O.fans;c.guest=O.guest;c.mk=O.mk;c.intl.called=O.called;c.league.teams[0].R=O.R;
 c.rep=clamp((c.rep||0)+repG,0,100);c.natJob=null;try{lineup(c);updR(c);}catch(e){}
 const msg=(won?'🏆 أبطال '+J.T+'!':X&&X.alive===false?'انتهت مشاركة المنتخب في '+J.T:'انتهت المهمة')+' · مكافأة الاتحاد +'+money(pay)+' · سمعة +'+repG;
 mail(c,'club','اتحاد الكرة','انتهت مهمة المنتخب',msg+'. رجعت لناديك '+c.club.name+'.');addNews(c,'me',c.name+' يعود لتدريب '+c.club.name+' بعد مهمة '+J.T,true);toast('رجعت لناديك — '+msg);store();}
const _seN=seasonEnd;seasonEnd=function(){const c=App.c;if(c&&c.coachMode){if(c.natJob)endNatJob(c);else if(c.natAsk!==c.season&&c.seDone!==c.season&&(c.rep||0)>=8){c.natAsk=c.season;const O=natOffers(c);if(O.length)return natModal(c,O);}}return _seN();};
/* تسمية المهمة في الشريط */
const _rsN=renderShell;renderShell=function(id){_rsN(id);const c=App.c;if(c&&c.coachMode&&c.natJob){const t=$('cmTier');if(t)t.textContent='مهمة المنتخب · '+c.natJob.T+' · الموسم '+c.season;}};
