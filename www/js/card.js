// مسيرة نجم — كارت المدرب: صورة المستخدم + اسمه + ناديه + أرقامه وجوايزه، بيتحفظ صورة على الجهاز أو يتشارك (فيسبوك وغيره) وعليه اسم اللعبة
'use strict';
const CARD_PHOTO='masiret-nagm-photo';
const PLAY_URL='https://play.google.com/store/apps/details?id=com.modareb.game';
let cardImg=null,cardBack='career';
function cardPhoto(){if(cardImg!==null)return Promise.resolve(cardImg);let u=null;try{u=localStorage.getItem(CARD_PHOTO);}catch(e){}if(!u){cardImg=false;return Promise.resolve(false);}
 return new Promise(r=>{const im=new Image();im.onload=()=>{cardImg=im;r(im);};im.onerror=()=>{cardImg=false;r(false);};im.src=u;});}
function openCard(from){cardBack=from||'career';show('card');renderCard();}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function fitText(g,t,max,size,weight){let s=size;g.font=`${weight||800} ${s}px Changa, sans-serif`;while(g.measureText(t).width>max&&s>18){s-=2;g.font=`${weight||800} ${s}px Changa, sans-serif`;}return s;}
async function drawCard(cv){const c=App.c;if(!c)return;try{if(document.fonts)await Promise.race([document.fonts.load('800 40px Changa'),new Promise(r=>setTimeout(r,900))]);}catch(e){}
 const img=await cardPhoto();const g=cv.getContext('2d'),W=1080,H=1350;cv.width=W;cv.height=H;g.direction='rtl';
 const k=kitOf(c.club||{}),k0=k[0]||'#1E88E5',k1=k[1]||'#fff',gold='#F5C542',acc='#C6F432';
 // الخلفية
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0B1230');bg.addColorStop(.55,'#070B16');bg.addColorStop(1,'#101a3d');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.save();g.globalAlpha=.22;g.fillStyle=k0;g.beginPath();g.moveTo(W*.55,0);g.lineTo(W,0);g.lineTo(W,H*.42);g.closePath();g.fill();g.fillStyle=k1;g.globalAlpha=.10;g.beginPath();g.moveTo(W*.72,0);g.lineTo(W,0);g.lineTo(W,H*.22);g.closePath();g.fill();
 g.globalAlpha=.045;g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(W/2,H*.62,210,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(0,H*.62);g.lineTo(W,H*.62);g.stroke();g.restore();
 const fr=g.createLinearGradient(0,0,W,H);fr.addColorStop(0,'#FFE08A');fr.addColorStop(.5,gold);fr.addColorStop(1,'#B8860B');g.strokeStyle=fr;g.lineWidth=14;rr(g,18,18,W-36,H-36,46);g.stroke();
 // اسم اللعبة
 g.textAlign='center';g.textBaseline='middle';g.font='800 78px Changa, sans-serif';const w1=g.measureText('مسيرة ').width,w2=g.measureText('نجم').width,x0=W/2+(w1+w2)/2;
 g.textAlign='right';g.fillStyle='#fff';g.fillText('مسيرة ',x0,108);g.fillStyle=acc;g.fillText('نجم',x0-w1,108);
 g.textAlign='center';g.font='600 26px Changa, sans-serif';g.fillStyle='rgba(238,242,255,.7)';g.fillText('من ملاعب الدرجة الرابعة لمنصة الكرة الذهبية',W/2,166);
 // الصورة
 const px=230,py=210,pw=620,ph=560;g.save();rr(g,px,py,pw,ph,40);g.clip();const pg=g.createLinearGradient(0,py,0,py+ph);pg.addColorStop(0,k0);pg.addColorStop(1,'#0B1230');g.fillStyle=pg;g.fillRect(px,py,pw,ph);
 if(img){const s=Math.max(pw/img.width,ph/img.height),iw=img.width*s,ih=img.height*s;g.drawImage(img,px+(pw-iw)/2,py+(ph-ih)/2,iw,ih);}
 else{g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(W/2,py+215,105,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(W/2,py+ph+40,230,250,0,Math.PI,0);g.fill();g.fillStyle='rgba(255,255,255,.75)';g.font='700 30px Changa, sans-serif';g.fillText('حط صورتك هنا',W/2,py+ph-60);}
 const sh=g.createLinearGradient(0,py+ph-170,0,py+ph);sh.addColorStop(0,'rgba(7,11,22,0)');sh.addColorStop(1,'rgba(7,11,22,.85)');g.fillStyle=sh;g.fillRect(px,py+ph-170,pw,170);g.restore();
 g.strokeStyle=fr;g.lineWidth=8;rr(g,px,py,pw,ph,40);g.stroke();
 // التقييم والمركز
 const o=ovr(c);g.fillStyle='rgba(7,11,22,.88)';rr(g,W-250,232,190,220,30);g.fill();g.strokeStyle=gold;g.lineWidth=5;rr(g,W-250,232,190,220,30);g.stroke();
 g.fillStyle=gold;g.font='800 120px Changa, sans-serif';g.textAlign='center';g.fillText(String(o),W-155,325);g.fillStyle='#fff';fitText(g,POS[c.pos].n,170,36,800);g.fillText(POS[c.pos].n,W-155,410);
 // العلم والرقم
 const C=CBY[c.nat]||{flag:['#888','#aaa','#666'],n:''};g.save();rr(g,60,236,170,112,18);g.clip();for(let i=0;i<3;i++){g.fillStyle=C.flag[i];if(C.dir==='v')g.fillRect(60+i*170/3,236,170/3+1,112);else g.fillRect(60,236+i*112/3,170,112/3+1);}g.restore();g.strokeStyle='#fff';g.lineWidth=4;rr(g,60,236,170,112,18);g.stroke();
 g.fillStyle='#fff';fitText(g,C.n,190,30,700);g.fillText(C.n,145,380);
 g.fillStyle='rgba(7,11,22,.88)';rr(g,72,410,146,120,26);g.fill();g.fillStyle=acc;g.font='800 76px Changa, sans-serif';g.fillText(String(c.num),145,472);
 // الاسم والنادي
 g.fillStyle='#fff';fitText(g,c.name,W-140,84,800);g.fillText(c.name,W/2,838);
 const club=c.retired?'معتزل':(c.club?c.club.name:'');g.font='700 36px Changa, sans-serif';const cw=g.measureText(club).width;
 g.fillStyle=k0;rr(g,W/2-cw/2-70,882,58,58,14);g.fill();g.fillStyle=k1;g.fillRect(W/2-cw/2-70,926,58,14);g.fillStyle='rgba(238,242,255,.92)';g.textAlign='center';g.fillText(club,W/2+24,912);
 g.font='600 28px Changa, sans-serif';g.fillStyle='rgba(238,242,255,.65)';g.fillText(`${c.age} سنة · الموسم ${c.season}${c.tierShort?' · '+c.tierShort:''}`,W/2,966);
 // الأرقام
 const tro=(c.trophies||[]).filter(t=>t.k!=='award').length,aw=(c.trophies||[]).filter(t=>t.k==='award').length;
 const tot=c.tot||{},ss=c.ss||{};const S=[[tot.apps||0,'ماتش'],[tot.g||0,'هدف'],[tot.a||0,'أسيست'],[tot.motm||0,'رجل الماتش'],[tro,'بطولة'],[aw,'جايزة فردية'],[c.won||0,'كرة ذهبية'],[money(marketValue(c)),'القيمة']];
 const gx=70,gy=996,cw2=(W-140-30)/4,chh=110;S.forEach((s,i)=>{const col=i%4,row=(i/4)|0;const x=W-gx-(col+1)*cw2-col*10,y=gy+row*(chh+12);g.fillStyle='rgba(255,255,255,.06)';rr(g,x,y,cw2,chh,20);g.fill();
  g.fillStyle=i===6&&s[0]>0?gold:'#fff';fitText(g,String(s[0]),cw2-20,54,800);g.fillText(String(s[0]),x+cw2/2,y+46);g.fillStyle='rgba(238,242,255,.65)';g.font='600 24px Changa, sans-serif';g.fillText(s[1],x+cw2/2,y+88);});
 // آخر جايزة كبيرة + الدعوة
 const best=(c.trophies||[]).slice().reverse().find(t=>t.n);if(best){g.fillStyle=gold;fitText(g,'★ '+best.n+' — الموسم '+best.s,W-160,30,700);g.fillText('★ '+best.n+' — الموسم '+best.s,W/2,1262);}
 g.fillStyle=acc;g.font='800 28px Changa, sans-serif';g.fillText('العبها مجاناً على Google Play · أنت المدرب',W/2,best?1300:1286);}
function renderCard(){const cv=$('cdCv');if(!cv||!App.c)return;drawCard(cv).catch(e=>console.error(e));$('cdNoPh').classList.toggle('hidden',!(cardImg||(()=>{try{return!!localStorage.getItem(CARD_PHOTO);}catch(e){return false;}})()));}
function cardB64(){return $('cdCv').toDataURL('image/png').split(',')[1];}
function cardName(){return 'masiret-nagm-'+(App.c?App.c.name.replace(/\s+/g,'-'):'card')+'.png';}
function cardBlob(){return new Promise(r=>$('cdCv').toBlob(b=>r(b),'image/png'));}
function cardDownload(){const a=document.createElement('a');a.href=$('cdCv').toDataURL('image/png');a.download=cardName();document.body.appendChild(a);a.click();a.remove();}
$('cdBack').onclick=()=>show(cardBack||'career');
$('cdPhoto').onclick=()=>{const f=$('cdFile');f.value='';f.click();};
$('cdFile').onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const M=900,s=Math.min(1,M/Math.max(im.width,im.height));const t=document.createElement('canvas');t.width=Math.round(im.width*s);t.height=Math.round(im.height*s);t.getContext('2d').drawImage(im,0,0,t.width,t.height);
  const u=t.toDataURL('image/jpeg',.85);try{localStorage.setItem(CARD_PHOTO,u);}catch(err){}const im2=new Image();im2.onload=()=>{cardImg=im2;renderCard();};im2.src=u;};im.onerror=()=>toast('الصورة دي مش مدعومة، جرّب صورة تانية');im.src=rd.result;};rd.readAsDataURL(f);};
$('cdNoPh').onclick=()=>{try{localStorage.removeItem(CARD_PHOTO);}catch(e){}cardImg=false;renderCard();};
$('cdSave').onclick=async()=>{try{if(Nat&&Nat.saveImage){const r=await Nat.saveImage({b64:cardB64(),name:cardName()});if(r&&r.saved){toast('الكارت اتحفظ في الصور (Pictures/MasiretNagm)');return;}await Nat.shareImage({b64:cardB64(),text:''});return;}}catch(e){}cardDownload();toast('الكارت اتحفظ');};
$('cdShare').onclick=async()=>{const c=App.c;const text=`${c.name} · تقييم ${ovr(c)} · ${c.club?c.club.name:''}\nابدأ مسيرتك من الدرجة الرابعة للكرة الذهبية في «أنت المدرب» 👇\n${PLAY_URL}`;
 try{if(Nat&&Nat.shareImage){await Nat.shareImage({b64:cardB64(),text});return;}}catch(e){}
 try{const b=await cardBlob();const file=new File([b],cardName(),{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text});return;}}catch(e){if(e&&e.name==='AbortError')return;}
 cardDownload();toast('الكارت اتحمّل — ارفعه على فيسبوك من الصور');};
$('reCard').onclick=()=>openCard('retire');

// ---- وش اللاعب من صورتك: لون البشرة والشعر + صورة الوش على راس لاعبك في الملعب
const FACE_KEY='masiret-nagm-face';window.FACE_IMG=null;
function loadFace(){try{const u=App.c&&App.c.useFace?localStorage.getItem(FACE_KEY):null;if(u){const im=new Image();im.src=u;window.FACE_IMG=im;}else window.FACE_IMG=null;}catch(e){window.FACE_IMG=null;}}
function avgCol(g,x,y,w,h,pick){const d=g.getImageData(x,y,w,h).data;let r=0,gg=0,b=0,n=0;for(let i=0;i<d.length;i+=4){const R0=d[i],G0=d[i+1],B0=d[i+2];if(pick&&!pick(R0,G0,B0))continue;r+=R0;gg+=G0;b+=B0;n++;}if(!n)return null;const hx=v=>Math.round(v/n).toString(16).padStart(2,'0');return'#'+hx(r)+hx(gg)+hx(b);}
function faceFromPhoto(img){const S=256,cv=document.createElement('canvas');cv.width=S;cv.height=S;const g=cv.getContext('2d');
 // نفترض إن الوش في نص الصورة من فوق (زي صورة السيلفي)
 const w=img.width,h=img.height,side=Math.min(w,h*0.8),sx=(w-side)/2,sy=Math.max(0,h*0.05);g.drawImage(img,sx,sy,side,side,0,0,S,S);
 const skin=avgCol(g,S*.38,S*.48,S*.24,S*.18,(r,gr,b)=>r>gr&&r>b&&r-b>12)||'#C68E64';
 const hair=avgCol(g,S*.3,S*.04,S*.4,S*.12,(r,gr,b)=>r+gr+b<330)||'#1A1A1A';
 const fc=document.createElement('canvas');fc.width=128;fc.height=160;const f=fc.getContext('2d');f.save();f.beginPath();f.ellipse(64,80,60,78,0,0,Math.PI*2);f.clip();f.drawImage(cv,S*.2,S*.12,S*.6,S*.75,0,0,128,160);f.restore();
 return{skin,hair,face:fc.toDataURL('image/png')};}
function applyFace(on){const c=App.c;if(!c)return;if(!on){c.useFace=false;store();loadFace();toast('رجعنا لشكل لاعبك الأصلي');renderCard();return;}
 cardPhoto().then(img=>{if(!img){toast('اختار صورتك الأول');return;}const r=faceFromPhoto(img);try{localStorage.setItem(FACE_KEY,r.face);}catch(e){}c.skin=r.skin;c.hair=r.hair;c.useFace=true;store();loadFace();toast('لاعبك بقى شبهك! هتشوفه في الماتش الجاي');renderCard();});}
(function(){const btns=$('cdNoPh')&&$('cdNoPh').parentNode;if(btns&&!$('cdFace')){const b=document.createElement('button');b.className='btn ghost';b.id='cdFace';b.textContent='خلّي لاعبي شبهي';btns.insertBefore(b,$('cdNoPh'));b.onclick=()=>applyFace(!(App.c&&App.c.useFace));}})();
const _rc=renderCard;renderCard=function(){_rc();const b=$('cdFace');if(b)b.textContent=App.c&&App.c.useFace?'رجّع شكل لاعبي الأصلي':'خلّي لاعبي شبهي (من صورتك)';};
setTimeout(loadFace,300);
