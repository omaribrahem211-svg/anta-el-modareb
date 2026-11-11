// مسيرة نجم — المسيرة والحياة: إنشاء اللاعب، المواسم والبطولات، المنتخب، المؤتمرات، السوشيال، العقود، الحياة الشخصية، الجوائز، وحلقة اللعبة
'use strict';
const $=id=>document.getElementById(id);
const App={match:null,demo:null,c:null,settings:{halfLen:120,diff:0,lock:0,sound:1,gfx:2,plm:0,films:1,cam:0,v113:1,tac:'bal',intro:1,replay:1,voice:0,ctext:0,dial:0},returnTo:'title',quick:false};
const SAVE='masiret-nagm-v2';
// الحفظ: نسخة في المتصفح + نسخة في ذاكرة الجهاز (SharedPreferences) عشان المسيرة ماتضيعش لو أندرويد قفل اللعبة فجأة، ومعاها بصمة تكشف أي تعديل في ملف الحفظ
function packSave(){if(App.c)Guard.protect(App.c);const d=JSON.stringify({c:App.c,s:App.settings});return JSON.stringify({v:3,t:Date.now(),d,h:Guard.hash(d)});}
function unpackSave(raw){if(!raw)return null;try{const o=JSON.parse(raw);if(o&&o.v===3){if(Guard.hash(o.d)!==o.h)return{bad:true,t:o.t};const d=JSON.parse(o.d);return{c:d.c,s:d.s,t:o.t};}if(o&&('c' in o))return{c:o.c,s:o.s,t:0};}catch(e){}return null;}
function store(){let p;try{p=packSave();}catch(e){return;}try{localStorage.setItem(SAVE,p);}catch(e){}try{if(Nat&&Nat.saveSet)Nat.saveSet({k:SAVE,v:p}).catch(()=>{});}catch(e){}}
function applySave(d){if(d&&d.s&&!d.s.v113){d.s.voice=0;d.s.v113=1;}setTimeout(()=>{if(typeof loadFace==='function')loadFace();},0);App.c=d.c||null;if(App.c)Guard.protect(App.c);Object.assign(App.settings,d.s||{});}
function load(){let raw=null;try{raw=localStorage.getItem(SAVE);}catch(e){}const d=unpackSave(raw);if(d&&!d.bad)applySave(d);App._lt=d&&!d.bad?d.t:-1;if(d&&d.bad)App._badSave=true;
 if(Nat&&Nat.saveGet)Nat.saveGet({k:SAVE}).then(r=>{const n=unpackSave(r&&r.v);if(!n||n.bad)return;if(n.t>App._lt&&!App.match){applySave(n);try{localStorage.setItem(SAVE,r.v);}catch(e){}const cur=document.querySelector('.screen.on');if(cur&&cur.id==='scr-title')renderTitle();}}).catch(()=>{});}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400);}
function flashDom(){const f=$('flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}
function money(n){n=Math.round(n);const a=Math.abs(n);return (n<0?'-':'')+'$'+(a>=1e6?(a/1e6).toFixed(a>=1e7?0:1)+'M':a>=1e4?Math.round(a/1e3)+'K':a.toLocaleString('en'));}
function num(n){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?Math.round(n/1e3)+'K':String(Math.round(n));}
function ovr(c){const w=POS[c.pos].w;let s=0;for(const k in w)s+=c.attrs[k]*w[k];return Math.round(s);}
// اسم العرض: الاسم كامل لو قصير، وإلا اسم العيلة (مع مراعاة «عبد» و«أبو» و«بن»)
function lastName(n){const w=String(n||'').trim().split(/\s+/).filter(Boolean);if(!w.length)return'';const full=w.join(' ');if(w.length<=2&&full.length<=14)return full;let k=w.length-1;if(k>0&&/^(عبد|عبدال|أبو|ابو|بن|ابن|إبن|ال|آل|El|el|Al|al|De|de|Van|van|Da|da)$/.test(w[k-1]))k--;return w.slice(k).join(' ');}
function flagCss(cc){const C=CBY[cc];if(!C)return'#888';const f=C.flag,d=C.dir==='v'?'to left':'to bottom';return`linear-gradient(${d},${f[0]} 0 33.3%,${f[1]} 33.3% 66.6%,${f[2]} 66.6%)`;}
function flagHTML(cc){return`<span class="flag" style="background:${flagCss(cc)}"></span>`;}
function kitOf(t){return t.kitArr||KITS[(t.kit||0)%KITS.length];}
function crestHTML(t,cls){const k=kitOf(t);return`<div class="crest ${cls||''}" style="background:${k[0]};color:${lum(k[0])>.6?'#111':'#fff'};box-shadow:inset 0 -10px 0 ${k[1]}">${esc(t.short||shortOf(t.name))}</div>`;}
function natKit(cc){const C=CBY[cc];return C?[C.flag[0]==='#FFFFFF'&&C.flag[1]?C.flag[1]:C.flag[0],C.flag[1]===C.flag[0]?C.flag[2]:C.flag[1],C.flag[0]]:KITS[1];}
const NAT_RT={EG:76,MA:81,DZ:76,TN:73,SA:72,QA:71,JO:71,IQ:70,AE:68,EN:86,ES:88,FR:88,DE:84,IT:82,PT:85,NL:83,TR:78,BR:85,AR:87,US:77};
function natR(cc){const C=CBY[cc];return NAT_RT[cc]||Math.round(55+(C?C.s:.5)*30);}
const ICON={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',car:'<path d="M5 16l1.5-5h11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7.5" cy="20" r="1.6"/><circle cx="16.5" cy="20" r="1.6"/>',watch:'<circle cx="12" cy="12" r="6"/><path d="M12 9v3l2 2M9 3h6M9 21h6"/>',gym:'<path d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',boat:'<path d="M3 17l2 4h14l2-4zM12 3v14M12 4l6 9H12"/>',cup:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'};
function svgI(k,c,s){return`<svg width="${s||28}" height="${s||28}" viewBox="0 0 24 24" fill="none" stroke="${c||'#C6F432'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;}

/* ================= CAREER MODEL ================= */
const WAGE=[700,1400,2800,6000,16000,42000,95000,190000];
function rrDouble(n){const arr=[...Array(n).keys()],R1=[];for(let r=0;r<n-1;r++){const pr=[];for(let i=0;i<n/2;i++){const a=arr[i],b=arr[n-1-i];pr.push(r%2?[b,a]:[a,b]);}R1.push(pr);arr.splice(1,0,arr.pop());}return R1.concat(R1.map(r=>r.map(([a,b])=>[b,a])));}
function genClubs(cc,n,base,used,kitStart){const out=[];const shs=new Set();for(let i=0;i<n;i++){let nm=teamName(cc,used);for(let k=0;k<8&&shs.has(shortOf(nm));k++){used.add(nm);nm=teamName(cc,used);}shs.add(shortOf(nm));out.push({name:nm,short:shortOf(nm),kit:(kitStart+i*5)%KITS.length,R:Math.round(base+R(-4,6)),cc});}return out;}
function newCareer(o){const c={v:2,name:o.name,nat:o.nat,pos:o.pos,num:o.num,skin:o.skin,hair:o.hair,age:17,attrs:Object.assign({},POS[o.pos].st),sp:3,money:1500,followers:120,morale:62,fans:45,coach:55,energy:100,inj:0,
  path:{home:o.start,tier:0,abroad:{}},club:o.club,contract:{wage:WAGE[0],years:2},season:1,si:0,sched:[],ss:{apps:0,g:0,a:0,rs:0,yc:0,motm:0},tot:{apps:0,g:0,a:0},intl:{called:false,caps:0,g:0},
  trophies:[],history:[],inbox:[],feed:[],owned:[],lastPost:-1,contQ:false,sponsor:0,spLevel:0,won:0,msgId:1};
 buildSeason(c);
 mail(c,'coach','المدرب','أهلاً بيك في '+c.club.name,'إنت لسه صغير وقدامك طريق طويل. اشتغل في التمرين، وورّيني في الماتشات إنك تستاهل مكانك. الدوري هنا صعب ومحدش هيرحمك.');
 mail(c,'agent','وكيلك — كابتن سامح','خطتنا','هدفنا الموسم ده: متوسط تقييم 7 أو أكتر. لو عملتها، الأندية الأكبر هتبدأ تسأل عليك. وخلي بالك من تصريحاتك في المؤتمرات، الصحافة مابترحمش.');
 return c;}
function mail(c,type,from,title,body,action){c.inbox.unshift({id:c.msgId++,type,from,title,body,action:action||null,read:false,season:c.season});if(c.inbox.length>60)c.inbox.length=60;}
function feedPost(c,user,text,mine){c.feed.unshift({user,text,likes:Math.round((mine?c.followers*R(.05,.15):R(5,200)*(1+c.followers/5000))),rt:Math.round(R(0,40)*(1+c.followers/20000)),mine:!!mine,t:c.si});if(c.feed.length>50)c.feed.length=50;}
function curTier(c){return tierInfo(c.path,c.path.tier);}
function myTeamDef(c,info){const st={};const mb=Math.round((c.morale-50)/12);for(const k in c.attrs)st[k]=clamp(c.attrs[k]+mb,20,99);
 const star={slot:POS[c.pos].slot,st,name:c.name,num:c.num,skin:c.skin,hair:c.hair,en:c.energy};
 if(info.nat)return{name:'منتخب '+CBY[c.nat].n,short:CBY[c.nat].n.slice(0,5),kitArr:natKit(c.nat),R:natR(c.nat),nm:CBY[c.nat].nm,star};
 return{name:c.club.name,short:c.club.short,kit:c.club.kit,kitArr:c.club.kitArr,R:c.league.teams[0].R,nm:CBY[c.club.cc||c.path.home].nm,star,sq:squadDef(c,Object.assign({cc:c.path.abroad[c.path.tier]||c.path.home},c.club,{R:c.league.teams[0].R}))};}
function applyResult(lg,a,b,ga,gb){const A=lg.teams[a],B=lg.teams[b];A.P++;B.P++;A.GF+=ga;A.GA+=gb;B.GF+=gb;B.GA+=ga;if(ga>gb){A.Wn++;B.Ls++;A.Pts+=3;}else if(ga<gb){B.Wn++;A.Ls++;B.Pts+=3;}else{A.D++;B.D++;A.Pts++;B.Pts++;}}
function sortTable(lg){return lg.teams.map((t,i)=>Object.assign({i},t)).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);}
function poisson(l){let L1=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random();}while(p>L1);return k-1;}
function simScore(Ra,Rb){const d=(Ra-Rb)/20;return[poisson(clamp(1.35*Math.exp(d),.2,4)),poisson(clamp(1.15*Math.exp(-d),.2,4))];}
function rate(s,res){let r=6+s.g*1.1+s.a*.7+s.pc*.05-s.pf*.1+s.tk*.25+s.sot*.2-s.lost*.06-s.yc*.3-s.rc*1.5+(res>0?.4:res<0?-.3:0);return clamp(Math.round(r*10)/10,3.5,10);}
function natReq(c){return Math.round(62+CBY[c.nat].s*20);}

/* ================= SCREENS ================= */
const TABS=['hub','news','player','comps','inbox','social','life','career'];
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==='scr-'+id));const tab=TABS.includes(id)&&App.c;$('cm').classList.toggle('on',!!tab);if(tab)renderShell(id);$('hud').classList.toggle('on',id==='match');$('dim').classList.toggle('off',id==='match');
 if(id!=='match'&&!App.demo)startDemo();const r={title:renderTitle,hub:renderHub,player:renderPlayer,comps:renderComps,career:renderCareer,card:()=>{if(typeof renderCard==='function')renderCard();},news:renderNews,inbox:renderInbox,social:renderSocial,life:renderLife,settings:renderSettings}[id];if(r)r();}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
function startDemo(){const used=new Set();const a=genClubs('ES',2,84,used,1);App.demo=new Match({home:Object.assign(a[0],{nm:'es'}),away:Object.assign(a[1],{nm:'es'}),demo:true,halfLen:600});}
function renderTitle(){const c=App.c;$('mContinue').classList.toggle('hidden',!c||!!c.retired);if(App._badSave&&!c){App._badSave=false;toast('ملف الحفظ اتعدّل من برّه اللعبة ومش هينفع يتفتح');}if(c)$('mContSub').textContent=c.name+' · '+c.tierShort+' · '+ovr(c);}
function cardHTML(c,kit){const o=ovr(c);const bg=kit?kit[0]:null;return`<div class="ovr">${o}</div><div class="pos">${POS[c.pos].n} · ${c.num}</div><div class="row" style="gap:6px">${flagHTML(c.nat)}<span style="font-weight:800;font-size:13px">${esc(CBY[c.nat].n)}</span></div><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${bg&&lum(bg)<.5?'#fff':'#0B1410'}" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg><div class="nm">${esc(c.name)}</div><div style="font-size:12px;font-weight:700">${esc(c.club?c.club.name:'')}</div>`;}

/* ---------- create wizard ---------- */
const NEW={step:1,name:'',nat:'EG',pos:'RW',num:27,skin:SKINS[1],hair:HAIRS[0],start:'EG',clubs:null,club:null};
function renderCreate(){const s=NEW.step;$('crSteps').innerHTML=[1,2,3].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('');
 $('crT').textContent=['','مين إنت؟','مركزك وشكلك','هتبدأ فين؟'][s];$('crNext').textContent=s===3?'ابدأ المسيرة':'التالي';
 const B=$('crBody');
 if(s===1){B.innerHTML=`<div class="field"><label for="cName">اسم اللاعب</label><input id="cName" maxlength="24" dir="auto" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(NEW.name)}" placeholder="اكتب اسمك"></div><div class="field"><label>جنسيتك (المنتخب اللي هتلعب له)</label><div class="cgrid">${COUNTRIES.map(C=>`<button class="cbtn ${NEW.nat===C.c?'on':''}" data-n="${C.c}">${flagHTML(C.c)}${C.n}</button>`).join('')}</div></div>`;
  $('cName').oninput=e=>{NEW.name=e.target.value;sideCard();};B.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{NEW.nat=b.dataset.n;if(!NEW.clubs)NEW.start=NEW.nat;renderCreate();});}
 if(s===2){B.innerHTML=`<div class="field"><label>المركز</label><div class="seg" id="cPos">${Object.keys(POS).map(k=>`<button data-v="${k}" class="${NEW.pos===k?'on':''}">${POS[k].n}</button>`).join('')}</div></div>
  <div class="field"><label>الرقم</label><div class="seg" id="cNum">${[7,9,10,11,17,19,27,99].map(n=>`<button data-v="${n}" class="${NEW.num===n?'on':''}">${n}</button>`).join('')}</div></div>
  <div class="row wrap" style="gap:28px"><div class="field"><label>لون البشرة</label><div class="row">${SKINS.map(x=>`<button class="sw ${x===NEW.skin?'on':''}" style="background:${x}" data-s="${x}" aria-label="لون بشرة"></button>`).join('')}</div></div><div class="field"><label>لون الشعر</label><div class="row">${HAIRS.map(x=>`<button class="sw ${x===NEW.hair?'on':''}" style="background:${x}" data-h="${x}" aria-label="لون شعر"></button>`).join('')}</div></div></div>
  <div class="sub">صفات البداية: ${Object.keys(ATTRN).map(k=>ATTRN[k]+' '+POS[NEW.pos].st[k]).join(' · ')}</div>`;
  B.querySelectorAll('#cPos button').forEach(b=>b.onclick=()=>{NEW.pos=b.dataset.v;renderCreate();});B.querySelectorAll('#cNum button').forEach(b=>b.onclick=()=>{NEW.num=+b.dataset.v;renderCreate();});
  B.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{NEW.skin=b.dataset.s;renderCreate();});B.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{NEW.hair=b.dataset.h;renderCreate();});}
 if(s===3){const ti=tierInfo({home:NEW.start,tier:0,abroad:{}},0);if(!NEW.clubs||NEW.clubs.cc!==NEW.start){const used=new Set();NEW.clubs=genClubs(NEW.start,3,ti.base,used,2);NEW.clubs.cc=NEW.start;NEW.club=null;}
  B.innerHTML=`<div class="field"><label>${esc(ti.name)} — اختار النادي اللي هتمضي له أول عقد</label><div class="clubs">${NEW.clubs.map((t,i)=>`<button class="clubc ${NEW.club===i?'on':''}" data-k="${i}">${crestHTML(t,'s')}<span>${esc(t.name)}</span><span class="sub">تقييم ${t.R} · ${['هيعتمد عليك أساسي','مشروع شباب','جمهور كبير'][i]}</span></button>`).join('')}</div></div>
  <div class="field"><label>غيّر البلد — كل الدوريات بتبدأ من الدرجة الرابعة</label><div class="cgrid">${COUNTRIES.map(C=>`<button class="cbtn ${NEW.start===C.c?'on':''}" data-c="${C.c}">${flagHTML(C.c)}${C.n}</button>`).join('')}</div></div>`;
  B.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{NEW.start=b.dataset.c;NEW.clubs=null;renderCreate();});B.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{NEW.club=+b.dataset.k;renderCreate();});}
 sideCard();}
function sideCard(){const f={name:NEW.name.trim()||'لاعبك',pos:NEW.pos,num:NEW.num,nat:NEW.nat,attrs:POS[NEW.pos].st,club:NEW.club!==null&&NEW.clubs?NEW.clubs[NEW.club]:{name:'—'}};$('crCard').innerHTML=cardHTML(f);}
$('crBack').onclick=()=>{if(NEW.step>1){NEW.step--;renderCreate();}else show('title');};
$('crNext').onclick=()=>{if(NEW.step===1&&!NEW.name.trim()){toast('اكتب اسم لاعبك الأول');return;}
 if(NEW.step<3){NEW.step++;renderCreate();return;}
 if(NEW.club===null){toast('اختار النادي');return;}
 const cl=NEW.clubs[NEW.club];const club={name:cl.name,short:cl.short,kit:cl.kit,cc:NEW.start,bonus:[1,0,0][NEW.club]};
 App.c=newCareer({name:NEW.name.trim().replace(/\s+/g,' '),nat:NEW.nat,pos:NEW.pos,num:NEW.num,skin:NEW.skin,hair:NEW.hair,start:NEW.start,club});if(NEW.club===2){App.c.followers+=300;App.c.fans=55;}if(NEW.club===1){App.c.coach=65;}
 store();showSign(club,'أول عقد احترافي!','عقد لمدة سنتين · '+money(WAGE[0])+' في الأسبوع',()=>show('hub'));};

/* ---------- hub ---------- */
function renderShell(id){const c=App.c;$('cmCrest').innerHTML=crestHTML(c.club,'s');$('cmName').textContent=c.club.name;$('cmTier').textContent=c.tierName+' · الموسم '+c.season+' · '+c.age+' سنة';$('cmMoney').textContent=money(c.money);
 document.querySelectorAll('#cmTabs button').forEach(b=>{b.classList.toggle('on',b.dataset.t===id);b.onclick=()=>show(b.dataset.t);});const un=c.inbox.filter(m=>!m.read).length;const bd=$('cmBadge');bd.textContent=un||'';bd.classList.toggle('on',un>0);
 const f=c.sched[c.si];if(f){const info=fixInfo(c,f);$('cmAdvS').textContent=(c.inj>0||c.susp>0?'تابع: ':'')+info.short+' ضد '+info.opp.name;}else $('cmAdvS').textContent='نهاية الموسم';}
$('cmAdv').onclick=()=>{const c=App.c;if(c.si>=c.sched.length)return seasonEnd();openPre();};
$('cmSet').onclick=()=>{App.returnTo='hub';show('settings');};$('cmMenu').onclick=()=>show('title');
function renderHub(){const c=App.c;if(!c)return show('title');if(c.league&&!c.league.N&&!c.retired){wInit(c);buildSeason(c);store();toast('اتعمل تقويم جديد للموسم بالمواعيد الحقيقية');}
 const days=[];for(let i=c.si;i<c.sched.length&&days.length<8;i++){const f=c.sched[i];if(!fixValid(c,f)&&i!==c.si)continue;const info=fixInfo(c,f);days.push(`<div class="cday ${i===c.si?'now':''}"><span class="k ${f.t}">${info.short}</span><span>${esc(info.opp.short||info.opp.name)}</span><small>${f.d?dTxt(f.d):''}</small></div>`);}
 $('hLine').innerHTML=days.join('')||'<div class="cday now"><span>نهاية الموسم</span></div>';
 const f=c.sched[c.si];
 if(f){const info=fixInfo(c,f);const me=info.nat?{name:'منتخب '+CBY[c.nat].n,short:CBY[c.nat].n.slice(0,5),kitArr:natKit(c.nat)}:c.club;
  $('tNext').innerHTML=`<span class="lbl">${f.d?dTxt(f.d,true)+' · ':''}${esc(info.comp)} · ${esc(info.label)}${info.home===false?' · برّه':info.home?' · على ملعبنا':''}</span><div class="vs"><div>${crestHTML(me)}<div class="tname">${esc(me.name)}</div><div class="sub" style="text-align:center">${info.nat?natR(c.nat):c.league.teams[0].R}</div></div><div class="vsx">VS</div><div>${crestHTML(info.opp)}<div class="tname">${esc(info.opp.name)}</div><div class="sub" style="text-align:center">${info.opp.R}</div></div></div><span class="sm">${c.susp>0?'<b style="color:var(--red)">موقوف الماتش ده</b>':c.inj>0?'<b style="color:var(--red)">مصاب — غايب '+c.inj+' ماتش</b>':info.big?'ماتش كبير — كل العيون عليك':'طاقة '+c.energy+'% · معنويات '+c.morale+'%'}</span>`;}
 else $('tNext').innerHTML=`<span class="lbl">الموسم خلص</span><span class="big">دوس «كمّل» تشوف نتيجة الموسم والعروض</span>`;
 $('tObj').innerHTML=`<span class="lbl">أهداف الموسم من المدرب</span>`+(c.obj||[]).map(o=>{const [v,ok]=objProg(c,o);const pct=o.k==='pos'?(ok?100:clamp((9-v)/(9-o.t)*100,5,95)):clamp(v/o.t*100,0,100);return`<div class="objrow ${ok?'done':''}"><span>${esc(o.n)}</span><b style="text-align:left">${o.k==='avg'?v.toFixed(1):o.k==='pos'?'#'+v:v+'/'+o.t}</b><div class="bar"><i style="width:${pct}%;${ok?'':'background:var(--blue)'}"></i></div></div>`;}).join('');
 const o=ovr(c);$('tPlayer').innerHTML=`<span class="lbl">لاعبي</span><div class="row" style="justify-content:space-between"><span class="big" style="font-size:clamp(28px,7vh,44px)">${o}</span><span class="sm" style="text-align:left">${POS[c.pos].n}<br>${c.sp} نقطة مهارة</span></div><div class="row"><span class="sm" style="width:52px">معنويات</span><div class="bar"><i style="width:${c.morale}%"></i></div></div><div class="row"><span class="sm" style="width:52px">المدرب</span><div class="bar"><i style="width:${c.coach}%;background:var(--blue)"></i></div></div><div class="row"><span class="sm" style="width:52px">الجمهور</span><div class="bar"><i style="width:${c.fans}%;background:var(--gold)"></i></div></div>${c.sp>=costOf(Math.min(...Object.values(c.attrs)))?'<span class="sm" style="color:var(--acc)">عندك نقاط تطوّر بيها لاعبك</span>':''}`;
 wInit(c);const news=[];const NK={me:'عنك',league:'الدوري',transfer:'انتقالات',world:'العالم'};c.news.slice(0,4).forEach(n=>news.push(`<div class="newsi"><b>${NK[n.k]||''}:</b> ${esc(n.txt)}</div>`));c.inbox.filter(m=>!m.read).slice(0,1).forEach(m=>news.push(`<div class="newsi"><b>${esc(m.from.split(' ')[0])}:</b> ${esc(m.title)}</div>`));if(news.length<3)c.feed.filter(p=>!p.mine).slice(0,2).forEach(p=>news.push(`<div class="newsi"><b>${esc(p.user)}</b> ${esc(p.text)}</div>`));
 $('tNews').innerHTML=`<span class="lbl">آخر الأخبار · القيمة السوقية ${money(marketValue(c))}</span>`+(news.join('')||'<span class="sm">لسه محدش بيتكلم عنك</span>');
 const tb=sortTable(c.league),pos=tb.findIndex(t=>t.me)+1;const st=Math.max(0,Math.min(pos-3,tb.length-5));
 $('tTable').innerHTML=`<span class="lbl">${esc(c.tierShort)} · المركز ${pos}</span><table class="mini">${tb.slice(st,st+5).map((t,i)=>`<tr class="${t.me?'me':''}"><td>${st+i+1}</td><td>${esc(t.name)}</td><td style="text-align:left">${t.Pts}</td></tr>`).join('')}</table><span class="sm">${esc(c.cup.name)}: ${c.cup.won?'أبطال':c.cup.alive?c.cup.rn[c.cup.round]:'خرجنا'}${c.cont?' · '+esc(c.cont.name)+': '+(c.cont.won?'أبطال':!c.cont.alive?'خرجنا':c.cont.phase==='g'?'الدور الأول':c.cont.ko[c.cont.kr][0]):''}</span>`;}
$('tNext').onclick=()=>$('cmAdv').click();$('tNews').onclick=()=>show('news');$('tPlayer').onclick=()=>show('player');$('tTable').onclick=()=>show('comps');
/* ---------- player ---------- */
function costOf(v){return v<65?1:v<75?2:v<85?3:4;}
function renderPlayer(){const c=App.c;$('pSP').textContent=c.sp;$('pEn').textContent=c.energy+'%';$('pCard').innerHTML=cardHTML(c,kitOf(c.club));$('pCard').style.background=kitOf(c.club)[0];$('pCard').style.color=lum(kitOf(c.club)[0])>.6?'#0B1410':'#fff';
 $('pMeters').innerHTML=[['معنويات',c.morale,'var(--acc)'],['ثقة المدرب',c.coach,'var(--blue)'],['الجمهور',c.fans,'var(--gold)']].map(([n,v,col])=>`<div class="meter"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${col}"></i></div><b>${v}</b></div>`).join('');
 const tr=c.owned.includes('gym')?2:1;
 $('pAttrs').innerHTML=Object.keys(ATTRN).map(k=>{const v=c.attrs[k],cost=costOf(v);return`<div class="attr"><span>${ATTRN[k]}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b><button class="pm" data-up="${k}" ${c.sp<cost||v>=99?'disabled':''} aria-label="زوّد ${ATTRN[k]}">+1 · ${cost}ن</button><button class="pm tr" data-tr="${k}" ${c.energy<30||v>=99?'disabled':''} aria-label="تمرين ${ATTRN[k]}">تمرين ${((c.trp||{})[k]||0)}%</button></div>`;}).join('')+`<div class="sub" style="margin-top:10px">نقاط المهارة بتيجي في آخر كل موسم حسب مستواك ومشاركتك (حوالي 5 للموسم الكويس). كل تمرين بياخد 30% طاقة ويقرّب المهارة من +1، والصغير بيتطور أسرع${tr>1?'، والجيم الخاص بتاعك بيخليه أقوى':''}، ونجاحه مش مضمون. الطاقة بترجع بعد كل ماتش. والتقييم اللي محتاجه للمحطة الجاية: <b style="color:var(--acc)">${TIER_REQ[Math.min(7,c.path.tier+1)]}</b>.</div>`+statsHTML(c);
 $('pAttrs').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const k=b.dataset.up,cost=costOf(c.attrs[k]);if(c.sp>=cost){const o0=ovr(c);c.sp-=cost;c.attrs[k]++;store();renderPlayer();if(ovr(c)>o0){toast('التقييم العام زاد: '+ovr(c));flashDom();}}});
 $('pAttrs').querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{const k=b.dataset.tr;if(c.energy<30)return;c.energy-=30;c.trp=c.trp||{};const gain=Math.round((c.age<=21?22:c.age<=25?16:c.age<=29?10:6)*(tr>1?1.25:1)*R(.7,1.3)*(c.attrs[k]>=80?.7:1));c.trp[k]=(c.trp[k]||0)+gain;if(c.trp[k]>=100){c.trp[k]-=100;c.attrs[k]=Math.min(99,c.attrs[k]+1);toast('التمرين جاب نتيجة: '+ATTRN[k]+' +1');flashDom();}else toast('تمرين '+ATTRN[k]+': التقدم '+c.trp[k]+'%');store();renderPlayer();});}

function statsHTML(c){wInit(c);const s=c.ss,t=c.tot,avg=s.apps?(s.rs/s.apps).toFixed(2):'—';const st=(v,n)=>`<div><b>${v}</b><span>${n}</span></div>`;
 return `<div class="ttl" style="font-size:18px;margin:16px 0 6px">أرقام الموسم ${c.season}</div><div class="statg s4">${st(s.apps,'ماتش')}${st(s.g,'هدف')}${st(s.a,'أسيست')}${st(avg,'متوسط التقييم')}${st(s.motm||0,'رجل الماتش')}${st((s.sot||0)+'/'+(s.sh||0),'تسديدات على المرمى')}${st(s.p?Math.round(s.pc/s.p*100)+'%':'—','دقة التمرير')}${st(s.tk||0,'افتكاك')}${st((s.yc||0)+' / '+(s.rc||0),'أصفر / أحمر')}${st(s.apps?((s.g+s.a)/s.apps).toFixed(2):'—','مساهمة لكل ماتش')}</div>
 <div class="ttl" style="font-size:18px;margin:16px 0 6px">المسيرة</div><div class="statg s4">${st(t.apps,'ماتش')}${st(t.g,'هدف')}${st(t.a,'أسيست')}${st(t.motm||0,'رجل الماتش')}${st(c.intl.caps+' / '+c.intl.g,'دولي / أهداف')}${st(c.trophies.length,'بطولات وجوايز')}${st(money(marketValue(c)),'القيمة السوقية')}${st(money(c.contract.wage),'المرتب الأسبوعي')}${st(c.contract.years+' سنة','باقي في العقد')}</div>`;}
let nwTab='all';
function renderNews(){const c=App.c;wInit(c);const K={me:['عنك','#C6F432'],league:['الدوري','#4FC3F7'],transfer:['انتقالات','#F5C542'],world:['العالم','#B388FF']};
 $('nwTabs').innerHTML=[['all','الكل'],['me','عنك'],['league','الدوري'],['transfer','انتقالات'],['world','العالم']].map(([k,n])=>`<button data-t="${k}" class="${nwTab===k?'on':''}">${n}</button>`).join('');
 $('nwTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{nwTab=b.dataset.t;renderNews();});
 const L=c.news.filter(n=>nwTab==='all'||n.k===nwTab);
 $('nwBody').innerHTML=L.map(n=>`<div class="nwi ${n.big?'big':''}"><span class="nk" style="background:${(K[n.k]||K.me)[1]}">${(K[n.k]||K.me)[0]}</span><div class="grow"><div class="nt">${esc(n.txt)}</div><div class="sub">الموسم ${n.s}${n.md?' · بعد الجولة '+n.md:''}</div></div></div>`).join('')||'<div class="sub" style="padding:10px">لسه مافيش أخبار… العب ماتشات وخلّي الناس تتكلم عنك</div>';}
/* ---------- competitions ---------- */
let cpTab='L';
function renderComps(){const c=App.c;const tabs=[['T','التقويم'],['L','الدوري'],['S','الهدافين'],['C','الكأس']].concat(c.cont?[['K','القارية']]:[]).concat(c.ntc&&(c.ntc.q||c.ntc.tt||c.ntc.tj)?[['N','المنتخب']]:[]);$('cpTabs').innerHTML=tabs.map(([k,n])=>`<button data-t="${k}" class="${cpTab===k?'on':''}">${n}</button>`).join('');$('cpTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{cpTab=b.dataset.t;renderComps();});
 const B=$('cpBody');
 if(cpTab==='L'){const tb=sortTable(c.league);const dom=curTier(c).domestic;const upTxt=dom&&c.path.tier<3?'أول اتنين بيصعدوا':c.path.tier>=3?'أول اتنين في البطولة القارية':'';B.innerHTML=`<div class="sub" style="margin-bottom:6px">${esc(c.tierName)}${upTxt?' · '+upTxt:''}${c.path.tier>0||!dom?' · آخر اتنين بيهبطوا':''} · الجولة ${c.league.md} من 14</div><table class="tbl"><tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>نقاط</th></tr>`+tb.map((t,i)=>`<tr data-sq="${t.i}" style="cursor:pointer" class="${t.me?'me':''} ${i<2?'up':''} ${i>=tb.length-2&&(c.path.tier>0||!dom)?'dn':''}"><td>${i+1}</td><td>${esc(t.name)}</td><td>${t.P}</td><td>${t.Wn}</td><td>${t.D}</td><td>${t.Ls}</td><td>${t.GF}</td><td>${t.GA}</td><td><b>${t.Pts}</b></td></tr>`).join('')+'</table>';}
 if(cpTab==='L'){B.innerHTML+='<div class="sub" style="margin-top:6px">دوس على أي نادي تشوف تشكيلته</div>';B.querySelectorAll('[data-sq]').forEach(tr=>tr.onclick=()=>showSquad(c.league.teams[+tr.dataset.sq]));}
 if(cpTab==='S'){const rows=scorersTable(c).sort((a,b)=>b.g-a.g||b.a-a.a||(a.me?-1:1)).slice(0,12);B.innerHTML=`<div class="sub" style="margin-bottom:6px">سباق الهدافين والجوائز الفردية في ${esc(c.tierShort)}</div><table class="tbl"><tr><th>#</th><th>اللاعب</th><th>النادي</th><th>ماتش</th><th>أهداف</th><th>أسيست</th><th>تقييم</th></tr>`+rows.map((x,i)=>`<tr class="${x.me?'me':''}"><td>${i+1}</td><td>${x.me?'<b>'+esc(x.n)+'</b>':esc(x.n)}</td><td>${esc(x.club)}</td><td>${x.apps}</td><td><b>${x.g}</b></td><td>${x.a}</td><td>${x.apps?x.avg.toFixed(2):'—'}</td></tr>`).join('')+'</table>';}
 if(cpTab==='T'){B.innerHTML=`<div class="sub" style="margin-bottom:6px">مواعيد الموسم ${seasonYear(c)}-${seasonYear(c)+1} كلها</div>`+calendarHTML(c);const n=B.querySelector('.calr.now');if(n)setTimeout(()=>n.scrollIntoView({block:'center'}),30);}
 if(cpTab==='C'){const cp=c.cup;const me=cp.teams.findIndex(t=>t.name===c.club.name);B.innerHTML=`<div class="ttl" style="font-size:22px">${esc(cp.name)}</div><div class="sub">${cp.teams.length} فريق · خروج المغلوب من ماتش واحد، ولو تعادل وقت إضافي وضربات ترجيح</div><div style="margin-top:10px">${cp.rn.map((n,i)=>`<div class="trophy">${svgI('cup',i<cp.round?'#9BCB12':i===cp.round&&cp.alive?'#C6F432':'#5A6688',22)}<span>${n}</span><span class="sub">${i<cp.round?'عدّيناه':i===cp.round&&cp.alive?'الجاي':''}</span></div>`).join('')}</div>${cp.pairs.length&&cp.alive?'<div class="sub" style="margin-top:8px">مباريات الدور الحالي:</div>'+cp.pairs.map(p=>`<div class="sub">${esc(cp.teams[p[0]].name)} × ${esc(cp.teams[p[1]].name)}${p.includes(me)?' ←':''}</div>`).join(''):''}${cp.won?'<div class="news">أبطال الكأس!</div>':cp.winner?`<div class="sub" style="margin-top:8px">البطل: ${esc(cp.winner)}</div>`:!cp.alive?'<div class="sub" style="margin-top:8px">خرجنا من الكأس الموسم ده</div>':''}`;}
 if(cpTab==='K'&&c.cont){const K=c.cont;const row=(x,i)=>`<tr class="${x.i===0?'me':''} ${i<(K.fmt==='swiss'?8:2)?'up':''}"><td>${i+1}</td><td>${esc(K.teams[x.i].name)}</td><td>${x.P}</td><td>${x.W}</td><td>${x.D}</td><td>${x.L}</td><td>${x.GF}:${x.GA}</td><td><b>${x.Pts}</b></td></tr>`;const head='<table class="tbl"><tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>أهداف</th><th>نقاط</th></tr>';
  let h=`<div class="ttl" style="font-size:22px">${esc(K.name)}</div><div class="sub">${K.fmt==='swiss'?'مرحلة الدوري: '+K.md+' ماتشات ضد خصوم مختلفين، أول 8 للـ16 مباشرة'+(K.ko[0][0]==='الملحق'?' ومن 9 لـ24 ملحق':''):K.fmt==='groups'?'دور مجموعات (ذهاب وعودة)، أول اتنين بيتأهلوا':'خروج المغلوب ذهاب وعودة'} · الأدوار: ${K.ko.map(x=>x[0]+(x[1]===2?' (ذهاب وعودة)':'')).join('، ')}</div>`;
  if(K.fmt==='swiss')h+=head+contStandings(K,K.teams.map((_,i)=>i).slice(0,K.final?K.teams.length:K.teams.length)).slice(0,K.teams.length>12?36:12).map(row).join('')+'</table>';
  else if(K.fmt==='groups')K.groups.forEach((g,gi)=>{h+=`<div class="sub" style="margin-top:8px">المجموعة ${'أبجدهوزح'[gi]}</div>`+head+contStandings(K,g).map(row).join('')+'</table>';});
  if(K.phase==='ko'&&K.pairs&&K.pairs.length)h+='<div class="sub" style="margin-top:8px">'+(K.ko[K.kr]?K.ko[K.kr][0]:'')+':</div>'+K.pairs.map(p=>`<div class="sub">${esc(K.teams[p[0]].name)} × ${esc(K.teams[p[1]].name)}${p.includes(0)?' ←':''}</div>`).join('');
  if(K.won)h+='<div class="news">أبطال القارة!</div>';else if(K.winner)h+=`<div class="sub">البطل: ${esc(K.winner)}</div>`;B.innerHTML=h;}
 if(cpTab==='N'&&c.ntc){const Q=c.ntc.q,X=c.ntc.tj||c.ntc.tt;let h='';const tb=(T,teams)=>'<table class="tbl"><tr><th>#</th><th>المنتخب</th><th>لعب</th><th>نقاط</th><th>أهداف</th></tr>'+T.map((t,i)=>Object.assign({i},t)).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)).map((x,k)=>`<tr class="${x.i===0?'me':''}"><td>${k+1}</td><td>${esc(teams[x.i].name)}</td><td>${x.P}</td><td><b>${x.Pts}</b></td><td>${x.GF}:${x.GA}</td></tr>`).join('')+'</table>';
  if(Q)h+=`<div class="ttl" style="font-size:20px">${esc(Q.name)}</div><div class="sub">مجموعة من 5 منتخبات ذهاب وعودة${Q.done?' · '+(Q.qual?'اتأهلنا!':'ما اتأهلناش'):''}</div>`+tb(Q.tab,Q.teams);
  if(X)h+=`<div class="ttl" style="font-size:20px;margin-top:10px">${esc(X.name)}</div><div class="sub">دور المجموعات ثم ${X.rn.join(' ← ')}</div>`+tb(X.tab,X.teams)+(X.won?'<div class="news">أبطال!</div>':'');
  if(!c.intl.called)h+='<div class="sub" style="margin-top:8px">لسه مش متاستدعي للمنتخب — النتايج بتتلعب من غيرك.</div>';B.innerHTML=h;}}
function showSquad(t){const c=App.c,B=$('cpBody');const club=Object.assign({cc:curTier(c).country},t);const S=getSquad(c,club).slice().sort((a,b)=>['GK','DF','MF','FW'].indexOf(a.r)-['GK','DF','MF','FW'].indexOf(b.r)||b.ov-a.ov);const RN={GK:'حارس',DF:'دفاع',MF:'وسط',FW:'هجوم'};
 const rows=S.filter(p=>!(t.me&&p.n===c.name));const avg=Math.round(rows.reduce((a,p)=>a+p.ov,0)/rows.length);
 B.innerHTML=`<div class="row" style="justify-content:space-between;margin-bottom:8px"><div class="row">${crestHTML(t,'s')}<div><div class="ttl" style="font-size:20px">${esc(t.name)}</div><div class="sub">قوة الفريق ${t.R} · متوسط التشكيلة ${avg}</div></div></div><button class="btn ghost sm" id="sqBack">رجوع للجدول</button></div><table class="tbl"><tr><th>اللاعب</th><th>المركز</th><th>السن</th><th>التقييم</th></tr>`+(t.me?`<tr class="me"><td><b>${esc(c.name)}</b></td><td>${esc(POS[c.pos].n)}</td><td>${c.age}</td><td><b>${ovr(c)}</b></td></tr>`:'')+rows.map(p=>`<tr class="${p.real?'up':''}"><td>${p.real?'<b>'+esc(p.n)+'</b>':esc(p.n)}</td><td>${RN[p.r]}</td><td>${p.age}</td><td><b>${p.ov}</b></td></tr>`).join('')+'</table>';
 $('sqBack').onclick=()=>renderComps();}
/* ---------- career ---------- */
function renderCareer(){const c=App.c;const cb=$('caCard');if(cb)cb.onclick=()=>openCard('career');const rb=$('caRet');if(rb)rb.onclick=()=>{if(!rb.dataset.armed){rb.dataset.armed=1;rb.textContent='متأكد؟ دوس تاني';setTimeout(()=>{delete rb.dataset.armed;rb.textContent='اعتزل';},3000);return;}retire('قررت تعتزل');};$('caSub').textContent=`${c.name} · ${c.age} سنة · ${CBY[c.nat].n}`;
 $('lad').innerHTML=[0,1,2,3,4,5,6,7].map(i=>{const T=tierInfo(c.path,i);return`<div class="step ${i<c.path.tier?'done':i===c.path.tier?'now':''} ${i===7?'final':''}"><span class="n">${i+1}</span><span class="t">${esc(i===c.path.tier?T.name:T.short)}</span><span class="r">${i===c.path.tier?'إنت هنا':i<c.path.tier?'اتعدّت':'تقييم '+TIER_REQ[i]+'+'}</span></div>`;}).join('');
 $('caTro').innerHTML=`<div class="ttl" style="font-size:18px;margin-bottom:6px">البطولات والجوائز</div>`+(c.trophies.length?c.trophies.map(t=>`<div class="trophy">${svgI(t.k==='award'?'star':'cup',t.k==='award'?'#F5C542':'#C6F432',22)}<span>${esc(t.n)}</span><span class="sub">الموسم ${t.s}</span></div>`).join(''):'<div class="sub">لسه مافيش… الطريق طويل</div>')+(c.intl.called?`<div class="trophy">${flagHTML(c.nat)}<span>المنتخب: ${c.intl.caps} ماتش · ${c.intl.g} هدف</span></div>`:'');
 $('caHist').innerHTML=`<div class="ttl" style="font-size:18px;margin-bottom:6px">المواسم</div><table class="tbl"><tr><th>موسم</th><th>النادي</th><th>ماتشات</th><th>أهداف</th><th>أسيست</th><th>تقييم</th><th>رجل الماتش</th><th>المركز</th><th>القيمة</th></tr>`+c.history.map(h=>`<tr><td>${h.s}</td><td>${esc(h.club)}</td><td>${h.apps}</td><td>${h.g}</td><td>${h.a}</td><td>${h.avg.toFixed(1)}</td><td>${h.motm||0}</td><td>${h.pos}</td><td>${h.val?money(h.val):'—'}</td></tr>`).join('')+`<tr class="me"><td>${c.season}</td><td>${esc(c.club.name)}</td><td>${c.ss.apps}</td><td>${c.ss.g}</td><td>${c.ss.a}</td><td>${c.ss.apps?(c.ss.rs/c.ss.apps).toFixed(1):'—'}</td><td>${c.ss.motm||0}</td><td>…</td><td>${money(marketValue(c))}</td></tr></table>`;}

/* ---------- inbox ---------- */
let inSel=null;
const MCOL={coach:'#4FC3F7',agent:'#C6F432',club:'#F5C542',national:'#FF5A5F',sponsor:'#B388FF',media:'#A3AED0',medical:'#80CBC4'};
function renderInbox(){const c=App.c;if(inSel===null&&c.inbox[0])inSel=c.inbox[0].id;
 $('inList').innerHTML=c.inbox.map(m=>`<button class="mrow ${m.read?'':'unread'} ${m.id===inSel?'sel':''}" data-m="${m.id}"><span class="mic" style="background:${MCOL[m.type]||'#888'}">${esc(m.from[0])}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:14px">${esc(m.title)}</b><span class="sub" style="font-size:12px">${esc(m.from)}</span></span></button>`).join('')||'<div class="sub">مافيش رسايل</div>';
 $('inList').querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{inSel=+b.dataset.m;renderInbox();});
 const m=c.inbox.find(x=>x.id===inSel);if(!m){$('inView').innerHTML='';return;}m.read=true;store();
 let act='';if(m.action&&!m.action.done){if(m.action.k==='sponsor')act=`<button class="btn" id="mAct">وافق على الرعاية (+${money(m.action.v)} كل أسبوع)</button>`;if(m.action.k==='offer')act=`<button class="btn" id="mAct">افتح العرض</button>`;if(m.action.k==='renew')act=`<button class="btn" id="mAct">جدّد العقد</button>`;}
 $('inView').innerHTML=`<div class="row" style="margin-bottom:8px"><span class="mic" style="background:${MCOL[m.type]||'#888'}">${esc(m.from[0])}</span><div><div style="font-weight:800">${esc(m.from)}</div><div class="sub">الموسم ${m.season}</div></div></div><div class="ttl" style="font-size:22px;margin-bottom:8px">${esc(m.title)}</div><div style="line-height:1.8;font-size:16px">${esc(m.body)}</div><div style="margin-top:14px">${m.action&&m.action.done?'<span class="pill">اتنفّذ</span>':act}</div>`;
 const b=$('mAct');if(b)b.onclick=()=>{const a=m.action;if(a.k==='sponsor'){c.sponsor+=a.v;a.done=true;toast('مبروك! عقد رعاية جديد');flashDom();FX.confetti(80);}if(a.k==='offer'){a.done=true;openNegotiation(a.offer,()=>show('hub'));return;}store();renderInbox();};}

/* ---------- social ---------- */
function renderSocial(){const c=App.c;$('soSub').textContent=num(c.followers)+' متابع · شعبية الجمهور '+c.fans+'%';
 const can=c.lastPost!==c.si;const opts=MY_POSTS.filter(p=>!p[1].needs||c.owned.includes(p[1].needs)||c.owned.includes('sport'));
 $('soPost').innerHTML=`<div class="av" style="width:64px;height:64px;font-size:24px;background:var(--acc)">${esc(c.name[0])}</div><div style="font-weight:800">@${esc(c.name.replace(/\s+/g,'_'))}</div><div class="sub">${can?'اختار بوست تنزّله:':'نزّلت بوست النهارده، استنى بعد الماتش الجاي'}</div>${can?opts.slice(0,4).map((p,i)=>`<button class="btn ghost sm" style="width:100%" data-p="${i}">${esc(p[0])}</button>`).join(''):''}`;
 $('soPost').querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const p=opts[+b.dataset.p];const e=p[1];const gain=Math.round((c.followers*.02+30)*e.fol*(1+(c.ss.apps?(c.ss.rs/c.ss.apps-6.5)*.4:0)));c.followers+=Math.max(10,gain);c.morale=clamp(c.morale+(e.morale||0),0,100);c.fans=clamp(c.fans+(e.fans||0),0,100);c.coach=clamp(c.coach+(e.coach||0),0,100);c.lastPost=c.si;feedPost(c,'@'+c.name.replace(/\s+/g,'_'),p[0],true);
  for(let i=0;i<2;i++)feedPost(c,pick(FAN_NAMES),pick(['أسطورة','يلا يا نجم!','كلنا وراك','ركز في الكورة أحسن','مستنيين أهداف','بالتوفيق يا بطل']));toast('+'+num(gain)+' متابع جديد');store();renderSocial();});
 const cols=['#C6F432','#4FC3F7','#F5C542','#FF8A80','#B388FF','#80CBC4'];
 $('soFeed').innerHTML=c.feed.map((p,i)=>`<div class="post ${p.mine?'mine':''}" style="animation-delay:${Math.min(i,8)*.04}s"><div class="av" style="background:${cols[p.user.length%cols.length]}">${esc(p.user.replace('@','')[0]||'?')}</div><div style="flex:1"><div class="u">${esc(p.user)}</div><div class="x">${esc(p.text)}</div><div class="lk"><span>إعجاب ${num(p.likes)}</span><span>مشاركة ${num(p.rt)}</span></div></div></div>`).join('')||'<div class="sub">الجمهور لسه مايعرفكش… العب واعمل اسم</div>';}

/* ---------- life ---------- */
let lifeArm=null;
function renderLife(){const c=App.c;$('liSub').textContent='رصيدك '+money(c.money)+' · المرتب '+money(c.contract.wage)+'/أسبوع'+(c.sponsor?' · الرعاية '+money(c.sponsor)+'/أسبوع':'');
 $('liGrid').innerHTML=LIFE.map(it=>{const own=c.owned.includes(it.id);return`<div class="item ${own?'own':''}">${svgI(it.ic,own?'#F5C542':'#C6F432',34)}<b>${esc(it.n)}</b><span class="sub">${money(it.p)} · معنويات +${it.morale}${it.fol?' · متابعين +'+num(it.fol):''}${it.train?' · تمرين أقوى':''}</span>${own?'<span class="pill">بتاعك</span>':`<button class="btn sm ${lifeArm===it.id?'gold':''}" data-b="${it.id}" ${c.money<it.p?'disabled style="opacity:.4"':''}>${lifeArm===it.id?'متأكد؟ اشتري':'اشتري'}</button>`}</div>`;}).join('');
 $('liGrid').querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const it=LIFE.find(x=>x.id===b.dataset.b);if(c.money<it.p)return;if(lifeArm!==it.id){lifeArm=it.id;renderLife();return;}lifeArm=null;c.money-=it.p;c.owned.push(it.id);c.morale=clamp(c.morale+it.morale,0,100);c.followers+=it.fol;c.fans=clamp(c.fans+(it.fans||0),0,100);feedPost(c,'@'+c.name.replace(/\s+/g,'_'),'ألف مبروك عليا: '+it.n,true);flashDom();FX.confetti(90,['#F5C542','#FFFFFF','#C6F432']);toast('مبروك! '+it.n);store();renderLife();});}

/* ---------- press conference ---------- */
function openPress(kind,then){const c=App.c;const X=App.pressCtx||{};let pool=(PRESS[kind]||PRESS.pre).filter(q=>!q.w||(X&&q.w(X)));if(!pool.length)pool=(PRESS[kind]||PRESS.pre).filter(q=>!q.w);if(!pool.length)pool=PRESS.pre;
 // الأسئلة بتتكلم عن اللي حصل فعلاً في الماتش (أهدافك، تقييمك، النتيجة، لو نزلت بديل أو طلعت)
 const fill=t=>String(t).replace(/\{(\w+)\}/g,(m0,k)=>X[k]!=null?X[k]:'');const Q0=pick(pool);const Q={q:fill(Q0.q),a:Q0.a.map(a=>[fill(a[0]),a[1]])};const who=pick(JOURNALISTS)+' — '+pick(OUTLETS);
 $('prSub').textContent=kind==='pre'?'قبل الماتش':kind==='transfer'?'تقديمك للإعلام':'بعد الماتش';{const sc=$('scr-press');let rm=sc.querySelector('.prroom');if(rm)rm.remove();sc.insertAdjacentHTML('afterbegin',pressRoomHTML(kitOf(c.club),c));}$('prWho').textContent=who;$('prQ').textContent='';$('prA').innerHTML='';show('press');
 let i=0;const full=Q.q;const fl=setInterval(()=>{if(Math.random()<.35)flashDom();},900);
 const ty=setInterval(()=>{i++;$('prQ').textContent=full.slice(0,i);if(i>=full.length){clearInterval(ty);
  $('prA').innerHTML=Q.a.map((a,j)=>`<button class="btn ghost" data-a="${j}">${esc(a[0])}</button>`).join('');
  $('prA').querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{clearInterval(fl);const a=Q.a[+b.dataset.a],e=a[1];c.morale=clamp(c.morale+(e.morale||0),0,100);c.coach=clamp(c.coach+(e.coach||0),0,100);c.fans=clamp(c.fans+(e.fans||0),0,100);const g=Math.round((c.followers*.01+20)*(e.fol||0));c.followers+=g;
   if(e.fine){const f=Math.round(c.contract.wage*.5);c.money-=f;mail(c,'club','إدارة النادي','غرامة بسبب تصريحاتك','اتحاد الكورة غرّمك '+money(f)+' بسبب كلامك عن التحكيم. خلي بالك المرة الجاية.');}
   feedPost(c,'@kora_news',`${c.name}: "${a[0]}"`);let msg=e.coach<0?'المدرب مش مبسوط من كلامك':e.fans>3?'الجمهور حب الكلام ده!':'تصريح محسوب';
   if(e.punish&&Math.random()<e.punish*(c.coach<50?1.25:1)){const f=Math.round(c.contract.wage*.4);c.money-=f;c.coach=clamp(c.coach-8,0,100);c.punish=e.punish>=.8?2:1;mail(c,'coach','المدرب','عقاب على تصريحاتك','الكلام اللي قلته في المؤتمر الصحفي ده مرفوض تماماً. هتقعد على الدكة '+(c.punish>1?'الماتشين الجايين':'الماتش الجاي')+'، واتخصم منك '+money(f)+'. الفريق أكبر من أي حد.');addNews(c,'me','المدرب يعاقب '+c.name+' بعد تصريحاته: دكة وغرامة '+money(f),true);msg='المدرب عاقبك! دكة '+(c.punish>1?'ماتشين':'ماتش')+' وغرامة '+money(f);}
   toast(msg);store();then();});}},28);}

/* ---------- قرار المدرب ---------- */
function coachPick(c,f,info){if(f.pick)return f.pick;if(c.punish>0&&!info.nat){c.punish--;f.pick={st:'bench',min:RI(64,80),why:'عقاب المدرب بسبب تصريحاتك'};return f.pick;}let p;const o=ovr(c);const form=(c.form&&c.form.length)?c.form.reduce((a,b)=>a+b,0)/c.form.length:6.6;const Y1=seasonYear(c)+1;
 if(info.nat){const d=o-natR(c.nat)+(c.intl.caps>5?3:0)+(form-6.7)*3;p=d>=-2?{st:'start'}:{st:'bench',min:RI(60,80)};}
 else{const X=c.ntc&&c.ntc.jan&&c.intl.called?ntTourn(c,true):null;const jan=X&&X.alive&&f.d>=Y1+'-01-06'&&f.d<=Y1+'-02-08';
  if(jan){p={st:'out',why:'مع المنتخب في '+X.name};}
  else{const role=c.pos==='CAM'||c.pos==='CM'?'MF':'FW';const S=squadDef(c,Object.assign({cc:curTier(c).country},c.club)).filter(x=>x.r===role).sort((a,b)=>b.ov-a.ov);const rival=S[2]||S[S.length-1]||{ov:o};
   const sc=(o-rival.ov)*1.1+(c.coach-55)*.16+(form-6.7)*4+(c.energy<40?-4:0)+(c.age<=18?-2:0)+(info.big&&c.coach<45?-3:0)+R(-1.5,1.5);
   const rot=(info.cup||/كأس/.test(info.comp||''))&&sc>-15&&Math.random()<.45;
   p=sc>=0||rot?{st:'start',weak:sc<3}:sc>=-9?{st:'bench',min:clamp(Math.round(78-(sc+9)*2.2+R(-4,4)),46,86)}:sc>=-17&&Math.random()<.5?{st:'bench',min:RI(72,88)}:{st:'out',why:'المدرب شايف إنك محتاج تشتغل أكتر في التمرين'};
   // اللي قاعد برّه القايمة بيكسب ثقة المدرب شوية شوية من التمرين، عشان ما يفضلش محبوس على الدكة للأبد
   if(p.st==='out')c.coach=Math.min(100,(c.coach||50)+.6);}}
 f.pick=p;return p;}
/* ---------- تعليمات المدرب قبل كل ماتش ---------- */
const INST={sh:n=>'سدد كتير: '+n+' تسديدات على الأقل',deep:()=>'ماتنزلش تستلم من تحت — خليك في نص ملعب الخصم',lost:n=>'حافظ على الكورة: ماتضيّعهاش أكتر من '+n+' مرات',pc:n=>'مرر كتير: '+n+' تمريرة صحيحة',tk:n=>'ساعد في الدفاع: '+n+' افتكاك على الأقل',yc:()=>'أعصابك: ماتاخدش كارت',g:()=>'عايزك تسجل النهارده'};
function coachInst(c,f){if(f.inst)return f.inst;const pos=c.pos,att=pos==='ST'||pos==='LW'||pos==='RW',cam=pos==='CAM';
 const pool=att?[['sh',3],['deep',.35],['lost',7],['g',1],['yc',0]]:cam?[['pc',14],['sh',2],['lost',8],['tk',2],['deep',.4]]:[['pc',18],['tk',3],['lost',7],['yc',0]];
 const n=c.coach<40?2:Math.random()<.5?2:1;const out=[];const P=pool.slice();while(out.length<n&&P.length){const j=RI(0,P.length-1);out.push({k:P[j][0],n:P[j][1]});P.splice(j,1);}f.inst=out;return out;}
function instTxt(x){return INST[x.k](x.n);}
function instNeed(x,mins){const f=Math.max(.35,mins/90);return x.k==='sh'||x.k==='pc'||x.k==='tk'?Math.max(1,Math.round(x.n*f)):x.n;}
function instProg(x,s,mins){const need=instNeed(x,mins);if(x.k==='sh')return[s.sh||0,need,(s.sh||0)>=need];if(x.k==='pc')return[s.pc||0,need,(s.pc||0)>=need];if(x.k==='tk')return[s.tk||0,need,(s.tk||0)>=need];
 if(x.k==='lost')return[s.lost||0,need,(s.lost||0)<=need];if(x.k==='yc')return[s.yc||0,0,!(s.yc||s.rc)];if(x.k==='g')return[s.g||0,1,(s.g||0)>=1];if(x.k==='deep'){const v=s.ownPct==null?0:s.ownPct;return[Math.round(v*100),Math.round(need*100),v<=need];}return[0,0,true];}
function instLive(m){const el=$('instr');if(!el)return;const P=App.subPlan,f=App.c&&App.c.sched[App.c.si];const st=m&&m.t[0].star;if(!f||!f.inst||!st||!m.t[0].pl.includes(st)||App.quick){el.classList.remove('on');return;}
 const s=Object.assign({},st.stats,{ownPct:st.tT>10?(st.ownT||0)/st.tT:0});const mins=P&&P.inMin?90-P.inMin:90;
 el.innerHTML='المدرب: '+f.inst.map(x=>{const p=instProg(x,s,mins);const lab={sh:'تسديدات',pc:'تمريرات',tk:'افتكاك',lost:'كورة ضايعة',yc:'كروت',g:'أهداف',deep:'وقتك ورا'}[x.k];return (p[2]?'<b>':'<i>')+(x.k==='deep'?'وقتك في نصنا '+p[0]+'% (الحد '+p[1]+'%)':lab+' '+p[0]+'/'+p[1])+(p[2]?'</b>':'</i>');}).join(' · ');el.classList.add('on');}
/* ---------- خطط اللعب قبل الماتش ---------- */
function oppTac(R0,myR,seed){const d=R0-myR;const r=((seed*9301+49297)%233280)/233280;return d>=6?(r<.5?'press':'poss'):d>=2?(r<.5?'wings':'press'):d<=-6?'counter':d<=-2?(r<.6?'counter':'bal'):(r<.5?'bal':'wings');}
function myTac(c){if(!c.club.tac){const k=Object.keys(TACTICS);c.club.tac=k[Math.abs((c.club.name||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0))%k.length];}return c.club.tac;}
function tacBlock(c,info,f){const me=myTac(c),op=f.oppTac||(f.oppTac=oppTac(info.opp.R,myTeamDef(c,info).R,c.si+c.season*31));const T=TACTICS;
 const btns=`<div class="sub">الخطة دي قرار المدرب</div>`;
 return`<div class="tacbox" id="preTac"><div><h4>خطتنا: ${esc(T[me].n)}</h4><div class="sub">${esc(T[me].d)}</div>${btns}</div><div><h4>خطة المنافس: ${esc(T[op].n)}</h4><div class="sub">${esc(T[op].d)}</div></div></div>`;}
function pickTxt(p){return p.st==='start'?'أساسي في التشكيلة':p.st==='bench'?'احتياطي — هتنزل غالباً حوالي الدقيقة '+p.min:'مش في القايمة — '+(p.why||'');}
function coachSetup(m,pk){App.subPlan={pk,done:false};if(pk.st!=='bench'||!m)return;const t=m.t[0],st=t.star;if(!st)return;const idx=t.pl.indexOf(st);const rep=t.bench.find(b=>b.role===st.role)||t.bench[0];Object.assign(rep,{i:st.i,role:st.role,bx:st.bx,by:st.by,x:st.x,y:st.y,vx:0,vy:0,team:t,noSub:true});t.pl[idx]=rep;t.bench=t.bench.filter(x=>x!==rep);m.all=[...m.t[0].pl,...m.t[1].pl];if(m.ball.owner===st)m.ball.owner=rep;
 const hh=m.human;if(hh&&hh.ctrl===st)hh.ctrl=rep;m.human=null;m.skip();let g=0;while(m.minute()<pk.min&&m.phase!=='end'&&g++<400000){if(m.phase==='replay')m.endReplay();if(m.phase!=='play')m.pt=Math.min(m.pt,.01);m.update(1/30);}
 m.human=hh;m.rec=[];let ok=m.sub(t,rep,st);if(!ok){const alt=t.pl.filter(q=>q.role===st.role&&q.role!=='GK')[0]||t.pl.filter(q=>q.role!=='GK')[0];st.subbed=false;ok=m.sub(t,alt,st);}if(hh){hh.ctrl=st;}App.subPlan.inMin=m.minute();m.banner={t:'نزلت الملعب!',s:'الدقيقة '+m.minute()+' — النتيجة '+m.score[0]+'-'+m.score[1],life:2.6};}
function commTick(m,dt){if(m.phase!=='play'||!App.settings.voice)return;m.cT=(m.cT||0)+dt;if(m.cT<R(9,13))return;m.cT=0;if(Voice.cur)return;const b=m.ball,t=m.t[0];const ax=t.dir===1?b.x:L-b.x;const mn=m.minute();if(mn>=84&&m.score[0]<=m.score[1]&&!m.prs){m.prs=1;Comm.say('pressure',{},1);return;}if(Math.random()<.55)Comm.say(ax>70?'build_att':ax<35?'build_def':'build_mid');}
function coachTick(m){const P=App.subPlan;if(!P||P.done||!m||m.phase!=='play')return;const t=m.t[0],st=t.star;if(!st||st.off||!t.pl.includes(st))return;
 if(!P.perf&&!App.quick&&m.minute()>=(P.pchk||(P.pchk=RI(60,72)))){P.perf=1;const lr=m.liveR(st);const c=App.c;if(t.bench.length&&t.subs<5&&(lr<5.6&&c.coach<62||st.stam<28)){P.done=true;const inp=t.bench.find(b=>b.role===st.role)||t.bench[0];P.outAt=m.minute();m.sub(t,st,inp);m.banner={t:'المدرب طلّعك',s:st.stam<28?'خلصت طاقتك':'أداءك لحد دلوقتي مش مقنع (تقييم '+Math.max(4,lr).toFixed(1)+')',life:2.6};if(m.human&&m.human.lock){m.human=null;m.ff=true;}return;}}if(P.pk.st==='start'&&P.pk.weak&&m.minute()>=(P.chk||(P.chk=RI(64,78)))){P.done=true;const res=Math.sign(m.score[0]-m.score[1]);if(rate(st.stats,res)<6.5&&t.subs<5&&t.bench.length){const inp=t.bench.find(b=>b.role===st.role)||t.bench[0];P.outAt=m.minute();m.sub(t,st,inp);m.banner={t:'المدرب طلّعك',s:'تقييمك لحد دلوقتي ضعيف',life:2.4};if(m.human&&m.human.lock){m.human=null;m.ff=true;}}}}
/* ---------- prematch ---------- */
function openPre(){const c=App.c,f=c.sched[c.si];if(!f)return seasonEnd();
 if(f.press&&!f.pressDone&&c.inj<=0&&!c.susp){f.pressDone=true;store();openPress('pre',openPre);return;}
 const info=fixInfo(c,f);const me=myTeamDef(c,info);const pk=coachPick(c,f,info);
 $('preT').textContent=info.comp+' · '+info.label;$('preS').textContent=info.big?'ماتش كبير — كل العيون عليك':'لابس رقم '+c.num+' · '+POS[c.pos].n;
 $('preVs').innerHTML=`<div>${crestHTML(me)}<div class="tname">${esc(me.name)}</div><div class="sub" style="text-align:center">تقييم ${me.R}</div></div><div class="vsx">VS</div><div>${crestHTML(info.opp)}<div class="tname">${esc(info.opp.name)}</div><div class="sub" style="text-align:center">تقييم ${info.opp.R}</div></div>`;
 c.wx=c.wx&&c.wx.si===c.si?c.wx:{si:c.si,rain:Math.random()<.2};
 $('preInfo').innerHTML=`<span class="pill">معنويات ${c.morale}%</span><span class="pill">طاقة ${c.energy}%</span><span class="pill">ثقة المدرب ${c.coach}%</span><span class="pill">${c.wx.rain?'مطر — الكورة أسرع والأرض بتزحلق':'جو صافي'}</span><span class="pill ${pk.st==='start'?'':'warn'}">المدرب: ${esc(pickTxt(pk))}</span>${c.inj>0?'<span class="pill warn">مصاب — هتتفرج من المدرجات</span>':c.susp>0?'<span class="pill warn">موقوف — هتتفرج من المدرجات</span>':''}${c.energy<40?'<span class="pill warn">طاقتك قليلة</span>':''}`;
 {const oc=$('preCtl');if(oc)oc.remove();const L=+App.settings.lock?1:0;$('preInfo').insertAdjacentHTML('afterend',`<div class="ctlpick" id="preCtl"><span class="lbl">هتتحكم في:</span><button class="btn sm ${L?'ghost':'gold'}" data-ctl="0">الفريق كله</button><button class="btn sm ${L?'gold':'ghost'}" data-ctl="1">لاعبي بس</button></div>`);
  $('preCtl').querySelectorAll('[data-ctl]').forEach(b=>b.onclick=()=>{App.settings.lock=+b.dataset.ctl?1:0;store();openPre();});}
 {const ot=$('preRow');if(ot)ot.remove();$('preCtl').insertAdjacentHTML('afterend','<div class="prerow" id="preRow">'+tacBlock(c,info,f)+'</div>');}
 {const old=$('preInst');if(old)old.remove();if(!(c.inj>0||c.susp>0||pk.st==='out')){const I=coachInst(c,f);$('preRow').insertAdjacentHTML('beforeend',`<div class="instbox" id="preInst"><h4>تعليمات المدرب ليك في الماتش ده</h4>${I.map(x=>`<div>• ${esc(instTxt(x))}</div>`).join('')}<div class="sub">لو ماسمعتش الكلام، ممكن تقعد على الدكة الماتش الجاي.</div></div>`);}}
 const outP=c.inj>0||c.susp>0||pk.st==='out';$('preGo').classList.toggle('hidden',outP);$('preGo').textContent=pk.st==='bench'?'العب (من الدكة)':'العب الماتش';$('preSim').textContent=outP?'تابع النتيجة':(Ads.ready?'🎬 تخطّى الماتش (إعلان · مش هتلعب)':'تخطّى الماتش (مش هتلعب)');
 $('preBack').onclick=()=>show('hub');$('preGo').onclick=()=>startFix(false);$('preSim').onclick=async()=>{const out=$('preGo').classList.contains('hidden');if(out||!Ads.ready)return startFix(true);const b=$('preSim');b.disabled=true;const t0=b.textContent;b.textContent='بيحمّل الإعلان…';const r=await Ads.reward();b.disabled=false;b.textContent=t0;if(r==='cancel'){toast('لازم تكمّل الإعلان للآخر عشان تتخطى الماتش');return;}if(r==='na')toast('مفيش إعلان متاح دلوقتي، اتخطّى المرة دي ببلاش');startFix(true);};App.quick=false;show('pre');}
function startFix(sim){const c=App.c,f=c.sched[c.si],info=fixInfo(c,f);const home=Object.assign(myTeamDef(c,info),{tac:myTac(c)});const away=Object.assign({},info.opp,{tac:f.oppTac||oppTac(info.opp.R,home.R,c.si),sqBoost:App.settings.diff,sq:info.nat?null:getSquad(c,Object.assign({cc:curTier(c).country},info.opp)),R:sim?info.opp.R:oppMatchR(c,info.opp.R),nm:info.opp.nm||(info.opp.cc?CBY[info.opp.cc].nm:CBY[curTier(c).country].nm)});
 const pk=coachPick(c,f,info);const absent=c.inj>0||c.susp>0||pk.st==='out';if(sim||absent)return simFix(info,home,away,true,pk,!absent);
 beginMatch(new Match({home,away,human:{lock:!!App.settings.lock},halfLen:App.settings.halfLen,intro:!!App.settings.intro,comp:info.comp+' · '+info.label,weather:c.wx&&c.wx.rain?'rain':'clear',onEvent:matchEvent,onEnd:r=>{const P=App.subPlan;if(r.star)r.star.min=P&&P.inMin?90-P.inMin:P&&P.outAt?P.outAt:90;App.subPlan=null;finishFix(r,false);}}),info,home,away);coachSetup(App.match,pk);}
// قوة الخصم في الماتش: مستوى الخصم الحقيقي، بس عمره ما يبقى أضعف بكتير من لاعبك (عشان البداية ماتبقاش سهلة) + الصعوبة
function oppMatchR(c,R0){const o=ovr(c),d=+App.settings.diff||0;const adj=d<0?-5:d>0?7:2;return Math.round(Math.max(R0,(R0+o-3)/2)+adj);}
function simFix(info,home,away,absent,pk,skipped){const c=App.c;App._skipped=!!skipped;const s=simScore(home.R+(absent?-2:(ovr(c)-home.R)*.12),away.R);
 const st=newStats();const mins=absent?0:pk&&pk.st==='bench'?90-pk.min:pk&&pk.weak&&Math.random()<.4?RI(62,80):90;const fr=mins/90;st.min=mins;if(!absent){st.p=Math.round(RI(10,28)*fr);const share=(c.pos==='ST'?.38:c.pos==='RW'||c.pos==='LW'?.27:c.pos==='CAM'?.2:.1)*fr;for(let i=0;i<s[0];i++){const r=Math.random();if(r<share*(ovr(c)/home.R))st.g++;else if(r<share*2.1)st.a++;}st.sh=st.g+RI(0,3);st.sot=st.g+RI(0,1);st.pc=Math.round(st.p*R(.7,.9));st.pf=st.p-st.pc;st.tk=RI(0,2);st.lost=RI(1,5);if(Math.random()<.1)st.yc=1;}
 const ev=[];for(let i=0;i<s[0];i++)ev.push({type:'goal',team:0,min:RI(1,90),name:i<st.g?c.name:simScorer(home,true),star:i<st.g});for(let i=0;i<s[1];i++)ev.push({type:'goal',team:1,min:RI(1,90),name:simScorer(away,false)});ev.sort((a,b)=>a.min-b.min);
 finishFix({score:s,events:ev,star:absent?null:Object.assign(st,{stam:60}),inj:false,poss:50,shots:[RI(5,14),RI(5,14)]},true,absent);App._skipped=false;}
// هداف من تشكيلة النادي الحقيقية (المهاجمين أكتر)
function simScorer(club,mine){try{const c=App.c;let S=null;if(club&&!(club.name||'').startsWith('منتخب'))S=squadDef(c,club);if(S&&S.length){const W={FW:5,MF:2.4,DF:.7,GK:0};const pool=S.filter(p=>!(mine&&p.n===c.name));let tot=0;for(const p of pool)tot+=(W[p.r]||1)*(p.ov||60);let x=Math.random()*tot;for(const p of pool){x-=(W[p.r]||1)*(p.ov||60);if(x<=0)return p.n;}return pool[0].n;}}catch(e){}return mine?'زميلك':(club&&club.short?'لاعب '+club.short:'المنافس');}
// أسماء الهدافين تحت كل فريق (وكروت الطرد)
function scorersHTML(evs){const col=t=>{const L=(evs||[]).filter(e=>e.team===t&&(e.type==='goal'||e.card==='red'||e.type==='red')).sort((a,b)=>a.min-b.min).map(e=>e.type==='goal'?`<div class="sc"><b>${e.min}'</b> ⚽ ${esc(e.name||'')}${e.pen?' <i>(جزاء)</i>':''}</div>`:`<div class="sc red"><b>${e.min}'</b> 🟥 ${esc(e.name||'')}</div>`);return L.join('');};
 const a=col(0),b=col(1);if(!a&&!b)return'<div class="sub" style="text-align:center">مافيش أهداف</div>';return`<div class="scorers"><div>${a}</div><div>${b}</div></div>`;}
function koWinner(ga,gb,Ra,Rb){if(ga!==gb)return ga>gb;return Math.random()<.5+(Ra-Rb)/60;}
function finishFix(r,simmed,absent){const c=App.c,f=c.sched[c.si],info=fixInfo(c,f);App.match=null;Comm.stop();Stadium.stop();SFX.crowd(.03,.5);SFX.rain(false);
 const s=r.star;const res=Math.sign(r.score[0]-r.score[1]);let rt=null;if(s){rt=rate(s,res);if(simmed)rt=clamp(Math.round((rt-.25+R(-.3,.3))*10)/10,4,9.4);const mn=s.min===undefined?90:s.min;if(mn<45)rt=clamp(Math.round((6.3+(rt-6.3)*.75)*10)/10,4,9.5);c.form=(c.form||[]).concat([rt]).slice(-4);c.ss.min=(c.ss.min||0)+mn;}
 const news=[];let pressKind=null;let koWon=null;if(App._skipped)news.push('اتخطّيت الماتش ده — ما لعبتش ومفيش أي أرقام ليك فيه');if(f.pick){if(f.pick.st==='bench'&&s)news.push('نزلت بديل في الدقيقة '+(90-(s.min||0)));else if(f.pick.st==='out'&&!c.inj&&!c.susp){news.push('ماكنتش في القايمة: '+(f.pick.why||''));c.coach=clamp(c.coach+2,0,100);}else if(s&&s.min<90&&f.pick.st==='start')news.push('المدرب طلّعك في الدقيقة '+s.min);}
 if(f.t==='L'){const lg=c.league;wInit(c);applyResult(lg,0,info.oi,r.score[0],r.score[1]);creditTeam(c,0,r.score[0],s?s.g:0);creditTeam(c,info.oi,r.score[1]);lg.res=[[0,info.oi,r.score[0],r.score[1]]];for(const p of lg.rounds[f.md]){if(p[0]===0||p[1]===0)continue;const sc=simScore(lg.teams[p[0]].R,lg.teams[p[1]].R);applyResult(lg,p[0],p[1],sc[0],sc[1]);creditTeam(c,p[0],sc[0]);creditTeam(c,p[1],sc[1]);lg.res.push([p[0],p[1],sc[0],sc[1]]);}lg.md++;
  const W=c.world;W.streak=res>0?Math.max(1,(W.streak||0)+1):res<0?Math.min(-1,(W.streak||0)-1):0;if(W.streak===3||W.streak===5)addNews(c,'me',c.club.name+' يحقق '+W.streak+' انتصارات متتالية');if(W.streak===-3)addNews(c,'me','أزمة في '+c.club.name+' بعد 3 هزايم ورا بعض… والضغط على اللاعيبة');leagueNews(c);}
 koWon=compAfter(c,f,info,r.score,news,s);
 f.res={opp:info.opp.name,sc:r.score[0]+'-'+r.score[1],label:info.label,rt:rt};
 // player
 const sp=0;
 const win=res>0;const bonus=Math.round(c.contract.wage*(win?.25:0)+(s?s.g*c.contract.wage*.15:0));const earn=c.contract.wage+c.sponsor+bonus;c.money+=earn;
 const folG=rt?Math.round((Math.max(0,rt-6)*35+(s.g*90)+(win?40:0))*(1+c.path.tier*.7)*(f.t!=='L'?1.6:1)+c.followers*.004*Math.max(0,rt-6.5)):Math.round(c.followers*.002);c.followers+=folG;
 c.morale=clamp(c.morale+(win?4:res<0?-5:0)+(rt?Math.round((rt-6.6)*3):-2)+(c.owned.length>2?1:0),5,100);c.fans=clamp(c.fans+(rt?Math.round((rt-6.6)*2):0)+(win?1:res<0?-1:0),0,100);c.coach=clamp(c.coach+(rt?Math.round((rt-6.5)*3):0),0,100);
 // الطاقة: الماتش بيصرف طاقة على قد الدقايق والمجهود، والراحة بين الماتشات بترجّع جزء
 {const mn=s?(s.min===undefined?90:s.min):0,endSt=s&&s.stam!=null?s.stam:100;const drain=s?Math.round(mn/90*22+(100-endSt)*.14):0;const rec=(c.owned.includes('villa')?24:16)+(s?0:12);
  c.enBefore=c.energy;c.energy=clamp(Math.round(c.energy-drain+rec),0,100);c.enDrain=drain;c.enAd=false;c.adN=(c.adN||0)+1;
  if(s&&!r.inj&&c.enBefore<40&&Math.random()<(c.enBefore<20?.14:.06)){r.inj=true;r.fatigue=true;}}
 if(absent&&c.susp>0)c.susp--;else if(c.inj>0){c.inj--;if(c.inj===0)mail(c,'medical','الجهاز الطبي','رجعت جاهز!','الأشعة الأخيرة سليمة. تقدر ترجع للتمرين والماتشات.');}
 if(r.inj){c.inj=RI(1,4);mail(c,'medical','الجهاز الطبي','إصابة',(r.fatigue?'لعبت وإنت مرهق وطاقتك قليلة، والعضلة ما استحملتش. ':'')+'عندك شد في العضلة الخلفية. هتغيب '+c.inj+' ماتش تقريباً. ركّز في العلاج.');news.push('إصابة — غايب '+c.inj+' ماتش');addNews(c,'me',c.name+' يتعرض لإصابة ويغيب '+c.inj+' ماتش');c.morale=clamp(c.morale-6,0,100);}
 if(s&&f.t!=='N'){wInit(c);const g0=c.tot.g;c.ss.apps++;c.ss.g+=s.g;c.ss.a+=s.a;c.ss.rs+=rt;c.ss.yc+=s.yc;c.tot.apps++;c.tot.g+=s.g;c.tot.a+=s.a;
  c.ss.sh+=s.sh||0;c.ss.sot+=s.sot||0;c.ss.p+=s.p||0;c.ss.pc+=s.pc||0;c.ss.tk+=s.tk||0;c.ss.rc+=s.rc||0;c.tot.yc+=s.yc||0;c.tot.rc+=s.rc||0;
  if(rt>=8){c.ss.motm++;c.tot.motm++;news.push('أحسن لاعب في الماتش!');addNews(c,'me',lastName(c.name)+' نجم ماتش '+c.club.short+' ضد '+info.opp.name+' بتقييم '+rt.toFixed(1),rt>=9);}
  else if(rt<=5.4)addNews(c,'me','انتقادات لـ'+c.name+' بعد أداء باهت ضد '+info.opp.name+' (تقييم '+rt.toFixed(1)+')');
  for(const ms of [1,10,25,50,100,150,200,300,400])if(g0<ms&&c.tot.g>=ms)addNews(c,'me',ms===1?c.name+' يسجل أول أهدافه كمحترف!':c.name+' يوصل للهدف رقم '+ms+' في مسيرته',ms>=50);}
 if(s&&!simmed&&f.inst&&(s.min===undefined?90:s.min)>=25){const mins=s.min===undefined?90:s.min;let ok=0,bad=[];for(const x of f.inst){const p=instProg(x,s,mins);if(p[2])ok++;else bad.push(instTxt(x));}
  c.coach=clamp(c.coach+ok*3-bad.length*6,0,100);if(!bad.length){news.push('نفّذت تعليمات المدرب بالظبط — ثقته فيك زادت');}
  else{news.push('ماسمعتش كلام المدرب: '+bad.join('، '));c.morale=clamp(c.morale-2,0,100);if(!(c.punish>0)&&Math.random()<(bad.length>1?.6:.3)+(c.coach<45?.2:0)&&!info.nat){c.punish=1;mail(c,'coach','المدرب','ماسمعتش الكلام','قلتلك قبل الماتش: '+bad.join('، ')+'. ومعملتش كده. هتبدأ على الدكة الماتش الجاي، يمكن تفهم إن التعليمات مش اختيارية.');addNews(c,'me','المدرب يستبعد '+c.name+' من التشكيلة الأساسية بعد عدم التزامه بالتعليمات');news.push('المدرب قرر يقعدك دكة الماتش الجاي');}}}
 if(s&&s.rc){const fine=Math.round(c.contract.wage*.6);c.money-=fine;c.inj=Math.max(c.inj,0);mail(c,'club','إدارة النادي','غرامة الطرد','الطرد ده كلّف الفريق كتير. اتخصم منك '+money(fine)+'. وهتغيب الماتش الجاي.');c.susp=1;c.coach=clamp(c.coach-8,0,100);news.push('كارت أحمر — غرامة '+money(fine));addNews(c,'me','طرد '+c.name+' في ماتش '+info.opp.name+'… وغرامة من النادي');}
 if(s&&s.g>=3){news.push('هاتريك!!');addNews(c,'me','هاتريك لـ'+c.name+'! '+s.g+' أهداف في شباك '+info.opp.name,true);c.followers+=Math.round(1500*(1+c.path.tier));mail(c,'media','الصحافة','الكل بيتكلم عن الهاتريك','صورتك على الصفحة الأولى في كل الجرايد النهارده.');}
 // social reactions
 if(rt){const k=rt>=8?'great':rt>=6.7?'good':'bad';for(let i=0;i<2;i++)feedPost(c,pick(FAN_NAMES),pick(POSTS[k]).split('{p}').join(lastName(c.name)));if(s.g)feedPost(c,pick(FAN_NAMES),pick(POSTS.goal).split('{p}').join(lastName(c.name)));}
 feedPost(c,'@'+shortOf(c.club.name).replace(/\s/g,'')+'_fans',pick(win?POSTS.win:res<0?POSTS.loss:['تعادل… كان ممكن أحسن','نقطة من بره مش وحشة']));
 // national call-up
 const avg=c.ss.apps?c.ss.rs/c.ss.apps:0;
 if(!c.coachMode&&!c.intl.called&&ovr(c)>=natReq(c)&&avg>=6.8&&c.ss.apps>=4){c.intl.called=true;news.push('استدعاء لمنتخب '+CBY[c.nat].n+'!');addNews(c,'me','رسمياً: '+c.name+' في قايمة منتخب '+CBY[c.nat].n,true);mail(c,'national','اتحاد الكورة','استدعاء رسمي للمنتخب!','مدرب منتخب '+CBY[c.nat].n+' اختارك في القايمة. ده شرف كبير، ورّينا مستواك.');c.morale=clamp(c.morale+8,0,100);c.followers+=2000;
  for(const md of [5,11]){const idx=c.sched.findIndex((x,i)=>i>c.si&&x.t==='L'&&x.md===md);if(idx>0)c.sched.splice(idx+1,0,{t:'N',press:true});}}
 // sponsors
 const lv=[3000,25000,200000,2000000,15000000];if(c.spLevel<lv.length&&c.followers>=lv[c.spLevel]){const v=Math.round([300,1500,9000,40000,150000][c.spLevel]);mail(c,'sponsor',pick(['ماركة رياضية','شركة مشروبات','شركة اتصالات','ماركة ساعات']),'عرض رعاية','عندنا عرض رعاية ليك بـ '+money(v)+' كل أسبوع لمدة طويلة.',{k:'sponsor',v});c.spLevel++;news.push('عرض رعاية جديد في الرسايل');}
 // mid-season interest
 if(f.winter){const offs=windowOffers(c,c.path.tier,avg,true);if(offs.length){const of=offs[0];mail(c,'agent','وكيلك — كابتن سامح','الميركاتو الشتوي: عرض من '+of.club.name,of.club.name+' ('+of.tierName+') عايزك دلوقتي. دورك هناك: '+of.role+'. المرتب '+money(of.wage)+' في الأسبوع'+(of.fee?' ومستعدين يدفعوا '+money(of.fee)+' لناديك':'')+'. تحب نفتح التفاوض؟',{k:'offer',offer:of});addNews(c,'transfer','عاجل: '+of.club.name+' يقدّم عرض رسمي لضم '+c.name,true);news.push('عرض انتقال في الرسايل!');}}
 // كشافين بمهمة: حقق المطلوب في عدد ماتشات معيّن → عرض رسمي من النادي
 if(c.scout&&s&&f.t!=='N'){const S=c.scout;S.left--;S.g+=s.g||0;S.a+=s.a||0;S.rs+=rt||0;S.n++;const done=S.kind==='g'?S.g>=S.need:S.kind==='ga'?S.g+S.a>=S.need:S.n>=S.games&&S.rs/S.n>=S.need;
  if(done){const of=makeOfferW(c,S.tier,'الكشافين اقتنعوا');mail(c,'agent','وكيلك — كابتن سامح','الكشافين اقتنعوا! عرض من '+of.club.name,'نفّذت مهمة كشافين '+of.club.name+'. بعتوا عرض رسمي: '+money(of.wage)+' في الأسبوع'+(of.fee?' و'+money(of.fee)+' لناديك':'')+'. تحب نفتح التفاوض؟',{k:'offer',offer:of});addNews(c,'transfer','عاجل: '+of.club.name+' يقدّم عرض رسمي لضم '+c.name+' بعد تقارير الكشافين',true);news.push('الكشافين اقتنعوا — عرض انتقال في الرسايل!');c.scout=null;}
  else if(S.left<=0){addNews(c,'transfer','كشافين '+S.club+' رجعوا من غير ما يقتنعوا بـ'+c.name);news.push('مهمة الكشافين فشلت');c.scout=null;}}
 if(!c.scout&&f.t==='L'&&(f.md===Math.round(c.league.rounds.length*.25)||f.md===Math.round(c.league.rounds.length*.6))&&avg>=6.6&&c.ss.apps>=3&&c.path.tier<7){const tier=Math.min(7,c.path.tier+1);const{ti,cl}=clubFor(c,tier);const fw=['ST','RW','LW','CF'].includes(c.pos),mf=['AM','CM','DM'].includes(c.pos);const k=fw?'g':mf?'ga':'r';const games=5;const need=k==='g'?RI(3,4):k==='ga'?RI(3,5):+(7.1+Math.random()*.3).toFixed(1);
  c.scout={club:cl.name,tier,kind:k,need,games,left:games,g:0,a:0,rs:0,n:0};const task=k==='g'?'تسجّل '+need+' أهداف':k==='ga'?'توصل لـ'+need+' أهداف+أسيست':'متوسط تقييمك يبقى '+need+' أو أكتر';
  mail(c,'agent','وكيلك — كابتن سامح','كشافين من '+cl.name+' بيتابعوك','كشافين '+cl.name+' ('+ti.short+') هيتابعوك في الـ'+games+' ماتشات الجاية. المطلوب: '+task+'. لو عملتها، هيبعتوا عرض رسمي.');addNews(c,'transfer','كشافين من '+cl.name+' في المدرجات لمتابعة '+c.name);news.push('مهمة كشافين: '+task+' في '+games+' ماتشات');}
 // coach warning
 if(c.coach<25&&Math.random()<.5)mail(c,'coach','المدرب','لازم نتكلم','مستواك نازل وكلامك برّه مش عاجبني. لو فضلت كده هتقعد على الدكة.');
 if(rt&&!App._skipped){pressKind=win?'win':res<0?'loss':'draw';const st0=f.pick?f.pick.st:'start',mn=s.min===undefined?90:s.min;
  App.pressCtx={rt:rt.toFixed(1),g:s.g,a:s.a,sc:r.score[0]+'-'+r.score[1],ga:r.score[1],opp:info.opp.name,started:st0==='start',subIn:st0==='bench'&&mn<90,inMin:90-mn,subOut:st0==='start'&&mn<88,outMin:mn,prevBench:c.lastPickSt&&c.lastPickSt!=='start',offers:(c.inbox||[]).some(x=>x.action&&x.action.k==='offer'&&!x.read),motm:false};App.pressCtx.rt=+App.pressCtx.rt;}
 c.lastPickSt=f.pick?f.pick.st:'start';
 c.si++;skipInvalid(c);store();
 // post screen
 const hn=info.nat?{name:'منتخب '+CBY[c.nat].n,short:CBY[c.nat].n.slice(0,5),kitArr:natKit(c.nat)}:c.club;
 $('poS').textContent=info.comp+' · '+info.label+(App._skipped?' · ما لعبتش':simmed?' · محاكاة':'');
 $('poScore').innerHTML=`<div class="row" style="gap:18px">${crestHTML(hn)}<div class="big-score bs2"><span>${r.score[0]}</span><span>-</span><span>${r.score[1]}</span></div>${crestHTML(info.opp)}</div><div class="ttl" style="font-size:22px">${res>0?'فوز':res<0?'خسارة':'تعادل'}${koWon!==null?(koWon?' — اتأهلنا':' — خرجنا'):''}</div>${!simmed?`<div class="sub">استحواذ ${r.poss}% · تسديدات ${r.shots[0]}-${r.shots[1]}</div>`:''}${scorersHTML(r.events)}`;
 $('poStats').innerHTML=(s?`<div class="row" style="justify-content:space-between"><div><div class="sub">تقييمك</div><div class="rating" id="poRt">0.0</div></div><div style="text-align:left"><div class="sub">المكسب</div><div style="font-weight:800;font-size:16px">+${money(earn)}<br>+${num(folG)} متابع</div></div></div><div class="xp"><i id="poXp"></i></div><div class="statg"><div><b>${s.g}</b><span>أهداف</span></div><div><b>${s.a}</b><span>أسيست</span></div><div><b>${s.sot}/${s.sh}</b><span>على المرمى</span></div><div><b>${s.pc}/${s.p}</b><span>تمريرات صحيحة</span></div><div><b>${s.tk}</b><span>افتكاك</span></div><div><b>${s.stam!==undefined?s.stam+'%':'—'}</b><span>اللياقة في الآخر</span></div></div>`:`<div class="ttl" style="font-size:20px">${absent?'اتفرجت من المدرجات':'ماشاركتش'}</div><div class="sub">+${money(earn)} مرتب</div>`)+news.map(n=>`<div class="news">${esc(n)}</div>`).join('');
 if(rt){let v=0;const el=$('poRt');const iv=setInterval(()=>{v=Math.min(rt,v+rt/30);el.textContent=v.toFixed(1);if(v>=rt){clearInterval(iv);if(rt>=8){FX.confetti(120);flashDom();}}},30);setTimeout(()=>{const x=$('poXp');if(x)x.style.width=clamp((rt-4)/6*100,5,100)+'%';},100);}
 if(news.some(n=>n.includes('أبطال')||n.includes('استدعاء'))){setTimeout(()=>{FX.confetti(200);FX.fireworks(6);flashDom();},400);}
 $('poGo').onclick=()=>{const b=$('poGo');if(b.disabled)return;const next=()=>{if(c.si>=c.sched.length)seasonEnd();else show('hub');};const go=()=>{if(pressKind)openPress(pressKind,next);else next();};if(!Ads.due(c))return go();b.disabled=true;Ads.afterMatch(c).catch(()=>{}).then(()=>{b.disabled=false;go();});};
 enRow(c);
 const M=motmPick(c,r,info,hn,rt,res,s,simmed);if(App.pressCtx&&M&&M.me)App.pressCtx.motm=true;const seq=[];(App.troQ||[]).splice(0).forEach(t=>seq.push(d=>trophyFilm(t,d)));if(M&&+App.settings.films!==0)seq.push(d=>motmFilm(M,d));runSeq(seq,()=>show('post'));}
function runSeq(list,done){let i=0;const nx=()=>{if(i<list.length){const f=list[i++];try{f(nx);}catch(e){console.warn(e);nx();}}else done();};nx();}
// رجل الماتش: أعلى تقييم في الماتش (من اللاعيبة كلها لو الماتش اتلعب، ومن الهدافين لو محاكاة)
function motmPick(c,r,info,hn,rt,res,s,simmed){const tk=[kitOf(hn),kitOf(info.opp)],tn=[hn.name,info.opp.name];const match=tn[0]+' '+r.score[0]+'-'+r.score[1]+' '+tn[1];let best=null;
 if(r.pl&&r.pl.length){for(const p of r.pl){const tr=Math.sign((r.score[p.ti]-r.score[1-p.ti]));let v=p.me&&rt?rt:rate(p.st,tr);v+=p.ti===(res>=0?0:1)?.05:0;if(!best||v>best.v)best={v,p};}if(best){const p=best.p;return{me:!!p.me,name:p.me?c.name:p.n,num:p.num,rt:Math.min(10,best.v),g:p.st.g||0,a:p.st.a||0,team:tn[p.ti],k:tk[p.ti],match};}}
 const gl={};for(const e of r.events||[])if(e.type==='goal'&&e.name&&e.name!=='هدف عكسي'){const key=e.team+'|'+e.name;gl[key]=(gl[key]||0)+1;}let cand=null;for(const key in gl){const[ti,n]=key.split('|');const v=6.9+gl[key]*.75+(Math.sign(r.score[+ti]-r.score[1-ti])>0?.4:0);if(!cand||v>cand.v)cand={v,ti:+ti,n,g:gl[key]};}
 if(s&&rt&&(!cand||rt>=cand.v))return{me:true,name:c.name,num:c.num,rt,g:s.g,a:s.a,team:tn[0],k:tk[0],match};
 if(!cand){const ti=res<0?1:0;cand={v:R(7.1,7.8),ti,n:simScorer(ti?info.opp:c.club,true),g:0};}return{me:false,name:cand.n,num:RI(2,23),rt:Math.round(cand.v*10)/10,g:cand.g,a:0,team:tn[cand.ti],k:tk[cand.ti],match};}
// طاقة اللاعب بعد الماتش + إعلان بمكافأة يرجّعها
function enRow(c){const el=document.createElement('div');el.className='enrow';const col=c.energy<40?'var(--red)':c.energy<70?'var(--gold,#F5C542)':'var(--acc)';
 el.innerHTML=`<div><div class="sub">طاقتك</div><div class="enbar"><i style="width:${c.energy}%;background:${col}"></i></div><b>${c.energy}%</b>${c.enDrain?`<div class="sub">الماتش صرف ${c.enDrain}% من طاقتك</div>`:''}${c.energy<40?'<div class="sub" style="color:var(--red)">طاقتك قليلة: المدرب ممكن يقعدك، وخطر الإصابة أعلى</div>':''}</div>${c.energy<100&&!c.enAd?`<button class="btn sm gold" id="poAdEn">🎬 إعلان قصير ← +${ADS.energyGain}% طاقة</button>`:''}`;
 const ps=$('poStats');ps.insertBefore(el,ps.firstChild);const b=$('poAdEn');if(b)b.onclick=async()=>{b.disabled=true;b.textContent='بيحمّل الإعلان…';const r=await Ads.reward();
  if(r==='ok'){c.energy=Math.min(100,c.energy+ADS.energyGain);c.enAd=true;store();toast('طاقتك رجعت '+c.energy+'%');el.remove();enRow(c);}
  else if(r==='cancel'){toast('لازم تكمّل الإعلان للآخر عشان تاخد الطاقة');b.disabled=false;b.textContent=`🎬 إعلان قصير ← +${ADS.energyGain}% طاقة`;}
  else{toast('مفيش إعلان متاح دلوقتي، جرّب كمان شوية');b.disabled=false;b.textContent=`🎬 إعلان قصير ← +${ADS.energyGain}% طاقة`;}};}
function home_R(c,info){return info.nat?natR(c.nat):c.league.teams[0].R;}

/* ---------- offers / negotiation / signing ---------- */
function makeOffer(c,tier){const ti=tierInfo(c.path,tier);const used=new Set([c.club.name]);const cl=(!ti.domestic||tier>=3)?clubFor(c,tier).cl:genClubs(ti.country,1,ti.base,used,RI(0,15))[0];return{tier,abroad:ti.country,club:{name:cl.name,short:cl.short,kit:cl.kit,cc:ti.country},wage:Math.round(WAGE[tier]*R(.85,1.25)),years:RI(2,4),tierName:ti.name};}
function openNegotiation(of,done){const c=App.c;const B=$('seOff');$('seT').textContent='مفاوضات مع '+of.club.name;$('seS').textContent=of.tierName;
 if(of.fee===undefined){of.fee=0;of.ask=0;of.role=of.role||'—';}
 const blocked=of.fee>0&&of.fee<of.ask&&!of.clubOk;
 $('seSum').innerHTML=`<div class="row center">${crestHTML(of.club)}</div><div class="ttl" style="text-align:center;font-size:22px">${esc(of.club.name)}</div><div class="statg"><div><b>${money(of.wage)}</b><span>في الأسبوع</span></div><div><b>${of.years}</b><span>سنين</span></div><div><b>${esc(CBY[of.abroad].n)}</b><span>البلد</span></div><div><b>${esc(of.role)}</b><span>دورك</span></div><div><b>${of.fee?money(of.fee):'حر'}</b><span>رسوم الانتقال</span></div><div><b>${money(marketValue(c))}</b><span>قيمتك</span></div></div>`;
 if(blocked){B.innerHTML=`<div class="offer"><div class="grow"><b>إدارة ${esc(c.club.name)}:</b> <span class="sub">العرض أقل من قيمتك. مش هنبيعك بأقل من ${money(of.ask)}.</span></div></div><div class="col"><button class="btn" id="ngP">اضغط على الإدارة عشان توافق</button><button class="btn ghost" id="ngN">انسى العرض</button></div>`;
  $('ngP').onclick=()=>{const ch=clamp(.35+(c.morale-50)/200+(c.coach<40?.15:0)+(of.tier>c.path.tier?.1:0),.15,.75);if(Math.random()<ch){of.clubOk=true;c.coach=clamp(c.coach-6,0,100);toast('الإدارة وافقت تبيعك');addNews(c,'transfer','إدارة '+c.club.name+' توافق على رحيل '+c.name+' لـ'+of.club.name);openNegotiation(of,done);}else{c.morale=clamp(c.morale-6,0,100);c.coach=clamp(c.coach-10,0,100);toast('الإدارة رفضت… والمدرب مش مبسوط');addNews(c,'transfer','إدارة '+c.club.name+' ترفض عرض '+of.club.name+' لضم '+c.name);store();done?done():show('hub');}};
  $('ngN').onclick=()=>{toast('رفضت العرض');done?done():show('hub');};show('season');return;}
 B.innerHTML=`<div class="offer"><div class="grow"><b>وكيلك:</b> <span class="sub">${of.asked?'اتفاوضنا خلاص، ده آخر كلام عندهم.':'نقدر نطلب مرتب أعلى، بس ممكن يسحبوا العرض.'}</span></div></div><div class="col"><button class="btn" id="ngY">وقّع</button>${of.asked?'':'<button class="btn ghost" id="ngM">اطلب 25% زيادة</button>'}<button class="btn ghost" id="ngN">ارفض</button></div>`;
 $('ngY').onclick=()=>{signWith(of);showSign(of.club,'انتقال رسمي!',of.years+' سنين · '+money(of.wage)+' في الأسبوع',()=>openPress('transfer',()=>{done&&done();show('hub');}));};
 $('ngN').onclick=()=>{toast('رفضت العرض');done?done():show('hub');};
 const m=$('ngM');if(m)m.onclick=()=>{const avg=c.ss.apps?c.ss.rs/c.ss.apps:6.5;const ch=clamp(.4+(ovr(c)-TIER_REQ[of.tier])/20+(avg-6.8)/3,.12,.85);of.asked=true;if(Math.random()<ch){of.wage=Math.round(of.wage*1.25);toast('وافقوا على الزيادة!');openNegotiation(of,done);}else{toast('النادي سحب العرض!');addNews(c,'transfer',of.club.name+' يسحب عرضه بعد طلبات '+c.name+' المالية');done?done():show('hub');}};
 show('season');}
function signWith(of){const c=App.c;const fromMid=c.si<c.sched.length;wInit(c);addNews(c,'transfer','رسمياً: '+c.name+' ينتقل من '+c.club.name+' إلى '+of.club.name+(of.fee?' مقابل '+money(of.fee):' في صفقة انتقال حر'),true);c.club=of.club;c.contract={wage:of.wage,years:of.years};
 if(of.tier>c.path.tier){c.path.tier=of.tier;c.path.abroad[of.tier]=of.abroad;}
 c.coach=55;c.morale=clamp(c.morale+8,0,100);c.followers+=Math.round(c.followers*.1+1000);
 if(fromMid){// mid-season: new league from now
  const now=c.sched[c.si].d,oldN=c.ntc,ss=c.season;buildSeason(c);joinMidSeason(c,now,oldN);}
 mail(c,'club','إدارة '+of.club.name,'أهلاً بيك في عيلتك الجديدة','كلنا مستنيين نشوفك في الملعب. الجمهور هنا مابيرحمش، بس لو حبّك هيشيلك على راسه.');store();}
function jerseySVG(k,name,num){const fg=lum(k[0])>.6?'#111':'#fff';const ln=esc(lastName(name).replace(/^[^ ]+\. /,''));return`<svg class="jersey" viewBox="0 0 200 220"><path d="M60 10 L30 22 L4 60 L30 82 L44 70 L44 210 L156 210 L156 70 L170 82 L196 60 L170 22 L140 10 Q100 34 60 10Z" fill="${k[0]}" stroke="rgba(0,0,0,.35)" stroke-width="3"/><path d="M4 60 L30 82 L44 70 L36 40 Z M196 60 L170 82 L156 70 L164 40 Z" fill="${k[1]}" opacity=".9"/><path d="M60 10 Q100 34 140 10" fill="none" stroke="${k[1]}" stroke-width="6"/><text x="100" y="78" text-anchor="middle" font-size="22" font-weight="800" fill="${fg}" font-family="Changa,sans-serif">${ln}</text><text x="100" y="168" text-anchor="middle" font-size="88" font-weight="800" fill="${fg}" font-family="Changa,sans-serif">${num}</text></svg>`;}
function showSign(club,t,s,then){try{_showSign(club,t,s,then);}catch(e){console.warn('sign',e);then();}}
function _showSign(club,t,s,then){const c=App.c;const k=kitOf(club);const box=$('cer');const fresh=/أول عقد/.test(t),renew=/تجديد/.test(t);
 const fg=lum(k[0])>.6?'#111':'#fff',sh=esc(club.short||shortOf(club.name)),cn=esc(club.name),pn=esc(c.name),Y=seasonYear(c);
 const yrs=(c.contract&&c.contract.years)||2,parts=String(s).split(' · ');
 let ph=null;try{ph=localStorage.getItem('masiret-nagm-photo')||(c.useFace?localStorage.getItem('masiret-nagm-face'):null);}catch(e){}
 const crest=(cls)=>`<div class="fcrest ${cls||''}"><span>${sh}</span></div>`;
 const sigP='M14 40 C30 12,44 50,62 28 S92 8,100 34 S128 50,144 22 S174 14,182 36 S218 46,234 22 S262 30,286 18';
 const flashes=(n,d0)=>Array.from({length:n},(_,i)=>`<i style="left:${(i*37+11)%92}%;top:${(i*53+7)%70}%;animation-delay:${(d0+i*.33).toFixed(2)}s"></i>`).join('');
 const portrait=ph?`<div class="fpic" style="background-image:url('${ph}')"></div>`:`<div class="fpic nopic">${jerseySVG(k,c.name,'')}</div>`;
 box.innerHTML=`<div class="film" style="--c1:${k[0]};--c2:${k[1]};--fg:${fg}">
 <div class="sh s1"><div class="rays"></div><i class="stk a"></i><i class="stk b"></i><i class="stk c"></i>
  <div class="mid">${crest('xl')}<div class="t1">${renew?'تجديد رسمي':'رسمياً'}</div><div class="t2">${fresh?'بيان رسمي من إدارة '+cn:renew?cn+' تعلن تجديد عقد مدربها':'صفقة جديدة في '+cn+' — <bdi>Here we go!</bdi>'}</div></div></div>
 <div class="sh s2"><div class="cam"><div class="wood"></div><div class="doc"><div class="wm">${sh}</div>
  <div class="dh">${crest('sm')}<div><b>عقد مدرب</b><small>${cn} · الموسم ${Y}-${Y+1}</small></div></div>
  <div class="tr"><span>المدرب</span><b>${pn}</b></div><div class="tr"><span>المنصب</span><b>مدرب الفريق الأول</b></div><div class="tr"><span>الشروط</span><b>${esc(s)}</b></div><div class="tr"><span>الموسم</span><b>${Y}-${Y+1}</b></div>
  <div class="sigw"><svg width="300" height="56" viewBox="0 0 300 56"><path pathLength="1" d="${sigP}"/></svg><div class="pen" style="offset-path:path('${sigP}')"><svg viewBox="0 0 20 120" width="14" height="84"><rect x="5" y="0" width="10" height="92" rx="5" fill="#111"/><rect x="5" y="20" width="10" height="5" fill="#C9A227"/><path d="M5 92 L15 92 L10 118Z" fill="#C9A227"/></svg></div><span class="nm">توقيع المدرب</span></div>
  <div class="stamp2">${renew?'مُجدَّد':'رسمي'}</div></div></div>
  <div class="fls">${flashes(6,.4)}</div></div>
 <div class="sh s3"><div class="stripes"></div><div class="bignum">★</div><div class="jw">${jerseySVG(k,c.name,'')}<i class="gl"></i></div>
  <div class="side r"><small>الفريق</small><b>${sh}</b></div><div class="side l"><small>المنصب</small><b>المدرب</b></div></div>
 <div class="sh s4"><div class="lights"></div><div class="crowd2"></div><div class="beam a"></div><div class="beam b"></div>
  <div class="wrow">${portrait}<div class="wtx"><div class="w1">${renew?'مكمّل معانا!':'أهلاً بيك'}</div><div class="w2">${crest('sm')}<span>${cn}</span></div><div class="w3">${pn}</div>
  <div class="chips">${parts.map(x=>`<span>${esc(x)}</span>`).join('')}<span>لحد ${Y+yrs}</span></div></div></div>
  <button class="btn fgo">كمّل</button></div>
 <div class="lt"><div class="ltc">${crest('xs')}</div><div class="ltt"><b>${pn}</b><small>${renew?'يجدد مع ':fresh?'يوقّع أول عقد مع ':'ينضم إلى '}${cn} · ${esc(parts[0]||'')}</small></div></div>
 <div class="bug"><i></i>أنت المدرب TV</div><div class="lb t"></div><div class="lb b"></div><div class="vig"></div><div class="grain"></div><div class="whip"></div></div>`;
 const F=box.firstElementChild,S=[...F.querySelectorAll('.sh')],D=[3200,4900,3700,6500];let i=-1,tm=null,ti=[],done=false;
 const later=(f,ms)=>ti.push(setTimeout(f,ms));const clr=()=>{clearTimeout(tm);ti.forEach(clearTimeout);ti=[];};
 const snap=()=>{try{const C=SFX.ctx;if(!C||!SFX.on)return;const n=C.sampleRate*.06,bf=C.createBuffer(1,n,C.sampleRate),d=bf.getChannelData(0);for(let j=0;j<n;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/n,3);const sr=C.createBufferSource(),g=C.createGain();g.gain.value=.25;sr.buffer=bf;sr.connect(g);g.connect(C.destination);sr.start();}catch(e){}};
 const finish=()=>{if(done)return;done=true;clr();box.onclick=null;then();};
 const cue=n=>{if(n===0){SFX.whistle&&SFX.whistle(1);later(()=>flashDom(),350);}
  if(n===1){F.classList.add('lton');[500,900,1250,2900,3300,3700].forEach(ms=>later(snap,ms));later(()=>{flashDom();F.classList.add('shake');later(()=>F.classList.remove('shake'),400);},3350);}
  if(n===2){F.classList.remove('lton');later(()=>{SFX.roar&&SFX.roar();},500);}
  if(n===3){later(()=>{FX.confetti(240,[k[0],k[1],'#F5C542','#FFFFFF']);FX.fireworks(8);SFX.chant&&SFX.chant();},500);}};
 const go=n=>{clr();if(n>=S.length)return finish();F.classList.remove('wh');void F.offsetWidth;if(i>=0)F.classList.add('wh');
  later(()=>{S.forEach(x=>x.classList.remove('on'));void F.offsetWidth;S[n].classList.add('on');i=n;cue(n);tm=setTimeout(()=>go(n+1),D[n]);},i>=0?230:0);};
 box.onclick=e=>{if(e.target.closest('.fgo'))return finish();go(i+1);};$('cerSkip').onclick=e=>{e.stopPropagation();finish();};show('cer');go(0);}

/* ---------- season end ---------- */
function seasonEnd(){const c=App.c;wInit(c);
 if(c.seDone!==c.season||!c.seInfo){processSeason(c);c.seDone=c.season;store();}
 const I=c.seInfo,go=()=>seasonScreen(c);
 if(!I.shownLT&&I.pos===1){I.shownLT=1;store();return trophyFilm({comp:c.tierName,team:c.club.name,k:kitOf(c.club),me:c.ss.apps>0,num:c.num},seasonEnd);}
 if(!I.shownBF&&I.bTop&&I.bTop.length>=3){I.shownBF=1;store();return ballonFilm({year:seasonYear(c),top:I.bTop},seasonEnd);}
 if(!I.shownAw){I.shownAw=1;store();if(I.ballon)return ballonScreen(c,()=>awardsScreen(c,go));return awardsScreen(c,go);}
 go();}
function processSeason(c){seasonWrap(c);try{worldSeason(c);}catch(e){console.warn(e);}const lg=c.league,tb=sortTable(lg),pos=tb.findIndex(t=>t.me)+1;const avg=c.ss.apps?c.ss.rs/c.ss.apps:6;const o=ovr(c);const T=curTier(c);
 let objDone=0;(c.obj||[]).forEach(x=>{if(objProg(c,x)[1])objDone++;});if(objDone){c.coach=clamp(c.coach+objDone*4,0,100);c.money+=c.contract.wage*objDone;}
 const RR=c.league.rounds.length||30;let spG=c.ss.apps?Math.round(clamp((avg-6.2)*4.2+c.ss.apps/RR*3+objDone*.8+(c.age<=21?2.5:c.age<=25?1.5:0)+(c.path.tier||0)*.5,1,14)):1;
 let dev='';if(c.age<=23&&c.ss.apps>=RR*.3){const n=(c.age<=19?4:c.age<=21?3:2)+(c.ss.apps>=RR*.7?1:0);const keys=Object.keys(POS[c.pos].w).filter(k=>POS[c.pos].w[k]>0);const up=[];for(let i=0;i<n;i++){const k=pick(keys);if(c.attrs[k]<99){c.attrs[k]++;up.push(ATTRN[k]);}}if(up.length)dev='تطوّر طبيعي من الماتشات: '+up.join('، ')+' +1';}
 const won=[];if(pos===1){c.trophies.push({n:'بطولة '+c.tierName,s:c.season,k:'L'});won.push('أبطال الدوري!');addNews(c,'me',c.club.name+' بطل '+c.tierName+'!',true);}else addNews(c,'league',tb[0].name+' بطل '+c.tierName+' الموسم '+c.season);
 const la=lgAwards(c,tb);la.forEach(a=>{if(a.w.me){c.trophies.push({n:a.n+' — '+c.tierShort,s:c.season,k:'award'});won.push(a.n);addNews(c,'me',c.name+' يفوز بجائزة '+a.n+' ('+a.v+')',true);}else if(a.n!=='تشكيلة الموسم')addNews(c,'league',a.w.n+' ('+a.w.club+') يفوز بجائزة '+a.n+' — '+a.v);});
 const seasonTro=c.trophies.filter(t=>t.s===c.season&&t.k!=='award').length;let race=null,rank=0,ballon=false;
 if(c.path.tier>=4){race=ballonRace(c,seasonTro);rank=race.findIndex(x=>x.me)+1;ballon=rank===1&&c.path.tier>=5&&c.ss.apps>=10;
  if(ballon){c.won++;c.trophies.push({n:'الكرة الذهبية',s:c.season,k:'award'});addNews(c,'world','تاريخي! '+c.name+' يتوج بالكرة الذهبية كأفضل لاعب في العالم',true);}
  else{const w0=race.find(x=>!x.me);addNews(c,'world',w0.n+' يفوز بالكرة الذهبية'+(rank<=30?'، و'+c.name+' في المركز '+rank:''));}}
 const W0=c.world||{};const bTop=race?(ballon?race:race.filter(x=>!x.me)).slice(0,3).map(x=>({n:x.n,cc:x.cc,me:!!x.me,club:x.me?c.club.name:((W0.stars||[]).find(s=>s.n===x.n)||{}).club||''})):(W0.lastBallon||null);
 c.history.push({s:c.season,club:c.club.name,apps:c.ss.apps,g:c.ss.g,a:c.ss.a,avg,pos,motm:c.ss.motm||0,val:marketValue(c),tier:c.path.tier});
 const dom=T.domestic;let move=0,relA=false;const dnN=relegN(c,c.path.tier);if(dom&&c.path.tier<3&&pos<=relegN(c,c.path.tier+1))move=1;if(dom&&c.path.tier>0&&pos>tb.length-dnN)move=-1;if(!dom&&pos>tb.length-dnN){relA=true;addNews(c,'me','صدمة: '+c.club.name+' يهبط من '+c.tierName);}
 const mv=settleLeague(c,tb);if(mv.up.length)addNews(c,'league','صعود: '+mv.up.join(' و')+' للدرجة الأعلى');if(mv.down.length)addNews(c,'league','هبوط: '+mv.down.join(' و')+(dom?' للدرجة الأقل':' يودّعوا الدوري'));
 if(move>0)addNews(c,'me',c.club.name+' يصعد رسمياً إلى '+tierInfo(c.path,c.path.tier+1).short+'!',true);if(move<0)addNews(c,'me','صدمة: '+c.club.name+' يهبط إلى '+tierInfo(c.path,c.path.tier-1).short);
 c.contQ=(c.path.tier>=3||!dom)?(pos<=(BIG5.includes(T.country)?4:2)?1:pos<=(BIG5.includes(T.country)?6:3)?2:0):0;if(c.cup&&c.cup.won&&!c.contQ&&c.path.tier>=2)c.contQ=2;
 c.age++;let aging='';if(c.age>=31){const ks=shuffle(Object.keys(c.attrs)).slice(0,c.age>=34?3:2);ks.forEach(k=>c.attrs[k]=Math.max(30,c.attrs[k]-(c.age>=34?2:1)));aging='السن بدأ يأثر: '+ks.map(k=>ATTRN[k]).join('، ')+' قلّت';}
 c.contract.years--;ageStars(c);
 let stayTier=Math.max(0,c.path.tier+move);if(relA){if(c.path.tier>=5){stayTier=c.path.tier-1;c.path.abroad[stayTier]=T.country;}else stayTier=-1;}const renew=c.contract.years<=0;
 const offers=windowOffers(c,stayTier===-1?c.path.tier-1:stayTier,avg,false);if(relA)offers.forEach(f=>{f.fee=0;});if(move<0&&avg>=6.6&&c.age<35)offers.push(makeOfferW(c,c.path.tier,'تفضل في نفس المستوى'));if(stayTier===-1){const a=makeOfferW(c,4,'بعد الهبوط');a.fee=0;const b=makeOfferW(c,3,'رجوع للدوري المحلي');b.fee=0;offers.push(a,b);}if(renew)offers.forEach(f=>{f.fee=0;});
 offers.forEach(f=>addNews(c,'transfer',f.club.name+' ('+f.tierName+') يقدّم عرض لضم '+c.name+(f.fee?' مقابل '+money(f.fee):' في صفقة انتقال حر')));
 if(!offers.length&&renew)addNews(c,'transfer','عقد '+c.name+' خلص… والإدارة بتفكر في التجديد');
 c.sp+=spG+Math.min(2,won.length);c.seInfo={bTop,spG:spG+Math.min(2,won.length),dev,relA,pos,avg,objDone,move,won,la:la.map(a=>({n:a.n,w:a.w.n,club:a.w.club,v:a.v,me:!!a.w.me})),race:race&&race.slice(0,6).map(x=>({n:x.n,cc:x.cc,me:!!x.me})),rank,ballon,aging,offers,stayTier,renew,o,newWage:Math.round(c.contract.wage*(avg>=7.3?1.4:avg>=6.8?1.15:1)*(move>0?1.3:1)*(c.age>=35?R(.55,.75):1)),vet:c.age>=35,noRenew:c.age>=35&&c.contract.years<=0&&(ovr(c)<TIER_REQ[Math.max(0,stayTier)]-4||avg<6.4||Math.random()<(c.age-34)*.12)};if(c.seInfo.noRenew)addNews(c,'transfer','إدارة '+c.club.name+' تقرر عدم تجديد عقد '+c.name+' بعد نهاية الموسم');}
function ballonScreen(c,then){$('awT').textContent='الكرة الذهبية';$('awS').textContent=`${c.name} — أفضل لاعب في العالم! ${c.tot.g} هدف و${c.tot.a} أسيست في ${c.tot.apps} ماتش، من ${DOM_TIER[0]} في ${CBY[c.path.home].n} لحد القمة.`;$('awL').innerHTML='';$('awGo').onclick=then;show('award');setTimeout(()=>{FX.fireworks(14);FX.confetti(300,['#F5C542','#FFF3C4','#FFFFFF']);SFX.roar();},300);}
function awardsScreen(c,then){const I=c.seInfo;$('awT').textContent='حفل جوائز الموسم '+c.season;$('awS').textContent=I.won.length?'كسبت: '+I.won.join(' · '):c.tierName+' · مكسبتش جوايز فردية الموسم ده';
 let h=I.la.map(a=>`<div class="awr ${a.me?'me':''}"><span class="an">${esc(a.n)}</span><span class="aw">${a.me?'إنت':esc(a.w)}<small>${a.me?'':esc(a.club)} · ${esc(a.v)}</small></span></div>`).join('');
 if(I.race)h+=`<div class="awr head"><span class="an">ترتيب الكرة الذهبية</span><span class="aw">${I.rank<=30?'مركزك: #'+I.rank:'برّه أول 30'}</span></div>`+I.race.slice(0,5).map((x,i)=>`<div class="awr ${x.me?'me':''}"><span class="an">#${i+1}</span><span class="aw">${flagHTML(x.cc)} ${x.me?'إنت':esc(x.n)}</span></div>`).join('');
 $('awL').innerHTML=h;$('awGo').onclick=then;show('award');if(I.won.length)setTimeout(()=>{FX.fireworks(6);FX.confetti(160);},300);}
function seasonScreen(c){const I=c.seInfo;if(c.age>=40||(I.noRenew&&!I.offers.length)){return retire(c.age>=40?'وصلت لسن الأربعين… وقت الوداع':'محدش عرض عليك عقد جديد… وقت الوداع');}const pos=I.pos,move=I.move,stayTier=I.stayTier,renew=I.renew,offers=I.offers;
  $('seT').textContent='نهاية الموسم '+c.season;$('seS').textContent=c.tierName+' · المركز '+pos;
  $('seSum').innerHTML=`<div class="big-score" style="font-size:clamp(40px,12vh,70px)">#${pos}</div><div class="ttl" style="font-size:20px">${move>0?'الفريق صعد إلى '+tierInfo(c.path,c.path.tier+1).short+'!':move<0||I.relA?'الفريق هبط…':'الموسم خلص'}</div><div class="sub">أهداف المدرب: حققت ${I.objDone} من ${(c.obj||[]).length} · <b style="color:var(--acc)">+${I.spG||0} نقطة مهارة</b> للموسم الجاي · قيمتك السوقية ${money(marketValue(c))}</div>${I.dev?`<div class="sub">${esc(I.dev)}</div>`:''}<div class="statg"><div><b>${c.ss.apps}</b><span>ماتش</span></div><div><b>${c.ss.g}+${c.ss.a}</b><span>أهداف + أسيست</span></div><div><b>${I.avg.toFixed(1)}</b><span>متوسط التقييم</span></div></div>${I.won.map(a=>`<div class="news">${esc(a)}</div>`).join('')}${I.aging?`<div class="sub">${I.aging}</div>`:''}`;
  let h=I.noRenew?`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">${esc(c.club.name)} مش هيجدد عقدك</div><div class="sub">اختار عرض من العروض، أو اعتزل بكرامة</div></div><button class="btn sm ghost" id="seRet">اعتزل</button></div>`:stayTier===-1?`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">${esc(c.club.name)} هبط من الدوري</div><div class="sub">عقدك فيه بند بيسمحلك تمشي ببلاش — اختار عرض من العروض</div></div></div>`:`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">${renew?'جدّد مع ':'كمّل مع '}${esc(c.club.name)}</div><div class="sub">${esc(tierInfo(c.path,stayTier).name)}${renew?' · عقد جديد '+money(I.newWage)+'/أسبوع':' · باقي '+c.contract.years+' سنة في عقدك'}</div></div><button class="btn sm" id="seStay">${renew?'جدّد':'موسم جديد'}</button></div>`;
  offers.forEach((f,i)=>{const blocked=f.fee>0&&f.fee<f.ask&&!f.clubOk;h+=`<div class="offer">${crestHTML(f.club,'s')}<div class="grow"><div style="font-weight:800;font-size:17px">${esc(f.club.name)} ${flagHTML(f.abroad)} <span class="pill">${esc(f.why)}</span></div><div class="sub">${esc(f.tierName)} · تقييم الفريق ${f.clubR} · دورك: ${esc(f.role)}</div><div class="sub">${money(f.wage)}/أسبوع · ${f.years} سنين · ${f.fee?'رسوم الانتقال '+money(f.fee)+(blocked?' <b style="color:var(--red)">(ناديك عايز '+money(f.ask)+')</b>':''):'انتقال حر'}</div></div><button class="btn sm gold" data-o="${i}">فاوض</button></div>`;});
  if(!offers.length)h+=`<div class="sub" style="padding:8px">مافيش عروض الموسم ده. ارفع تقييمك (محتاج ${TIER_REQ[Math.min(7,stayTier+1)]}) ومتوسطك في الماتشات (7 أو أكتر) عشان الكشافين يشوفوك.</div>`;
  if(c.age>=35&&!I.noRenew)h+=`<div class="offer"><div class="grow"><div style="font-weight:800">إنت عندك ${c.age} سنة</div><div class="sub">العروض بقت أقل… ممكن تعتزل وإنت في القمة</div></div><button class="btn sm ghost" id="seRet">اعتزل</button></div>`;
  $('seOff').innerHTML=h;if($('seRet'))$('seRet').onclick=()=>retire('قررت تعتزل');
  if($('seStay'))$('seStay').onclick=()=>{if(renew){c.contract={wage:I.newWage,years:I.vet?1:RI(2,4)};addNews(c,'transfer',c.name+' يجدد عقده مع '+c.club.name+' لحد '+(c.season+c.contract.years));}c.path.tier=stayTier;newSeason();if(renew)showSign(c.club,'تجديد العقد',c.contract.years+' سنين · '+money(c.contract.wage)+' في الأسبوع',()=>show('hub'));else show('hub');};
  $('seOff').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const of=offers[+b.dataset.o];c.path.tier=Math.max(0,stayTier);openNegotiation(of,()=>{if(c.club.name!==of.club.name){const k=offers.indexOf(of);if(k>=0)offers.splice(k,1);store();seasonScreen(c);return;}if(c.contract.years<=0)c.contract={wage:I.newWage,years:2};newSeason();show('hub');});});
  show('season');}
function newSeason(){const c=App.c;c.season++;c.ss={apps:0,g:0,a:0,rs:0,yc:0,motm:0,sh:0,sot:0,p:0,pc:0,tk:0,rc:0};c.seInfo=null;c.energy=100;c.lastPost=-1;c.cup=null;buildSeason(c);store();}
function retire(why){const c=App.c;$('reNew').onclick=()=>{SFX.init();Object.assign(NEW,{step:1,name:'',clubs:null,club:null});show('create');renderCreate();};if(c.retired){show('retire');}c.retired=true;addNews(c,'me','رسمياً: '+c.name+' يعلن اعتزاله كرة القدم في سن '+c.age,true);store();$('reT').textContent='اعتزال '+c.name;$('reS').textContent=`${typeof why==='string'?why+' · ':''}${c.age} سنة · ${c.trophies.length} بطولة وجائزة${c.won?' · '+c.won+' كرة ذهبية':''}`;$('reG').innerHTML=`<div><b>${c.tot.apps}</b><span>ماتش</span></div><div><b>${c.tot.g}</b><span>هدف</span></div><div><b>${c.tot.a}</b><span>أسيست</span></div><div><b>${c.intl.caps}</b><span>دولي</span></div><div><b>${num(c.followers)}</b><span>متابع</span></div><div><b>${money(c.money)}</b><span>ثروة</span></div>`;show('retire');FX.confetti(150);}

/* ---------- settings ---------- */
function renderSettings(){const vi=$('voiceInfo');if(vi)vi.textContent=Voice.ready?'صوت المعلّق جاهز: '+(App.settings.dial?'خليجي':'مصري')+' ('+Voice.man.engine+')':'الصوت بيتولّد وقت بناء نسخة الأندرويد على GitHub. في نسخة المتصفح دي مش موجود.';document.querySelectorAll('#scr-settings .seg').forEach(seg=>{const k=seg.dataset.k;seg.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',String(App.settings[k])===b.dataset.v);b.onclick=()=>{App.settings[k]=Number(b.dataset.v);SFX.on=!!App.settings.sound;Comm.tts=!!App.settings.voice;Voice.on=!!App.settings.voice;Comm.text=!!App.settings.ctext;SFX.crowd(App.settings.sound?.05:0);if(k==='dial')Voice.init().then(()=>{Voice.preload();renderSettings();});store();renderSettings();};});});}
$('setBack').onclick=()=>show(App.returnTo||'title');

/* ---------- match flow ---------- */
function matchEvent(type,d,m){const nm=d&&d.p?lastName(d.p.name):'';
 switch(type){
  case 'kickoff':Comm.say('kickoff',{},1);SFX.chant();break;
  case 'second':Comm.say('second',{},1);break;
  case 'star_ball':Comm.say('star_ball',{p:nm});break;
  case 'shot':Comm.say(d.far?'shot_long':'shot',{p:nm});break;
  case 'save':Comm.say(d.rush?'gk_rush':d.great?'save_great':'save',{},1);break;
  case 'save_pen':Comm.say('save_pen',{},1);FX.flashOn(.3);break;
  case 'miss':Comm.say(d.close?'miss_big':'miss',{},1);break;
  case 'goal':{const ours=d.team===0;const M=App.match;let key='goal_conc';if(M&&!ours&&M.score[1]>M.score[0])M.wasBehind=true;if(ours&&M){const mn=M.minute(),a=M.score[0],b=M.score[1];key=mn>=85&&a>=b?'goal_late':M.wasBehind&&a>b?'goal_comeback':a===b?'goal_equal':d.pen?'goal_pen':d.hdr?'goal_header':d.far?'goal_long':d.star?'goal_star':a===b+1?'goal_lead':'goal';if(a>b)M.wasBehind=M.wasBehind&&false;}Comm.say(key,{p:d.scorer?lastName(d.scorer.name):''},1);FX.goal(ours,d.star);if(ours)setTimeout(()=>SFX.chant(),1600);break;}
  case 'foul':Comm.say('foul',{},1);break;
  case 'pen':Comm.say('pen',{},1);FX.flashOn(.25,'255,90,95');break;
  case 'fk':Comm.say('fk');break;
  case 'corner':Comm.say('corner');break;
  case 'yellow':case 'red':Comm.say(type,{p:nm},1);break;
  case 'injury':Comm.say('injury',{p:nm},1);break;
  case 'tackle':Comm.say('tackle');break;
  case 'half':Comm.say('half',{},1);break;
  case 'end':{const M=App.match||m;const r=M?Math.sign(M.score[0]-M.score[1]):0;Comm.say(r>0?'end_win':r<0?'end_loss':'end_draw',{},1);break;}
  case 'offside':Comm.say('offside',{},1);break;
  case 'sub':Comm.say('sub');break;
  case 'woodwork':Comm.say('woodwork',{},1);FX.flashOn&&FX.flashOn(.15);break;
  case 'advantage':Comm.say('advantage',{},1);break;
  case 'clear':Comm.say('clear');break;
  case 'star_red':toast('اتطردت! الماتش هيكمل من غيرك');break;}}
function beginMatch(m,info,home,away){App.demo=null;App.match=m;Input.clear();SFX.init();Voice.preload();SFX.on=!!App.settings.sound;Comm.tts=!!App.settings.voice;SFX.crowd(.07,.5);SFX.rain(m.rain);Stadium.start();
 $('compTag').textContent=m.comp||'';$('inComp').textContent=m.comp||'';
 const tA=m.t[0],tB=m.t[1];$('inA').innerHTML=crestHTML({name:tA.name,short:tA.short,kitArr:tA.kit})+esc(tA.name);$('inB').innerHTML=crestHTML({name:tB.name,short:tB.short,kitArr:tB.kit})+esc(tB.name);$('inW').textContent=(m.rain?'مطر · ':'')+'الإستاد مليان عن آخره';
 show('match');updButtons(true);}

/* quick match */
$('mQuick').onclick=()=>{SFX.init();const used=new Set();const a=genClubs(pick(BIG5),1,80,used,1)[0],b=genClubs(pick(BIG5),1,80,used,4)[0];App.quick=true;
 beginMatch(new Match({home:Object.assign(a,{nm:CBY[a.cc].nm}),away:Object.assign(b,{R:80+App.settings.diff,nm:CBY[b.cc].nm}),human:{lock:false},halfLen:App.settings.halfLen,intro:!!App.settings.intro,comp:'ماتش ودي',weather:Math.random()<.25?'rain':'clear',onEvent:matchEvent,onEnd:r=>{App.match=null;Comm.stop();SFX.rain(false);
  $('poS').textContent='ماتش سريع';$('poScore').innerHTML=`<div class="big-score bs2"><span>${r.score[0]}</span><span>-</span><span>${r.score[1]}</span></div>${scorersHTML(r.events)}`;$('poStats').innerHTML=`<div class="ttl">${r.score[0]>r.score[1]?'فوز':r.score[0]<r.score[1]?'خسارة':'تعادل'}</div><div class="sub">استحواذ ${r.poss}% · تسديدات ${r.shots[0]}-${r.shots[1]}</div><div class="sub">جرّب المسيرة عشان تبني لاعبك من الدرجة الرابعة.</div>`;$('poGo').onclick=()=>show('title');show('post');}}));};
$('mNew').onclick=()=>{SFX.init();if(App.c&&!App.c.retired&&!confirmNew())return;Object.assign(NEW,{step:1,name:'',clubs:null,club:null});show('create');renderCreate();};
function confirmNew(){if(confirmNew.armed){confirmNew.armed=false;return true;}confirmNew.armed=true;toast('دوس تاني عشان تمسح المسيرة الحالية وتبدأ جديد');setTimeout(()=>confirmNew.armed=false,3000);return false;}
$('mContinue').onclick=()=>{SFX.init();show('hub');};$('mSettings').onclick=()=>{App.returnTo='title';show('settings');};
$('mFull').onclick=()=>{try{const el=document.documentElement;const p=el.requestFullscreen?el.requestFullscreen():el.webkitRequestFullscreen&&el.webkitRequestFullscreen();if(p&&p.then)p.then(()=>{try{screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>toast('ملء الشاشة مش متاح هنا'));}catch(e){toast('ملء الشاشة مش متاح هنا');}};
function togglePause(){const m=App.match;if(!m)return;m.paused=!m.paused;$('pause').classList.toggle('on',m.paused);$('paSubs').classList.toggle('hidden',!App.quick);$('subsP').classList.add('hidden');$('helpP').classList.add('hidden');}
const FB_URL='https://www.facebook.com/share/1KS5uwangM/';function openFb(){if(Nat&&Nat.openUrl)Nat.openUrl({url:FB_URL}).catch(()=>{try{window.open(FB_URL,'_blank');}catch(e){}});else{try{window.open(FB_URL,'_blank');}catch(e){location.href=FB_URL;}}}
$('mFb').onclick=openFb;$('setFb').onclick=openFb;
$('pauseBtn').onclick=togglePause;$('camBtn').onclick=()=>{const n=((+App.settings.cam||0)+1)%4;App.settings.cam=n;try{store();}catch(e){}const m=App.match;if(m)m.banner={t:'الكاميرا: '+['عادية','قريبة','بعيدة','ورا لاعبي'][n],life:1.2,small:true};};$('paRes').onclick=togglePause;
$('paQuit').onclick=()=>{const m=App.match;$('pause').classList.remove('on');if(!m)return;if(App.quick||!App.c){App.match=null;Comm.stop();SFX.rain(false);show('title');return;}m.paused=false;const r=m.result();r.score=[0,3];r.events.push({type:'goal',team:1,min:90,name:'انسحاب'});finishFix(r,false);};
$('skipBtn').onclick=()=>{if(App.match)App.match.skip();};

/* ---------- touch controls ---------- */
(function(){const z=$('joyZone'),base=$('joyBase'),knob=$('joyKnob');const R0=56;
 z.addEventListener('pointerdown',e=>{e.preventDefault();SFX.init();if(Input.joy)return;const r=z.getBoundingClientRect();Input.joy={id:e.pointerId,cx:e.clientX,cy:e.clientY};base.style.left=(e.clientX-r.left)+'px';base.style.top=(e.clientY-r.top)+'px';try{z.setPointerCapture(e.pointerId);}catch(_){}});
 z.addEventListener('pointermove',e=>{const j=Input.joy;if(!j||j.id!==e.pointerId)return;let dx=e.clientX-j.cx,dy=e.clientY-j.cy;const d=hyp(dx,dy);if(d>R0){dx*=R0/d;dy*=R0/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;Input.jx=dx/R0;Input.jy=dy/R0;});
 const end=e=>{const j=Input.joy;if(!j||j.id!==e.pointerId)return;Input.joy=null;Input.jx=Input.jy=0;knob.style.transform='';};z.addEventListener('pointerup',end);z.addEventListener('pointercancel',end);
 const bind=(id,down,up)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();SFX.init();b.classList.add('act');down();try{b.setPointerCapture(e.pointerId);}catch(_){}});const u=()=>{b.classList.remove('act');up&&up();};b.addEventListener('pointerup',u);b.addEventListener('pointercancel',u);b.addEventListener('contextmenu',e=>e.preventDefault());};
 ['X','O','T','S','F'].forEach(k=>bind('b'+k,()=>Input.down(k),()=>Input.up(k)));bind('bR',()=>{Input.sprint=true;},()=>{Input.sprint=false;});})();
let lastMode='';function updButtons(force){const m=App.match;if(!m)return;const kn=$('joyKnob');kn.classList.toggle('spr',hyp(Input.jx,Input.jy)>.9||Input.sprint);if(!m.human)return;const h=m.human,b=m.ball;const has=b.owner===h.ctrl;const teamPoss=b.owner&&b.owner.team.idx===h.team;const rk=m.restartKind;
 const mode=has?(h.ctrl.role==='GK'?(rk==='gk'?'gkick':'gk'):rk==='pen'?'pen':rk==='throw'?'throw':rk==='corner'?'corner':'att'):teamPoss?(h.lock?'call':'sup'):'def';if(mode===lastMode&&!force)return;lastMode=mode;
 // [✕, ○, △, □]
 const L0={att:['تمرير','عرضية','بينية','تسديد'],sup:['تمرير','عرضية','بينية','تسديد'],def:['ضغط','افتكاك','زميل يضغط','زحلقة'],call:['اطلب الكورة','—','—','—'],pen:['—','—','—','سدّد'],throw:['رمية قصيرة','رمية طويلة','رمية لقدام','—'],corner:['قصيرة','عرضية','—','—'],gk:['رمية/باص','شوطة طويلة','بينية','إبعاد'],gkick:['قصيرة','طويلة','بينية','إبعاد']}[mode];
 const LF={att:'لفّة',sup:'لفّة',def:'تغطية',pen:'لفّة',call:'—',throw:'—',corner:'—',gk:'—',gkick:'—'}[mode]||'—';$('lF').textContent=LF;$('bF').classList.toggle('dim',LF==='—'||mode==='sup'); ['X','O','T','S'].forEach((k,i)=>{$('l'+k).textContent=L0[i];$('b'+k).classList.toggle('dim',L0[i]==='—'||mode==='sup');});$('hud').classList.toggle('def',mode==='def');}
function renderSubs(){const m=App.match,P=$('subsP');if(!m||!m.human){P.innerHTML='<div class="sub">التبديلات متاحة لما تكون متحكم في الفريق كله. في وضع «لاعبك بس» المدرب هو اللي بيبدّل.</div>';return;}
 const t=m.t[m.human.team];const sel=renderSubs.sel;const row=(p,k)=>`<div class="subrow ${sel===p?'sel':''}" data-k="${k}"><span>${esc(p.name)} <span class="sub">${p.num} · ${{GK:'حارس',DF:'دفاع',MF:'وسط',FW:'هجوم'}[p.role]}${p.star?' · نجمك':''}</span></span><div class="bar"><i style="width:${Math.round(p.stam)}%;background:${p.stam>60?'var(--acc)':p.stam>35?'var(--gold)':'var(--red)'}"></i></div><b>${Math.round(p.stam)}%</b></div>`;
 P.innerHTML=`<div class="row" style="justify-content:space-between"><b>التبديلات (${t.subs}/5)</b><span class="sub">${sel?'اختار البديل':'اختار اللاعب اللي هيطلع'}</span></div>`+(sel?t.bench.map((p,k)=>row(p,'b'+k)).join('')||'<div class="sub">مافيش بدلاء</div>':t.pl.filter(p=>p.role!=='GK').map((p,k)=>row(p,'f'+t.pl.indexOf(p))).join(''));
 P.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{const k=el.dataset.k;if(k[0]==='f'){renderSubs.sel=t.pl[+k.slice(1)];}else if(renderSubs.sel&&t.subs<5){m.manualSubs=true;m.sub(t,renderSubs.sel,t.bench[+k.slice(1)]);renderSubs.sel=null;}renderSubs();});}
$('paSubs').onclick=()=>{$('helpP').classList.add('hidden');$('subsP').classList.toggle('hidden');renderSubs.sel=null;renderSubs();};
$('paHelp').onclick=()=>{$('subsP').classList.add('hidden');const H=$('helpP');H.classList.toggle('hidden');const sv=id=>$(id).querySelector('svg').outerHTML;H.innerHTML=`<div class="help"><b></b><b>في الهجوم</b><b>في الدفاع</b>${sv('bX')}<span>تمرير أرضي</span><span>ضغط على حامل الكورة (اضغط مطوّل)</span>${sv('bO')}<span>عرضية / تمريرة طويلة</span><span>افتكاك واقف</span>${sv('bT')}<span>تمريرة بينية</span><span>زميل يضغط معاك (اضغط مطوّل)</span>${sv('bS')}<span>تسديد (اضغط مطوّل للقوة)</span><span>زحلقة</span><b style="color:#F5C542">L1</b><span>تسديدة لفّة مقوّسة للقائم البعيد</span><span>تغطية: تقف قدّام المهاجم من غير ما تندفع (مطوّل)</span><b style="color:#F5C542">R2</b><span>جري سريع (بيستهلك اللياقة)</span><span>جري سريع</span></div><div class="sub" style="margin-top:8px">وانت بتسدّد هتشوف دايرة على المرمى بتوريك الكورة رايحة فين: زق الجويستيك فوق/تحت عشان تغيّر الركن. لو سبته، التسديدة بتروح أوتوماتيك بعيد عن الحارس. التبديل للاعب الأقرب للكورة أوتوماتيك.</div>`;};

/* ---------- HUD ---------- */
let hudCache='';function hud(m){const ph=m.phase;const H=$('hud');H.classList.toggle('cine',ph==='intro'||ph==='replay');
 // أزرار التحكم والجويستيك بتختفي وقت الجون والإعادة والاحتفال ورجوع اللاعيبة لأماكنهم، وترجع مع بداية اللعب
 const noC=ph==='goal'||ph==='replay'||ph==='intro'||ph==='end'||ph==='half'||!!m.walk;if(noC!==H.classList.contains('noctl')){H.classList.toggle('noctl',noC);if(noC){Input.clear();Input.joy=null;const kn=$('joyKnob');if(kn)kn.style.transform='';}}H.classList.toggle('intro',ph==='intro');H.classList.toggle('replay',ph==='replay');
 {const SB=m.subBoard,el=$('subBoard');const id=SB?SB.id:0;if(el&&el._id!==id){el._id=id;if(SB){const T=m.t[SB.team];$('sbK').style.background=T.kit[0];$('sbTm').textContent=T.short||T.name;$('sbO').textContent=SB.o;$('sbI').textContent=SB.i;$('sbON').textContent=lastName(SB.on);$('sbIN').textContent=lastName(SB.inn);el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}else el.classList.remove('on');}}
 const bn=m.banner;const s=`${m.score[0]}|${m.score[1]}|${m.minute()}|${bn?bn.t+(bn.s||''):''}|${ph}`;if(s===hudCache)return;hudCache=s;
 {let a=m.t[0].short,b2=m.t[1].short;if(a===b2){a=(m.t[0].name||a).split(' ')[0];b2=(m.t[1].name||b2).split(' ')[0];if(a===b2){a=m.t[0].name;b2=m.t[1].name;}}$('hA').textContent=a;$('hB').textContent=b2;}$('kA').style.background=m.t[0].kit[0];$('kB').style.background=m.t[1].kit[0];$('sc').textContent=m.score[0]+' - '+m.score[1];$('clk').textContent=m.clock();
 const el=$('banner');if(bn&&ph!=='replay'){el.className='on'+(bn.small?' small':'')+(bn.card?' card':'')+(bn.goal?' goal'+(bn.team===0?'':' opp'):'');$('bnCard').style.background=bn.card==='yellow'?'#F5C542':'#E53935';$('bnT').textContent=bn.t;$('bnS').textContent=bn.s||'';}else el.className='';}

/* ---------- LOOP ---------- */
const cv=$('game'),ov=$('ov'),octx=ov.getContext('2d');let ctx=null,R3=null,gfxReady=false;let CW=0,CH=0;
function initGfx(){if(gfxReady)return;gfxReady=true;try{R3=new R3D(cv);}catch(e){console.warn('WebGL2 غير متاح، هنستخدم الرسم ثنائي الأبعاد',e);R3=null;ctx=cv.getContext('2d');}resize();}
Promise.race([document.fonts&&document.fonts.load?document.fonts.load('800 34px Changa'):Promise.resolve(),new Promise(r=>setTimeout(r,1800))]).catch(()=>{}).then(initGfx);
function resize(){const dpr=Math.min(2,window.devicePixelRatio||1);CW=innerWidth;CH=innerHeight;ov.width=Math.round(CW*dpr);ov.height=Math.round(CH*dpr);octx.setTransform(dpr,0,0,dpr,0,0);if(ctx){cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}}
addEventListener('resize',resize);
let last=performance.now();
function frame(ts){const dt=Math.min(.033,Math.max(0,(ts-last)/1000));last=ts;FX.update(dt);const m=App.match||App.demo;
 if(m&&gfxReady){try{
  if(App.match&&(m.phase==='intro'||m.phase==='replay')){if(Input.take('Xd')|Input.take('Od')|Input.take('Td')|Input.take('Sd'))m.skip();Input.take('Su');Input.take('Xu');}
  if(App.match&&m.phase==='replay'&&!App.settings.replay)m.skip();if(App.match){coachTick(App.match);commTick(App.match,dt);Stadium.tick(App.match,dt);App._iT=(App._iT||0)+dt;if(App._iT>.5){App._iT=0;instLive(App.match);}}
  m.update(dt);
  if(R3){R3.quality=App.settings.gfx;const d0=window.devicePixelRatio||1;R3.render(m,CW,CH,App.settings.gfx>=2?Math.min(2,d0):Math.min(1.25,d0),ts);drawOverlay(octx,m,CW,CH,(x,y,z)=>R3.project(x,y,z,CW,CH));}
  else if(ctx){m.render(ctx,CW,CH);octx.clearRect(0,0,CW,CH);FX.draw(octx,CW,CH,m);}
 }catch(e){console.error(e);}if(App.match){hud(App.match);updButtons();}}
 requestAnimationFrame(frame);}
load();Guard.boot();SFX.on=!!App.settings.sound;Comm.init();Comm.tts=!!App.settings.voice;Voice.on=!!App.settings.voice;Comm.text=!!App.settings.ctext;Voice.init();startDemo();renderTitle();
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(App.c)store();if(App.match&&!App.match.paused)togglePause();SFX.crowd(0,.1);}else if(App.match)SFX.crowd(.07,.5);});
try{const CapApp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CapApp)CapApp.addListener('backButton',()=>{if(App.match){togglePause();return;}const cur=document.querySelector('.screen.on');const id=cur?cur.id.replace('scr-',''):'title';if(id==='title'){CapApp.exitApp();}else if(['player','comps','career','inbox','social','life','pre'].includes(id))show('hub');else if(id==='settings')show(App.returnTo||'title');else if(id==='hub'||id==='create')show('title');});}catch(e){}
requestAnimationFrame(frame);
