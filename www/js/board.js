// أنت المدرب — لوحة المدرب التكتيكية: ملعب من فوق + شريط سيطرة + تعليق مباشر
/* 3D متشال: ستاب بسيط عشان اللعبة تفضل 2D وخفيفة */
window.R3D=window.R3D||class R3D{constructor(){throw new Error("3D off");}render(){}};
'use strict';
(function(){
const PAD=7;const BD={on:false,m:null,view3d:false,speed:1,mom:.5,trail:[],trT:0,feed:[],sel:null,goalFlash:0,goalTxt:'',raf:0,sw:0,sh:0,pitch:null,lastSide:0};
window.Board=BD;
const root=document.createElement('div');root.id='board';
root.innerHTML=`<div class="bd-main"><div class="bd-head"><div class="bd-team" id="bdA"></div><div class="bd-mid"><div class="bd-score" id="bdScore">0 - 0</div><div class="bd-clock" id="bdClock"></div></div><div class="bd-team" id="bdB"></div></div>
<div class="bd-stage" id="bdStage"><canvas id="bdCv"></canvas><div class="bd-goal" id="bdGoal"></div></div></div>
<aside class="bd-side"><div class="bd-card"><div class="bd-lbl">مين مسيطر على الماتش؟</div><div class="bd-mom" id="bdMom"><i id="bdMomFill"></i></div><div class="bd-momn"><span id="bdMomA"></span><span id="bdMomB"></span></div><div class="bd-stats" id="bdStats"></div></div>
<div class="bd-card bd-pl" id="bdPl" hidden></div>
<div class="bd-card bd-feedc"><div class="bd-lbl">التعليق المباشر</div><div class="bd-feed" id="bdFeed"></div></div>
<div class="bd-ctl"><button class="bd-btn on2" id="bdPanel">لوحة المدرب</button><button class="bd-btn" id="bdSp">السرعة ×4</button></div></aside>`;
document.body.appendChild(root);
const back=document.createElement('button');back.id='bdBack';back.textContent='رجوع للوحة';document.body.appendChild(back);
const cp=document.getElementById('coachP');if(cp)document.body.appendChild(cp);
const $b=id=>document.getElementById(id);
const cv=$b('bdCv'),cx=cv.getContext('2d');

/* keep 3D work off while the board is visible */
const r0=R3D.prototype.render;R3D.prototype.render=function(){if(BD.on&&!BD.view3d)return;return r0.apply(this,arguments);};
const o0=window.drawOverlay;if(typeof o0==='function')window.drawOverlay=function(){if(BD.on&&!BD.view3d)return;return o0.apply(this,arguments);};

const T=(t)=>t&&t.name?t.name:'';
const colOf=(t,other)=>{const a=t.kit[0];if(!other)return a;const b=other.kit[0];return cdist(a,b)<110?t.kit[1]:a;};
function rgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function cdist(a,b){const x=rgb(a),y=rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);}
function lumOf(h){const c=rgb(h);return(.299*c[0]+.587*c[1]+.114*c[2])/255;}

function layout(){const st=$b('bdStage');const w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;const dpr=Math.min(2,window.devicePixelRatio||1);
  const pad=8,k=Math.min((w-pad*2)/(L+PAD*2),(h-pad*2)/(W+PAD*2));const pw=(L+PAD*2)*k,ph=(W+PAD*2)*k;
  cv.style.width=pw+'px';cv.style.height=ph+'px';cv.width=Math.round(pw*dpr);cv.height=Math.round(ph*dpr);BD.dpr=dpr;BD.k=k;BD.sw=pw;BD.sh=ph;BD.pitch=null;}
function mkPitch(){const dpr=BD.dpr,k=BD.k;const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const g=c.getContext('2d');g.scale(dpr,dpr);
  const X=x=>(x+PAD)*k,Y=y=>(y+PAD)*k;
  // مدرجات: خلفية + جمهور ملوّن
  g.fillStyle='#0C1328';g.fillRect(0,0,BD.sw,BD.sh);let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;const cols=['#E53935','#FDD835','#1E88E5','#FFFFFF','#FB8C00','#43A047','#8E24AA','#26C6DA'];
  const ring=(x0,y0,x1,y1)=>{for(let i=0;i<(x1-x0)*(y1-y0)/16;i++){g.fillStyle=cols[(rnd()*cols.length)|0];g.globalAlpha=.55+rnd()*.35;g.fillRect(x0+rnd()*(x1-x0),y0+rnd()*(y1-y0),2.2,2.6);}g.globalAlpha=1;};
  ring(0,0,BD.sw,Y(-1.5));ring(0,Y(W+1.5),BD.sw,BD.sh);ring(0,0,X(-1.5),BD.sh);ring(X(L+1.5),0,BD.sw,BD.sh);
  // لوحات الإعلانات
  g.fillStyle='#0F1630';g.fillRect(X(-1.8),Y(-1.8),(L+3.6)*k,.9*k);g.fillRect(X(-1.8),Y(W+.9),(L+3.6)*k,.9*k);
  const ads=['#C6F432','#FF5A5F','#4FC3F7','#F5C542'];for(let i=0;i<12;i++){g.fillStyle=ads[i%4];g.fillRect(X(-1.8)+i*(L+3.6)*k/12+2,Y(-1.8)+2,(L+3.6)*k/12-4,.9*k-4);g.fillRect(X(-1.8)+i*(L+3.6)*k/12+2,Y(W+.9)+2,(L+3.6)*k/12-4,.9*k-4);}
  g.fillStyle='#1E5F33';g.fillRect(X(-.9),Y(-.9),(L+1.8)*k,(W+1.8)*k);
  const N=14,sw=L/N;for(let i=0;i<N;i++){g.fillStyle=i%2?'#2C8248':'#277A41';g.fillRect(X(i*sw),Y(0),sw*k+.5,W*k);}
  // ضوء خفيف في النص
  const gr=g.createRadialGradient(X(CX),Y(CY),k*4,X(CX),Y(CY),k*60);gr.addColorStop(0,'rgba(255,255,255,.07)');gr.addColorStop(1,'rgba(0,0,0,.16)');g.fillStyle=gr;g.fillRect(X(0),Y(0),L*k,W*k);
  g.strokeStyle='rgba(255,255,255,.78)';g.lineWidth=Math.max(1.2,.16*k);g.lineJoin='round';
  g.strokeRect(X(0),Y(0),L*k,W*k);g.beginPath();g.moveTo(X(CX),Y(0));g.lineTo(X(CX),Y(W));g.stroke();
  g.beginPath();g.arc(X(CX),Y(CY),9.15*k,0,7);g.stroke();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(X(CX),Y(CY),.4*k,0,7);g.fill();
  for(const s of[0,1]){const gx=s?L:0,d=s?-1:1;g.strokeRect(s?X(L-16.5):X(0),Y(CY-20.16),16.5*k,40.32*k);g.strokeRect(s?X(L-5.5):X(0),Y(CY-9.16),5.5*k,18.32*k);
   g.beginPath();g.arc(X(gx+d*11),Y(CY),.35*k,0,7);g.fill();const a=Math.acos(5.5/9.15);g.beginPath();if(s)g.arc(X(L-11),Y(CY),9.15*k,Math.PI-a,Math.PI+a);else g.arc(X(11),Y(CY),9.15*k,-a,a);g.stroke();
   g.fillStyle='rgba(255,255,255,.9)';g.fillRect(X(gx)-(s?0:3),Y(CY-GW/2),3,GW*k);g.fillStyle='rgba(255,255,255,.8)';}
  BD.pitch=c;}

function drawBoard(){const m=BD.m;if(!m)return;if(!BD.pitch){layout();if(!BD.sw)return;mkPitch();}
  const k=BD.k,dpr=BD.dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.drawImage(BD.pitch,0,0,BD.sw,BD.sh);
  const X=x=>(x+PAD)*k,Y=y=>(y+PAD)*k;const t0=m.t[0],t1=m.t[1];const c0=colOf(t0,t1),c1=colOf(t1,t0);
  // formation lines of the user's team
  cx.lineWidth=1;cx.strokeStyle='rgba(255,255,255,.22)';
  for(const role of['DF','MF','FW']){const ps=t0.pl.filter(p=>p.role===role).sort((a,b)=>a.y-b.y);if(ps.length<2)continue;cx.beginPath();ps.forEach((p,i)=>i?cx.lineTo(X(p.x),Y(p.y)):cx.moveTo(X(p.x),Y(p.y)));cx.stroke();}
  // ball trail
  const tr=BD.trail;if(tr.length>1){for(let i=1;i<tr.length;i++){cx.strokeStyle=`rgba(255,255,255,${(i/tr.length)*.55})`;cx.lineWidth=1+2*(i/tr.length);cx.beginPath();cx.moveTo(X(tr[i-1][0]),Y(tr[i-1][1]));cx.lineTo(X(tr[i][0]),Y(tr[i][1]));cx.stroke();}}
  const R=Math.max(7,k*1.35);cx.textAlign='center';cx.textBaseline='middle';cx.font=`800 ${Math.round(R*.95)}px Changa,system-ui`;
  const own=m.ball.owner;
  for(const p of m.all){const t=p.team,c=t===t0?c0:c1,k2=(t===t0?t0:t1).kit[1];const x=X(p.x),y=Y(p.y);const sp=Math.hypot(p.vx||0,p.vy||0);
    cx.fillStyle='rgba(0,0,0,.32)';cx.beginPath();cx.ellipse(x+1.5,y+R*.8,R*.95,R*.45,0,0,7);cx.fill();
    if(sp>3.5){const a=Math.atan2(p.vy,p.vx);cx.fillStyle='rgba(255,255,255,.28)';cx.beginPath();cx.moveTo(x+Math.cos(a)*(R+7),y+Math.sin(a)*(R+7));cx.lineTo(x+Math.cos(a+2.5)*(R+1),y+Math.sin(a+2.5)*(R+1));cx.lineTo(x+Math.cos(a-2.5)*(R+1),y+Math.sin(a-2.5)*(R+1));cx.fill();}
    const base=p.role==='GK'?'#F5C542':c;cx.fillStyle=base;cx.beginPath();cx.arc(x,y,R,0,7);cx.fill();
    if(p.role!=='GK'&&k2&&cdist(base,k2)>90){cx.save();cx.beginPath();cx.arc(x,y,R,0,7);cx.clip();cx.strokeStyle=k2;cx.lineWidth=R*.38;cx.beginPath();cx.arc(x,y,R*.98,0,7);cx.stroke();cx.restore();}
    cx.lineWidth=p===BD.sel?3:p===own?2.5:1.6;cx.strokeStyle=p===BD.sel?'#C6F432':(p===own?'#fff':'rgba(0,0,0,.55)');cx.beginPath();cx.arc(x,y,R,0,7);cx.stroke();
    if(p.stam<35&&t===t0){cx.strokeStyle='#FF5A5F';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,R+3,0,7);cx.stroke();}
    if(p.guest){cx.strokeStyle='#F5C542';cx.lineWidth=2.5;cx.beginPath();cx.arc(x,y,R+4,0,7);cx.stroke();}
    const lt=lumOf(p.role==='GK'?'#F5C542':c)>.55;cx.lineWidth=3;cx.strokeStyle=lt?'rgba(255,255,255,.0)':'rgba(0,0,0,.55)';cx.fillStyle=lt?'#101522':'#fff';cx.strokeText(p.num,x,y+.5);cx.fillText(p.num,x,y+.5);}
  // ball
  const b=m.ball,bx=X(b.x),by=Y(b.y)-b.z*k*.35;cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(X(b.x)+1,Y(b.y)+2,4,2.4,0,0,7);cx.fill();
  cx.fillStyle='#fff';cx.strokeStyle='#111';cx.lineWidth=1.2;cx.beginPath();cx.arc(bx,by,4.2,0,7);cx.fill();cx.stroke();
  if(own){const nm=lastName(own.name);cx.font='700 12px Changa,system-ui';const w=cx.measureText(nm).width+12;const lx=Math.min(BD.sw-w/2-2,Math.max(w/2+2,X(own.x))),ly=Y(own.y)-R-10;cx.fillStyle='rgba(7,11,22,.82)';cx.fillRect(lx-w/2,ly-9,w,18);cx.fillStyle='#fff';cx.fillText(nm,lx,ly);}
}

function tick(ts){if(!BD.on)return;BD.raf=requestAnimationFrame(tick);const m=BD.m;if(!m||BD.view3d)return;
  const now=performance.now();const dt=Math.min(.05,(now-(BD.lt||now))/1000);BD.lt=now;
  BD.trT+=dt;if(BD.trT>.1){BD.trT=0;BD.trail.push([m.ball.x,m.ball.y]);if(BD.trail.length>16)BD.trail.shift();}
  const b=m.ball,own=b.owner;const tgt=Math.max(.06,Math.min(.94,b.x/L*.9+.05+(own?(own.team.idx===0?.06:-.06):0)));BD.mom+=(tgt-BD.mom)*Math.min(1,dt/6);
  drawBoard();ui();}

let uiT=0;
function ui(){const m=BD.m;const n=performance.now();if(n-uiT<200)return;uiT=n;
  $b('bdScore').textContent=m.score[0]+' - '+m.score[1];$b('bdClock').textContent=(m.phase==='half'?'استراحة':m.phase==='end'?'نهاية':m.clock());
  const pm=Math.round(BD.mom*100);$b('bdMomFill').style.width=pm+'%';$b('bdMomA').textContent=m.t[0].short+' '+pm+'%';$b('bdMomB').textContent=(100-pm)+'% '+m.t[1].short;
  const tp=(m.possF[0]+m.possF[1])||1,pa=Math.round(m.possF[0]/tp*100);
  const avg=Math.round(m.t[0].pl.reduce((s,p)=>s+p.stam,0)/(m.t[0].pl.length||1));
  const row=(l,a,b2,pc)=>`<div class="bd-row"><b>${a}</b><div class="bd-rbar"><i style="width:${pc}%"></i></div><b>${b2}</b><span>${l}</span></div>`;
  $b('bdStats').innerHTML=row('الاستحواذ',pa+'%',(100-pa)+'%',pa)+row('التسديدات',m.shotsT[0],m.shotsT[1],(m.shotsT[0]+m.shotsT[1])?m.shotsT[0]/(m.shotsT[0]+m.shotsT[1])*100:50)+`<div class="bd-row bd-fit"><span>لياقة فريقك</span><div class="bd-rbar fit"><i style="width:${avg}%;background:${avg>60?'var(--acc)':avg>40?'var(--gold)':'var(--red)'}"></i></div><b>${avg}%</b></div>`;
  const p=BD.sel;if(p){$b('bdPl').hidden=false;const ov=Math.round((p.st.pace+p.st.shot+p.st.pass+p.st.drib+p.st.def+p.st.phys)/6);const mine=p.team===m.t[0];
    $b('bdPl').innerHTML=`<div class="bd-plh"><b>${esc(p.name)}</b><span>${p.num} · ${({GK:'حارس',DF:'دفاع',MF:'وسط',FW:'هجوم'})[p.role]} · ${ov}</span></div><div class="bd-rbar big"><i style="width:${Math.round(p.stam)}%;background:${p.stam>60?'var(--acc)':p.stam>35?'var(--gold)':'var(--red)'}"></i></div><div class="bd-plf"><span>لياقة ${Math.round(p.stam)}%</span>${mine&&p.role!=='GK'?'<button class="bd-btn sm" id="bdSub">بدّله</button>':''}</div>`;
    const sb=$b('bdSub');if(sb)sb.onclick=()=>window.coachOpenSubs&&window.coachOpenSubs(p);}
  if(BD.goalFlash>0){BD.goalFlash-=.2;if(BD.goalFlash<=0)$b('bdGoal').classList.remove('on');}
}

/* commentary */
function add(txt,cls){const m=BD.m;const f=$b('bdFeed');const d=document.createElement('div');d.className='bd-fi '+(cls||'');d.innerHTML=`<em>${m?m.clock():''}</em><span>${txt}</span>`;f.insertBefore(d,f.firstChild);while(f.children.length>40)f.removeChild(f.lastChild);}
BD.ev=function(type,d,m){if(!BD.on)return;const nm=d&&d.p?esc(lastName(d.p.name)):'';const tm=d&&d.p&&d.p.team?esc(d.p.team.name):'';const mine=d&&d.p&&d.p.team&&d.p.team.idx===0;const c=mine?'us':'';
  switch(type){
   case'kickoff':add('صافرة البداية. الماتش ابتدى','');break;
   case'second':add('بداية الشوط التاني','');break;
   case'shot':add(`تسديدة من ${nm}${d.far?' من بعيد':''}`,c);break;
   case'save':add(d.rush?'الحارس خرج وخطفها من المهاجم':d.great?'تصدٍّ خرافي من الحارس!':'الحارس يتصدى للكورة',c);break;
   case'miss':add(d.close?`فرصة ضايعة! ${nm} كان لازم يسجل`:`تسديدة ${nm} بره المرمى`,c);break;
   case'woodwork':add('القائم! الكورة ترتطم بالعارضة','hot');break;
   case'corner':add('ركنية','');break;
   case'fk':add('ضربة حرة خطيرة','');break;
   case'foul':add('خطأ وصافرة الحكم','');break;
   case'pen':add('ضربة جزاء!','hot');break;
   case'yellow':add(`كارت أصفر لـ${nm}`,'card');break;
   case'red':add(`كارت أحمر! ${nm} يخرج من الملعب`,'card');break;
   case'injury':add(`إصابة ${nm}`,'card');break;
   case'offside':add('تسلل','');break;
   case'sub':add(`تبديل: ${esc(lastName(d.out.name))} يخرج و${esc(lastName(d.inp.name))} يدخل`,'');break;
   case'half':add('نهاية الشوط الأول. وقت الاستراحة، عدّل الخطة','hot');break;
   case'goal':{const s=d.scorer;const sn=s?esc(lastName(s.name)):'';const side=d.team===0;const tn=esc(m.t[d.team].name);
     add(`جووول! ${sn} يسجل لـ${tn}${d.assist?' بصناعة '+esc(lastName(d.assist.name)):''}`,'goal '+(side?'us':'them'));
     const g=$b('bdGoal');g.innerHTML=`<b>جووول!</b><span>${sn} · ${tn}</span>`;g.classList.add('on');BD.goalFlash=3.2;break;}
   case'end':add('صافرة النهاية','hot');break;}
};

/* controls */
root.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{BD.speed=+b.dataset.sp;root.querySelectorAll('[data-sp]').forEach(x=>x.classList.toggle('on',x===b));});
$b('bdPanel').onclick=()=>window.togglePause();
const SPD=[2,4,8];$b('bdSp').onclick=()=>{const i=(SPD.indexOf(BD.speed)+1)%SPD.length;BD.speed=SPD[i];$b('bdSp').textContent='السرعة ×'+BD.speed;};back.style.display='none';
function setView(v3){BD.view3d=v3;document.body.classList.toggle('view3d',v3);if(!v3){BD.pitch=null;setTimeout(layout,30);}}
cv.addEventListener('pointerdown',e=>{const m=BD.m;if(!m)return;const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let best=null,bd=1e9;
  for(const p of m.all){const d=Math.hypot((p.x+PAD)*BD.k-px,(p.y+PAD)*BD.k-py);if(d<bd){bd=d;best=p;}}
  BD.sel=bd<Math.max(18,BD.k*2.6)?best:null;$b('bdPl').hidden=!BD.sel;uiT=0;});
addEventListener('resize',()=>{if(BD.on){BD.pitch=null;setTimeout(layout,50);}});

BD.setView=v=>setView(v);
BD.start=function(m){BD.m=m;BD.on=true;BD.view3d=false;BD.speed=4;BD.mom=.5;BD.trail=[];BD.sel=null;BD.pitch=null;BD.lt=performance.now();
  document.body.classList.add('boardmode');document.body.classList.remove('view3d');root.classList.add('on');
  $b('bdSp').textContent='السرعة ×4';$b('bdFeed').innerHTML='';
  const t0=m.t[0],t1=m.t[1];root.style.setProperty('--c0',colOf(t0,t1));root.style.setProperty('--c1',colOf(t1,t0));const ch=(t,c)=>`<i style="background:${c}"></i><span>${esc(t.name)}</span>`;$b('bdA').innerHTML=ch(t0,colOf(t0,t1));$b('bdB').innerHTML=ch(t1,colOf(t1,t0));
  const u=m.update;m.update=function(dt){if(BD.on&&!BD.view3d&&(this.phase==='replay'||this.phase==='intro'))this.skip();const n=this.paused?1:BD.speed;for(let i=0;i<n;i++)u.call(this,dt);};
  setTimeout(layout,60);cancelAnimationFrame(BD.raf);BD.raf=requestAnimationFrame(tick);add('الفريقين نزلوا الملعب. إنت المدرب، وجّه فريقك','hot');if(App.settings&&+App.settings.view===1)setTimeout(()=>setView(true),50);};
BD.stop=function(){BD.on=false;BD.m=null;cancelAnimationFrame(BD.raf);document.body.classList.remove('boardmode','view3d');root.classList.remove('on');};
})();
