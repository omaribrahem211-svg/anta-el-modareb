// أنت المدرب — صفحة الانتقالات (شراء وبيع)
'use strict';
let mkPos='ALL',mkSort='ov',mkMode='buy';
if(typeof TABS!=='undefined'&&!TABS.includes('market'))TABS.splice(TABS.indexOf('life'),0,'market');
const _shM=show;show=function(id){_shM(id);if(id==='market'){try{renderMarket();}catch(e){console.warn(e);}}};
function renderMarket(){const c=App.c;if(!c||!c.coachMode)return;const sec=$('scr-market');const S=mySquad(c);const mk=market(c);
 const pf=['ALL','GK','DF','MF','FW'],pn={ALL:'الكل',GK:'حراس',DF:'دفاع',MF:'وسط',FW:'هجوم'};
 let L=mk.list.slice();if(mkPos!=='ALL')L=L.filter(x=>x.p.r===mkPos);L.sort((a,b)=>mkSort==='ov'?b.p.ov-a.p.ov:mkSort==='age'?a.p.age-b.p.age:a.price-b.price);
 let M=S.slice();if(mkPos!=='ALL')M=M.filter(x=>x.r===mkPos);M.sort((a,b)=>b.ov-a.ov);
 const lock=c.natJob?'<div class="news">السوق مقفول أثناء مهمة المنتخب</div>':'';
 sec.innerHTML=`<div class="topbar"><div><h2 class="ttl">الانتقالات</h2><div class="sub">الميزانية <b>${money(c.money)}</b> · ${S.length}/26 لاعب</div></div><div class="row" style="gap:8px"><div class="seg tabs" id="mkMode"><button data-m="buy" class="${mkMode==='buy'?'on':''}">شراء لاعيبة</button><button data-m="sell" class="${mkMode==='sell'?'on':''}">بيع لاعيبة</button></div></div></div>
 <div class="mkbar"><div class="seg wrapseg" id="mkPos">${pf.map(k=>`<button data-p="${k}" class="${mkPos===k?'on':''}">${pn[k]}</button>`).join('')}</div>${mkMode==='buy'?`<div class="seg wrapseg" id="mkSort"><button data-s="ov" class="${mkSort==='ov'?'on':''}">الأقوى</button><button data-s="age" class="${mkSort==='age'?'on':''}">الأصغر</button><button data-s="price" class="${mkSort==='price'?'on':''}">الأرخص</button></div>`:''}</div>${lock}
 <div class="panel scroll" style="flex:1" id="mkBody">${mkMode==='buy'?(L.map((it,i)=>mkRow(c,it.p,it.club||'لاعب حر',it.price,`<button class="btn sm ${c.money>=it.price?'gold':'ghost'}" data-b="${mk.list.indexOf(it)}">اشتري</button>`)).join('')||'<div class="sub">مفيش لاعيبة متاحين بالفلتر ده</div>'):(M.map(p=>mkRow(c,p,p.inj?'مصاب':'تقييم '+p.ov,Math.round(pVal(p.ov,p.age)*.85/1000)*1000,`<button class="btn sm ghost" data-s2="${p.id}">بيع</button>`)).join(''))}</div>`;
 sec.querySelectorAll('#mkMode button').forEach(b=>b.onclick=()=>{mkMode=b.dataset.m;renderMarket();});
 sec.querySelectorAll('#mkPos button').forEach(b=>b.onclick=()=>{mkPos=b.dataset.p;renderMarket();});
 sec.querySelectorAll('#mkSort button').forEach(b=>b.onclick=()=>{mkSort=b.dataset.s;renderMarket();});
 sec.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const e=buyPlayer(c,mk.list[+b.dataset.b]);toast(e||'تم التعاقد ✓');renderMarket();renderShell('market');});
 sec.querySelectorAll('[data-s2]').forEach(b=>b.onclick=()=>{const p=pById(c,b.dataset.s2);const x=sellPlayer(c,p);toast(typeof x==='string'?x:'اتباع بـ '+money(x));renderMarket();renderShell('market');});}
function mkRow(c,p,sub,price,btn){const col=p.ov>=75?'#C6F432':p.ov>=62?'#F5C542':'#9aa7c7';return`<div class="mrow mk"><span class="ovb" style="border-color:${col};color:${col}">${p.ov}</span><span class="mkn"><b>${esc(p.n)}</b><small><span class="pill">${ROLE_AR[p.r]}</span> ${p.age} سنة · ${esc(sub)}${p.pot>p.ov+4&&p.age<=23?' · موهبة 🌟':''}</small></span><b class="mkp">${money(price)}</b>${btn}</div>`;}
// النادي: المالية والمنشآت بس (الانتقالات بقت صفحة لوحدها)
lfTab='fin';
const _rlM=renderLife;renderLife=function(){if(lfTab==='mk'||lfTab==='sell')lfTab='fin';_rlM();const t=document.querySelectorAll('#lfTabs button');t.forEach(b=>{if(b.dataset.t==='mk'||b.dataset.t==='sell')b.remove();});};
