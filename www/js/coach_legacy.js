// أنت المدرب — استيراد مسيرة النسخة القديمة (نفس الفريق والفلوس والتشكيلة) عشان محدش يخسر تقدّمه بعد التحديث
'use strict';
const LG_PFX='anta_el_modareb_save_v1';
const LG_CC={EGY:'EG',SAU:'SA',MAR:'MA',DZA:'DZ',ALG:'DZ',TUN:'TN',ARE:'AE',UAE:'AE',QAT:'QA',JOR:'JO',IRQ:'IQ',ENG:'EN',GBR:'EN',ESP:'ES',ITA:'IT',DEU:'DE',GER:'DE',FRA:'FR',PRT:'PT',POR:'PT',NLD:'NL',NED:'NL',TUR:'TR',BRA:'BR',ARG:'AR',USA:'US'};
function lgRead(k){try{const s=localStorage.getItem(LG_PFX+k);return s?JSON.parse(s):null;}catch(e){return null;}}
function legacyFind(){try{
 if(localStorage.getItem('anta-legacy-done'))return null;
 const mg=lgRead('_manager'),teams=lgRead('_teams');if(!mg||!Array.isArray(teams)||!teams.length)return null;
 const club=teams.find(t=>t&&t.isUserClub)||teams.find(t=>mg.currentClubId&&t.id===mg.currentClubId);if(!club||!Array.isArray(club.players)||club.players.length<11)return null;
 return{mg,club};}catch(e){return null;}}
function lgRole(p){const c=p.positionCategory,q=p.position;if(c==='GK'||q==='GK')return'GK';if(c==='DEF'||['CB','RB','LB'].includes(q))return'DF';if(c==='FWD'||['ST','RW','LW'].includes(q))return'FW';return'MF';}
function legacyImport(L){const mg=L.mg,old=L.club;
 const cc=LG_CC[String(old.countryCode||'').toUpperCase()]||LG_CC[String(old.countryId||'').toUpperCase()]||'EG';
 const div=+old.division||4;const tier=clamp(4-div,0,3);
 const kit=[old.primaryColor||'#2a7de1',old.secondaryColor||'#ffffff',old.secondaryColor||'#ffffff'];
 const ps=old.players.map(p=>({n:p.name,r:lgRole(p),ov:clamp(Math.round(p.overallRating||p.rating||50),30,95),age:clamp(+p.age||25,16,40),pot:p.potentialRating,sal:p.salary})).filter(p=>p.n);
 const avg=ps.slice().sort((a,b)=>b.ov-a.ov).slice(0,14).reduce((s,p)=>s+p.ov,0)/Math.max(1,Math.min(14,ps.length));
 const club={name:old.name,short:old.shortName||old.name.slice(0,4),kit:0,kitArr:kit,cc,R:Math.round(avg),bonus:0};
 const c=newCoachCareer({name:mg.name||'المدرب',nat:cc,start:cc,club,fan:clamp(Math.round(old.reputation||45),30,90)});
 c.path.tier=tier;c.path.home=cc;c.club=club;
 delete c.league;c.sched=[];c.cup=null;
 try{buildSeason(c);}catch(e){console.warn(e);}
 const W=wInit(c);if(!W.sq)W.sq={};
 W.sq[club.name]=ps.map(p=>({n:p.n,r:p.r,ov:p.ov,age:p.age,st:genStats(p.ov,p.r),pot:Math.max(p.ov,Math.min(95,Math.round(p.pot||p.ov)))}));
 c.cl=null;c.mk=null;c.guest=null;
 mySquad(c);lineup(c);updR(c);makeObjectives(c);
 c.money=Math.max(startBudget(c,0),Math.round((+old.budget||0)+(+old.transferBudget||0)*0));
 c.rep=clamp(Math.round((+mg.reputation||20)*.6),5,90);c.board=60;
 c.trophies=(mg.trophies||[]).slice(0,40).map(t=>({n:String(t),s:0,k:'cup'}));
 c.won=(mg.leagueTitles||0)+(mg.cupTitles||0);
 addNews(c,'me',c.name+' يكمّل مسيرته مع '+club.name,true);
 mail(c,'club','إدارة '+club.name,'أهلاً بعودتك يا كابتن','مسيرتك القديمة اتنقلت كاملة: الفريق والتشكيلة والميزانية ('+money(c.money)+'). كمّل من مكانك.');
 try{localStorage.setItem('anta-legacy-done','1');}catch(e){}
 return c;}
function legacyButton(){const L=legacyFind();const old=$('mLegacy');if(old)old.remove();if(!L||App.c)return;const nb=$('mNew');if(!nb)return;
 const b=document.createElement('button');b.id='mLegacy';b.className='btn gold';b.style.cssText='margin-top:8px;width:100%';b.innerHTML='كمّل مسيرتك القديمة · '+esc(L.club.name);
 b.onclick=()=>{try{App.c=legacyImport(L);store();toast('اتنقلت مسيرتك بنجاح');show('hub');}catch(e){console.warn(e);toast('حصل خطأ في النقل، ابدأ مسيرة جديدة');}};
 nb.parentNode.insertBefore(b,nb);}
renderTitle=(function(o){return function(){o();try{legacyButton();}catch(e){}};})(renderTitle);
window.legacyFind=legacyFind;window.legacyImport=legacyImport;
try{legacyButton();}catch(e){}
