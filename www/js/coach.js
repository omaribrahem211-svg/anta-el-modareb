// أنت المدرب — وضع المدرب فوق محرك مسيرة نجم: الفريقين بالذكاء الاصطناعي، والمستخدم بيدير الخطة والتكتيك والتبديلات
'use strict';
(function(){
const FKEYS=Object.keys(FORMS);
const TKEYS=Object.keys(TACTICS);
const ROLE={GK:'حارس',DF:'دفاع',MF:'وسط',FW:'هجوم'};
App.coachCfg=App.coachCfg||{form:'4-3-3',tac:'bal'};
document.body.classList.add('coachapp');

/* ---- title ---- */
(function(){const q=$('mQuick');if(q){q.textContent='ماتش سريع';q.onclick=()=>startCoach();}})();

function mkDefs(){
  const used=new Set();
  const a=genClubs('EG',1,62,used,1)[0],b=genClubs('EG',1,62,used,4)[0];
  const opForm=pick(FKEYS),opTac=pick(TKEYS);
  return {home:Object.assign(a,{nm:CBY.EG.nm,form:App.coachCfg.form,tac:App.coachCfg.tac}),away:Object.assign(b,{nm:CBY.EG.nm,form:opForm,tac:opTac})};
}
function startCoach(){
  SFX.init();const d=mkDefs();App.quick=true;App.coach=true;document.body.classList.add('coachmode');
  const m=new Match({home:d.home,away:d.away,human:null,coach:true,halfLen:App.settings.halfLen,intro:false,comp:'ماتش ودي',weather:Math.random()<.2?'rain':'clear',onEvent:(t,d,mm)=>{matchEvent(t,d,mm);window.Board&&Board.ev(t,d,mm||m);},
    onEnd:r=>{App.match=null;App.coach=false;document.body.classList.remove('coachmode');window.Board&&Board.stop();Comm.stop();SFX.rain(false);Stadium.stop&&Stadium.stop();
      $('poS').textContent='ماتش مدرب';$('poScore').innerHTML=`<div class="big-score bs2"><span>${r.score[0]}</span><span>-</span><span>${r.score[1]}</span></div>${scorersHTML(r.events)}`;
      $('poStats').innerHTML=`<div class="ttl">${r.score[0]>r.score[1]?'فوز':r.score[0]<r.score[1]?'خسارة':'تعادل'}</div><div class="sub">استحواذ ${r.poss}% · تسديدات ${r.shots[0]}-${r.shots[1]}</div>`;
      $('poGo').onclick=()=>show('title');show('post');}});
  m.coachOpp=d.away;beginMatch(m);window.Board&&Board.start(m);
}

/* ---- coach panel (replaces the pause menu in coach mode) ---- */
let tab='tac',sel=null;
function panel(){
  const m=App.match;if(!m)return;const t=m.t[0];const P=$('coachP');
  const tabs=[['tac','التكتيك'],['form','الخطة'],['subs','التبديلات']].map(([k,n])=>`<button class="ctab ${tab===k?'on':''}" data-tab="${k}">${n}</button>`).join('');
  let body='';
  if(tab==='tac'){
    body=`<div class="sub" style="margin-bottom:6px">أسلوب لعب الفريق (بيتغيّر فوراً)</div><div class="copts">`+TKEYS.map(k=>`<button class="copt ${t.tacK===k?'on':''}" data-tac="${k}"><b>${TACTICS[k].n}</b><span>${TACTICS[k].d}</span></button>`).join('')+'</div>';
  }else if(tab==='form'){
    body=`<div class="sub" style="margin-bottom:6px">الخطة الحالية: <b>${t.formK}</b> · اللاعيبة بيتوزعوا على المراكز الجديدة في الملعب</div><div class="copts f">`+FKEYS.map(k=>{const F=FORMS[k];const dots=F.map(p=>`<i style="left:${p.x/105*200}%;top:${p.y/68*100}%;background:${p.r==='GK'?'#F5C542':'#3DDC97'}"></i>`).join('');return `<button class="copt ${t.formK===k?'on':''}" data-form="${k}"><div class="mini">${dots}</div><b>${k}</b></button>`}).join('')+'</div>';
  }else{
    const row=(p,k)=>`<div class="subrow ${sel===p?'sel':''}" data-k="${k}"><span>${esc(p.name)} <span class="sub">${p.num} · ${ROLE[p.role]} · ${Math.round((p.st.pace+p.st.shot+p.st.pass+p.st.drib+p.st.def+p.st.phys)/6)}</span></span><div class="bar"><i style="width:${Math.round(p.stam)}%;background:${p.stam>60?'var(--acc)':p.stam>35?'var(--gold)':'var(--red)'}"></i></div><b>${Math.round(p.stam)}%</b></div>`;
    body=`<div class="row" style="justify-content:space-between"><b>التبديلات (${t.subs}/5)</b><span class="sub">${sel?'اختار البديل':'اختار اللاعب اللي هيطلع'}</span></div>`+(sel?(t.bench.map((p,k)=>row(p,'b'+k)).join('')||'<div class="sub">مافيش بدلاء</div>'):t.pl.filter(p=>p.role!=='GK').map(p=>row(p,'f'+t.pl.indexOf(p))).join(''));
  }
  P.innerHTML=`<div class="chead"><h2 class="ttl">لوحة المدرب · ${m.score[0]}-${m.score[1]} · ${m.clock()}</h2><div class="ctabs">${tabs}</div></div><div class="cbody">${body}</div><div class="cfoot"><button class="btn" id="cGo">كمّل الماتش</button><button class="btn ghost" id="cQuit">إنهاء</button></div>`;
  P.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;sel=null;panel();});
  P.querySelectorAll('[data-tac]').forEach(b=>b.onclick=()=>{m.setTac(t,b.dataset.tac);App.coachCfg.tac=b.dataset.tac;if(App.c&&App.c.coachMode&&App.c.cl)App.c.cl.tac=b.dataset.tac;panel();});
  P.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{if(m.setForm(t,b.dataset.form)){App.coachCfg.form=b.dataset.form;if(App.c&&App.c.coachMode&&App.c.cl)App.c.cl.form=b.dataset.form;}panel();});
  P.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{const k=el.dataset.k;if(k[0]==='f'){sel=t.pl[+k.slice(1)];}else if(sel&&t.subs<5){m.sub(t,sel,t.bench[+k.slice(1)]);sel=null;}panel();});
  $('cGo').onclick=()=>window.togglePause();
  $('cQuit').onclick=()=>{P.classList.remove('on');const mm=App.match;App.match=null;App.coach=false;document.body.classList.remove('coachmode');window.Board&&Board.stop();Comm.stop();SFX.rain(false);show('title');};
}
const oldToggle=window.togglePause;
window.togglePause=function(){
  const m=App.match;if(!m)return;
  if(!App.coach)return oldToggle();
  m.paused=!m.paused;const P=$('coachP');P.classList.toggle('on',m.paused);if(m.paused){sel=null;panel();}
};
$('pauseBtn').onclick=window.togglePause;
window.coachOpenSubs=function(p){const m=App.match;if(!m)return;tab='subs';sel=p;m.paused=true;$('coachP').classList.add('on');panel();};
// half-time: open the coach panel automatically
let lastPhase='';
setInterval(()=>{const m=App.match;if(!m||!App.coach)return;if(m.phase!==lastPhase){if(m.phase==='half'&&!m.paused){m.paused=true;$('coachP').classList.add('on');tab='tac';panel();}lastPhase=m.phase;}},250);
})();
