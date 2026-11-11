// أنت المدرب — السوشيال بشكل فيسبوك: بوستات الجمهور والصفحات المحبة لفريقك
'use strict';
const FB_COL=['#1877F2','#E4405F','#25D366','#F5A623','#8E44AD','#16A085','#E67E22','#C0392B'];
function fbPages(c){const n=c.club.name;return[{u:'جماهير '+n,pg:1,v:1},{u:n+' ألتراس',pg:1},{u:'أخبار '+n+' أولاً بأول',pg:1},{u:'كورة بلدنا',pg:1,v:1},{u:'ملاعب وأهداف',pg:1},{u:'عشاق '+n,pg:1}];}
const FB_WIN=['ماتش مجنون النهارده! {n} بيكسب بجدارة والمدرب {m} فاجئ الكل بالتغييرات 👏🔥','ثلاث نقط غالية. كمّلوا كده يا أبطال ❤️ #{n}','المدرب {m} بيعمل شغل محترم، الفريق بقى بيلعب كورة حقيقية','النتيجة جاية في وقتها بعد الضغط الإعلامي. مبروك للجماهير 🎉'];
const FB_LOSS=['خسارة موجعة النهارده… الخطة محتاجة مراجعة يا كابتن {m} 😔','فين الروح يا جماعة؟ الجمهور مستني رد فعل في الماتش الجاي','التشكيلة النهارده مش مقنعة، ومحتاجين تدعيم في الوسط','نكبة! بس {n} كبير ومش هيستسلم 💪'];
const FB_DRAW=['تعادل مرّ… كنا نستاهل أكتر. تحسّن بسيط عن الأسبوع اللي فات','نقطة بنحتفظ بيها ونبني عليها. الماتش الجاي أهم'];
const FB_EXTRA=['مين يقول رأيه: الأحسن يلعب بـ 4-3-3 ولا 4-4-2؟ 🤔','شفتوا الجمهور في الماتش الأخير؟ جو رهيب 🔥','تفتكروا الميركاتو الجاي هيجيب نجوم؟ ✈️','صورة اليوم: تحضيرات الفريق قبل الماتش الجاي 📸'];
function genFanPosts(c,res,info,r){try{if(!c.feed)c.feed=[];const pages=fbPages(c);const m=c.name;const T=res>0?FB_WIN:res<0?FB_LOSS:FB_DRAW;const k=1+(Math.random()<.6?1:0);
 for(let i=0;i<k;i++){const pg=pick(pages);const tx=(i?pick(FB_EXTRA):pick(T)).replace(/\{n\}/g,c.club.name).replace(/\{m\}/g,m);
  const base=c.followers/60+RI(20,400);const p={user:pg.u,pg:1,v:pg.v,text:tx,likes:Math.round(base*(res>0?1.6:1)),rt:RI(2,60),t:c.si,fan:1,cm:Array.from({length:RI(1,3)},()=>({u:pick(FAN_NAMES),x:pick(res>=0?['ربنا يوفقكم يا رب','عاش يا كابتن','كمّلوا كده']:['محتاجين نتايج','غيّر الخطة بقى','الإدارة لازم تتحرك'])}))};c.feed.unshift(p);}
 if(c.feed.length>50)c.feed.length=50;}catch(e){console.warn(e);}}
function ago(c,p,i){const d=Math.max(0,(c.si-(p.t||0)));return d===0?(i<2?'الآن':'منذ '+(i+1)+' س'):d===1?'أمس':'منذ '+d+' أيام';}
function fbFeed(c){const cols=FB_COL;const fn=u=>u.replace('@','');
 return c.feed.map((p,i)=>{const nm=fn(p.user),col=cols[nm.length%cols.length];
  return`<div class="fbp ${p.mine?'mine':''}" style="animation-delay:${Math.min(i,8)*.04}s"><div class="fbh"><div class="fba" style="background:${col}">${esc(nm[0]||'?')}</div><div class="fbn"><b>${esc(nm)}${p.v?' <i class="vf">✔</i>':''}</b><span>${p.pg?'صفحة · ':p.mine?'إنت · ':''}${ago(c,p,i)} · 🌍</span></div></div><div class="fbt">${esc(p.text)}</div>
  <div class="fbs"><span>👍❤️ ${num(p.likes)}</span><span>${(p.cm||[]).length} تعليق · ${num(p.rt)} مشاركة</span></div>
  <div class="fbx"><button data-lk="${i}" class="${p.liked?'on':''}">👍 إعجاب</button><button data-cm="${i}">💬 تعليق</button><button data-sh="${i}">↗ مشاركة</button>${p.mine&&p.cm&&!p.replied?`<button class="rp" data-rp="${i}">رد على المعلّقين</button>`:''}</div>
  ${(p.cm||[]).map(m=>`<div class="fbc"><div class="fba s" style="background:${cols[m.u.length%cols.length]}">${esc(m.u[0]||'?')}</div><div class="fbb"><b>${esc(m.u)}</b><span>${esc(m.x)}</span></div></div>`).join('')}${p.rep?`<div class="fbc"><div class="fba s" style="background:var(--acc);color:#101522">أ</div><div class="fbb me"><b>إنت</b><span>${esc(p.rep)}</span></div></div>`:''}</div>`;}).join('')||'<div class="sub">الجمهور لسه مايعرفكش… العب واعمل اسم</div>';}
(function(){const M=window.Media;if(M){const am=M.afterMatch;M.afterMatch=function(c,r,res,info,best){try{if(c.coachMode&&!c.natJob)genFanPosts(c,res,info,r);}catch(e){}return am.apply(this,arguments);};}
 const _rs=renderSocial;renderSocial=function(){const c0=App.c;if(c0&&c0.coachMode&&!(c0.feed||[]).some(p=>p.fan)){for(let i=0;i<4;i++)genFanPosts(c0,[1,0,1,-1][i],{},{});c0.feed.forEach((p,i)=>{if(p.fan)p.t=c0.si-(i>1?1:0);});}_rs();const c=App.c,f=$('soFeed');if(!c||!f)return;
  f.querySelectorAll('[data-lk]').forEach(b=>b.onclick=()=>{const p=c.feed[+b.dataset.lk];p.liked=!p.liked;p.likes+=p.liked?1:-1;b.classList.toggle('on',p.liked);b.closest('.fbp').querySelector('.fbs span').textContent='👍❤️ '+num(p.likes);if(p.liked&&p.pg)c.fans=clamp(c.fans+.2,0,100);store();});
  f.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{const p=c.feed[+b.dataset.sh];p.rt++;c.followers+=3;b.textContent='↗ تمت المشاركة';b.disabled=true;store();});
  f.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{const p=c.feed[+b.dataset.cm];if(p.mine||p.cmDone){toast('علّقت قبل كده');return;}p.cmDone=1;p.cm=p.cm||[];p.cm.unshift({u:c.name,x:pick(['فخور بدعمكم ❤️','شكراً يا جماهير','معاكم لحد آخر ماتش'])});c.fans=clamp(c.fans+.5,0,100);store();renderSocial();});};})();
window.fbFeed=fbFeed;
