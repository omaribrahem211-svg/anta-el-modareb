// مسيرة نجم — هيكل اللاعب وحركاته: بيمزج حركات الجري المتسجلة حسب السرعة، وفوقها حركات الكورة (شوط، تدخل، ارتماء، رأسية، رمية تماس، احتفال)
'use strict';
const Skel=(()=>{
 if(typeof RIG==='undefined')return null;
 const d64=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
 const nJ=RIG.nJ,par=RIG.par,names=RIG.names,IB=d64(RIG.ib,Float32Array),animJ=RIG.animJ,nA=animJ.length,FPS=RIG.fps;
 const J={};names.forEach((n,i)=>J[n.replace('DEF-','')]=i);
 // أسماء موحّدة للعضم (موديل ميكسامو)
 const AL={'spine.001':'Spine','spine.002':'Spine1','spine.003':'Spine2','neck':'Neck','head':'Head','hips':'Hips'};
 for(const[s,l]of[['Left','L'],['Right','R']])Object.assign(AL,{['shoulder.'+l]:s+'Shoulder',['upper_arm.'+l]:s+'Arm',['forearm.'+l]:s+'ForeArm',['hand.'+l]:s+'Hand',['thigh.'+l]:s+'UpLeg',['shin.'+l]:s+'Leg',['foot.'+l]:s+'Foot',['toe.'+l]:s+'ToeBase'});
 for(const a in AL)if(J[a]===undefined&&J[AL[a]]!==undefined)J[a]=J[AL[a]];
 const META=RIG.meta||{};
 const clips={};for(const k in RIG.clips){const c=RIG.clips[k];let d;if(RIG.q16){const q=d64(c.d,Int16Array);d=new Float32Array(q.length);for(let i=0;i<q.length;i+=7){d[i]=q[i]/1000;d[i+1]=q[i+1]/1000;d[i+2]=q[i+2]/1000;for(let k2=3;k2<7;k2++)d[i+k2]=q[i+k2]/32767;}}else d=d64(c.d,Float32Array);clips[k]={n:c.n,dur:c.dur,d};}
 const has=k=>!!clips[k];
 // ---- quaternion helpers [x,y,z,w]
 const qmul=(a,b,o)=>{const ax=a[0],ay=a[1],az=a[2],aw=a[3],bx=b[0],by=b[1],bz=b[2],bw=b[3];o[0]=aw*bx+ax*bw+ay*bz-az*by;o[1]=aw*by-ax*bz+ay*bw+az*bx;o[2]=aw*bz+ax*by-ay*bx+az*bw;o[3]=aw*bw-ax*bx-ay*by-az*bz;return o;};
 const qax=(x,y,z,a,o)=>{const s=Math.sin(a/2);o[0]=x*s;o[1]=y*s;o[2]=z*s;o[3]=Math.cos(a/2);return o;};
 const qinv=(a,o)=>{o[0]=-a[0];o[1]=-a[1];o[2]=-a[2];o[3]=a[3];return o;};
 const qnrm=o=>{const l=Math.hypot(o[0],o[1],o[2],o[3])||1;o[0]/=l;o[1]/=l;o[2]/=l;o[3]/=l;return o;};
 const qlerp=(a,b,t,o)=>{const d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],s=d<0?-1:1;for(let i=0;i<4;i++)o[i]=a[i]*(1-t)+b[i]*s*t;return qnrm(o);};
 const qrot=(q,v,o)=>{const x=v[0],y=v[1],z=v[2],qx=q[0],qy=q[1],qz=q[2],qw=q[3];const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;o[0]=ix*qw+iw*-qx+iy*-qz-iz*-qy;o[1]=iy*qw+iw*-qy+iz*-qx-ix*-qz;o[2]=iz*qw+iw*-qz+ix*-qy-iy*-qx;return o;};
 // ---- rest pose
 const rT=[],rR=[],rS=[];for(let i=0;i<nJ;i++){const r=RIG.rest[i];rT.push(r.slice(0,3));rR.push(r.slice(3,7));rS.push(r.slice(7,10));}
 const gR=[],gT=[];for(let i=0;i<nJ;i++){const p=par[i];if(p<0){gR.push(rR[i].slice());gT.push(rT[i].slice());}else{const q=qmul(gR[p],rR[i],[0,0,0,1]);const t=qrot(gR[p],[rT[i][0]*rS[p][0],rT[i][1]*rS[p][1],rT[i][2]*rS[p][2]],[0,0,0]);gR.push(q);gT.push([gT[p][0]+t[0],gT[p][1]+t[1],gT[p][2]+t[2]]);}}
 // ---- working buffers
 const LT=new Float32Array(nJ*3),LR=new Float32Array(nJ*4),GR=[],GT=[];for(let i=0;i<nJ;i++){GR.push([0,0,0,1]);GT.push([0,0,0]);}
 const tq=[0,0,0,1],tq2=[0,0,0,1],tq3=[0,0,0,1],tv=[0,0,0];
 const aIdx=new Int16Array(nJ).fill(-1);animJ.forEach((j,k)=>aIdx[j]=k);
 function resetRest(){for(let i=0;i<nJ;i++){LT[i*3]=rT[i][0];LT[i*3+1]=rT[i][1];LT[i*3+2]=rT[i][2];LR[i*4]=rR[i][0];LR[i*4+1]=rR[i][1];LR[i*4+2]=rR[i][2];LR[i*4+3]=rR[i][3];}}
 // add w * clip(t) into accumulators
 const accT=new Float32Array(nA*3),accR=new Float32Array(nA*4);let accW=0;
 function accClear(){accT.fill(0);accR.fill(0);accW=0;}
 function accClip(name,u,w,loop){if(w<=0.001)return;const c=clips[name];let f=loop?((u%1)+1)%1*(c.n-1):Math.max(0,Math.min(1,u))*(c.n-1);const f0=Math.floor(f),f1=Math.min(c.n-1,f0+1),a=f-f0;const d=c.d,s0=f0*nA*7,s1=f1*nA*7;
  for(let k=0;k<nA;k++){const o0=s0+k*7,o1=s1+k*7;for(let i=0;i<3;i++)accT[k*3+i]+=(d[o0+i]*(1-a)+d[o1+i]*a)*w;
   let x=d[o0+3]*(1-a)+d[o1+3]*a,y=d[o0+4]*(1-a)+d[o1+4]*a,z=d[o0+5]*(1-a)+d[o1+5]*a,ww=d[o0+6]*(1-a)+d[o1+6]*a;
   if(accW>0&&(x*accR[k*4]+y*accR[k*4+1]+z*accR[k*4+2]+ww*accR[k*4+3])<0){x=-x;y=-y;z=-z;ww=-ww;}
   accR[k*4]+=x*w;accR[k*4+1]+=y*w;accR[k*4+2]+=z*w;accR[k*4+3]+=ww*w;}
  accW+=w;}
 function accApply(){if(accW<=0)return;for(let k=0;k<nA;k++){const j=animJ[k];LT[j*3]=accT[k*3]/accW;LT[j*3+1]=accT[k*3+1]/accW;LT[j*3+2]=accT[k*3+2]/accW;tq[0]=accR[k*4];tq[1]=accR[k*4+1];tq[2]=accR[k*4+2];tq[3]=accR[k*4+3];qnrm(tq);LR[j*4]=tq[0];LR[j*4+1]=tq[1];LR[j*4+2]=tq[2];LR[j*4+3]=tq[3];}}
 // per-joint model-space overrides: target global rotation = Q * restGlobal, blended with weight
 const OV=new Map();
 function ov(j,q,w){if(w<=0.001)return;OV.set(j,{q:q.slice(),w});}
 const ADD=new Map();function add(j,q){const e=ADD.get(j);if(e)qmul(q,e,e);else ADD.set(j,q.slice());}
 function computeGlobals(){for(let i=0;i<nJ;i++){const p=par[i];const lq=[LR[i*4],LR[i*4+1],LR[i*4+2],LR[i*4+3]];
   if(p<0){GR[i][0]=lq[0];GR[i][1]=lq[1];GR[i][2]=lq[2];GR[i][3]=lq[3];GT[i][0]=LT[i*3];GT[i][1]=LT[i*3+1];GT[i][2]=LT[i*3+2];}
   else{qmul(GR[p],lq,GR[i]);qrot(GR[p],[LT[i*3]*rS[p][0],LT[i*3+1]*rS[p][1],LT[i*3+2]*rS[p][2]],tv);GT[i][0]=GT[p][0]+tv[0];GT[i][1]=GT[p][1]+tv[1];GT[i][2]=GT[p][2]+tv[2];}
   const a=ADD.get(i);if(a){qmul(a,GR[i],GR[i]);}
   const o=OV.get(i);if(o){qmul(o.q,gR[i],tq2);qlerp(GR[i],tq2,o.w,GR[i]);}}}
 // ---- write skin matrices (world * global * invBind) as 4 columns per joint
 const M=new Float32Array(16),Wm=new Float32Array(16);
 function writeRow(out,off,W){for(let i=0;i<nJ;i++){const q=GR[i],t=GT[i],s=rS[i];const x=q[0],y=q[1],z=q[2],w=q[3];
   M[0]=(1-2*(y*y+z*z))*s[0];M[1]=2*(x*y+z*w)*s[0];M[2]=2*(x*z-y*w)*s[0];M[3]=0;M[4]=2*(x*y-z*w)*s[1];M[5]=(1-2*(x*x+z*z))*s[1];M[6]=2*(y*z+x*w)*s[1];M[7]=0;M[8]=2*(x*z+y*w)*s[2];M[9]=2*(y*z-x*w)*s[2];M[10]=(1-2*(x*x+y*y))*s[2];M[11]=0;M[12]=t[0];M[13]=t[1];M[14]=t[2];M[15]=1;
   // tmp = M * IB_i ; res = W * tmp
   const ib=i*16,o=off+i*16;for(let c=0;c<4;c++){const b0=IB[ib+c*4],b1=IB[ib+c*4+1],b2=IB[ib+c*4+2],b3=IB[ib+c*4+3];
    const m0=M[0]*b0+M[4]*b1+M[8]*b2+M[12]*b3,m1=M[1]*b0+M[5]*b1+M[9]*b2+M[13]*b3,m2=M[2]*b0+M[6]*b1+M[10]*b2+M[14]*b3,m3=M[3]*b0+M[7]*b1+M[11]*b2+M[15]*b3;
    out[o+c*4]=W[0]*m0+W[4]*m1+W[8]*m2+W[12]*m3;out[o+c*4+1]=W[1]*m0+W[5]*m1+W[9]*m2+W[13]*m3;out[o+c*4+2]=W[2]*m0+W[6]*m1+W[10]*m2+W[14]*m3;out[o+c*4+3]=W[3]*m0+W[7]*m1+W[11]*m2+W[15]*m3;}}}
 // model axes: +x = left of the player, +y up, +z forward
 const Qx=(a)=>qax(1,0,0,a,[0,0,0,1]),Qz=(a)=>qax(0,0,1,a,[0,0,0,1]),Qy=(a)=>qax(0,1,0,a,[0,0,0,1]);
 const QQ=(a,b)=>qmul(a,b,[0,0,0,1]);
 // arm: hang down (from T-pose) then swing forward by b1 and bend elbow by b2; side = +1 left, -1 right
 function arm(side,b1,b2,out,w){const L=side>0?'.L':'.R';const down=Qz(-side*(Math.PI/2-out));const up=QQ(Qx(-b1),down),fo=QQ(Qx(-(b1+b2)),down);ov(J['upper_arm'+L],up,w);ov(J['forearm'+L],fo,w);ov(J['hand'+L],fo,w);}
 function leg(side,a1,a2,w){const L=side>0?'.L':'.R';ov(J['thigh'+L],Qx(-a1),w);ov(J['shin'+L],Qx(-(a1-a2)),w);ov(J['foot'+L],Qx(-(a1-a2)*.6),w);}
 // ---- main: pose player p into row
 function pose(p,m,t,out,off,W){resetRest();if(!(p.slide>0))p.slideMax=0;OV.clear();ADD.clear();accClear();
  const sp=Math.hypot(p.vx,p.vy),b=m.ball,gk=p.role==='GK';const u=((p.anim||0)/(Math.PI*2));
  const celeb=m.phase==='goal'&&p===m.celebrator,slide=p.slide>0,dive=p.diveT>0?p.diveT/.75:0;
  const M_r=k=>META[k]||{};
  // locomotion blend by real speed (no foot sliding: cycle follows p.anim which follows speed)
  const wI=Math.max(0,1-sp/1.0),wW=sp<1?sp:Math.max(0,1-(sp-1.8)/1.6),MR=has('runM'),wJ=sp<1.8?Math.max(0,(sp-1)/.8):Math.max(0,1-(sp-(MR?3.8:4.6))/(MR?1.2:1.8)),wR=MR?(sp<3.8?0:sp<5?(sp-3.8)/1.2:Math.max(0,1-(sp-6.6)/1)):0,wS=MR?Math.max(0,Math.min(1,(sp-6.6)/1)):Math.max(0,Math.min(1,(sp-4.4)/2));
  // حركة الرجلين حسب اتجاه الجري بالنسبة لاتجاه الجسم: لقدام، لورا، أو جنب (المدافع وهو بيراقب)
  const fwd=sp>.3?(p.vx*p.fx+p.vy*p.fy)/sp:1,lat=sp>.3?(p.vx*p.fy-p.vy*p.fx)/sp:0;const wB=has('jogB')?Math.max(0,Math.min(1,(-fwd-.25)/.5))*Math.min(1,sp/1.6):0,wSd=has('strL')?Math.max(0,Math.min(1,(Math.abs(lat)-.6)/.3))*(1-wB)*Math.min(1,sp/1.6)*(sp<6?1:0):0,wF=1-Math.max(wB,wSd);
  {if(has('offIdle')&&!gk){const q=(t/clips.offIdle.dur+(p.i||0)*.37)%2;accClip('offIdle',q<1?q:2-q,wI,false);}else accClip('idle',t/2.5+(p.i||0)*.17,wI,true);accClip('walk',u,wW*.8*wF,true);const dr=has('dribble')&&b.owner===p&&!b.inHands&&!m.restartKind&&sp>1.5,DM=META.dribble||{};const dW=dr?(p.dHi?0:Math.max(0,Math.min(1,(5.6-sp)/.8))):0,nd=1-dW;if(dW>0)accClip('dribble',((u*.5+(DM.ph||0)*.5)%1+1)%1,(wJ+wR+wS)*wF*dW,true);accClip('jog',u,wJ*wF*nd,true);if(MR){if(wR>0)accClip('runM',((u+(M_r('runM').ph||0))%1+1)%1,wR*wF*nd,true);if(wS>0)accClip('sprM',((u+(M_r('sprM').ph||0))%1+1)%1,wS*wF*nd,true);}else accClip('sprint',u,wS*wF*nd,true);
   if(wB>0)accClip('jogB',u,(1-wI)*wB,true);if(wSd>0)accClip(lat>0?'strR':'strL',u,(1-wI)*wSd,true);}
  if(gk&&!dive&&b.owner&&b.owner.team!==p.team&&sp<2.2&&Math.hypot(b.x-p.x,b.y-p.y)<24&&!(b.owner===p))accClip(has('gkIdle')?'gkIdle':'crouch',has('gkIdle')?t/4.6:t/2.93,1.2,true);
  if(p.stun>0&&!slide&&!dive&&!(p.stun>.4&&has('trip')))accClip('hit',1-Math.min(1,p.stun/.35),2,false);
  // ---- حركات الكورة الحقيقية (Mixamo): بتاخد الجسم كله
  let act=null,au=0,aw=0;const M_=k=>META[k]||{};
  const kk=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1;
  const smother=dive>0&&p.smT>0;
  if(slide&&has('slide')){const S=p.slideMax||(p.slideMax=Math.max(p.slide,.5));const q=1-p.slide/S;act='slide';au=.22+q*.5;aw=1;}
  else if(smother&&has('gkBlock')){act='gkBlock';p._smo=true;au=.25+(1-dive)*.35;aw=1;}
  else if(dive>0&&has('gkDiveL')){const yw=Math.atan2(p.fx,-p.fy),left=Math.sin(yw)*(p.diveDir||1)>0;act=left?'gkDiveL':'gkDiveR';p._dvL=left;p._smo=false;au=.2+(1-dive)*.28;aw=1;}
  else if(p.stun>.4&&p.fallK==='knock'&&has('knock')){act='knock';p._fallen=true;p._kS=Math.max(p._kS||0,p.stun);au=Math.min(.97,.05+(1-p.stun/Math.max(1.35,p._kS))*2.2);aw=1;}
  else if(p.stun>.4&&has('trip')){act='trip';p._fallen=p.stun>.7||p._fallen;au=.15+(1-Math.min(1,p.stun/1.2))*.5;aw=1;}
  else if(p.jumpT>0&&has('head')){if(p.hdrHi&&has('headJ')){act='headJ';au=.28+(1-p.jumpT/.45)*.3;}else{act='head';au=.3+(1-p.jumpT/.45)*.3;}aw=1;}
  else if(kk>=0&&has('kick')&&!(b.owner===p&&m.restartKind==='throw')&&!(gk&&p.puntT>0)){const pen=m.restartKind==='pen'||(m.pen&&m.pen.live);act=pen&&has('pen')?'pen':p.kType==='pass'&&has('pass')?'pass':p.kType==='shot'&&sp>3.2&&has('shotRun')?'shotRun':p.kType==='shot'&&has('kickM')?'kickM':'kick';const h=M_(act).hit||.5;const s0=Math.max(0,h-(act==='pen'?.5:.36)/clips[act].dur);au=kk<.5?s0+(h-s0)*(kk/.5):h+(1-h)*.8*((kk-.5)/.5);aw=1;}
  else if(gk&&p.puntT>0&&has('gkPunt')){const h=M_('gkPunt').hit||.5;au=h-.12+(1-p.puntT/.4)*.2;act='gkPunt';aw=1;}
  else if(((b.owner===p&&m.restartKind==='throw')||p.throwT>0)&&has('throwin')&&!gk){act='throwin';au=p.throwT>0?.52+(1-p.throwT/.4)*.18:.42;aw=1;}
  else if(gk&&p.throwT>0&&has('gkThrow')){act='gkThrow';au=.35+(1-p.throwT/.4)*.2;aw=1;}
  else if(gk&&p.gkHi>0&&!dive&&p.gkLeap&&has('gkLeap')){act='gkLeap';au=.3+(1-p.gkHi/.5)*.55;aw=1;}
  else if(gk&&p.gkHi>0&&!dive&&has('gkCatchHi')){act='gkCatchHi';au=.18+(1-p.gkHi/.5)*.5;aw=1;}
  else if(gk&&p.catchT>0&&!(p.gkHi>0)&&has('gkCatch')){act='gkCatch';au=.25+(1-p.catchT/.45)*.4;aw=1;}
  else if(gk&&b.owner===p&&b.inHands&&has('gkCatch')){act='gkCatch';au=.72;aw=1;}
  if(!(p.stun>.4))p._kS=0;
  // احتفال/حزن بعد الجول ونهاية الماتش (Mixamo: Victory, Cheering, Fist Pump, Defeated)
  if(!act&&!slide&&!dive&&sp<1.6&&(m.phase==='goal'||m.phase==='end')&&has('cheer')){let wt=null;if(m.phase==='goal')wt=m.celebrator&&m.celebrator.team;else{const sc=m.score;if(sc[0]!==sc[1])wt=m.t[sc[0]>sc[1]?0:1];}
   if(wt){const off=(p.i||0)*.37,lp=(c,a0,a1)=>{const d=clips[c].dur,q=((t+off*d)/((a1-a0)*d))%2;return a0+(a1-a0)*(q<1?q:2-q);};
    if(p.team===wt){const near=m.phase==='end'||(m.celebrator&&Math.hypot(m.celebrator.x-p.x,m.celebrator.y-p.y)<20);if(p===m.celebrator){act=p.i%2?'victory':'fistp';au=act==='victory'?lp('victory',.2,.68):lp('fistp',.05,.95);}else if(near&&!gk){act='cheer';au=lp('cheer',0,1);}}
    else{act='defeat';au=lp('defeat',.08,.9);}}}
  if(!act&&p.protT>0&&sp<1.3&&!gk&&has('protest')){act='protest';au=(t/clips.protest.dur+(p.i||0)*.13)%1*.96;}
  if(!act&&!gk&&sp<.4&&(p.i%3===1)&&has('fold')&&(m.restartKind==='fk'||m.restartKind==='pen'||(m.pen&&!m.pen.live))&&Math.hypot(b.x-p.x,b.y-p.y)>20)accClip('fold',(t/clips.fold.dur+(p.i||0)*.21)%1,3,true);
  if(!act&&p.upT>0&&p.upClip&&has(p.upClip)){act=p.upClip;au=p.upA+(p.upB-p.upA)*(1-p.upT/p.upD);}
  if(!act&&p.spinT>0&&has('spin')&&b.owner===p){act='spin';au=.2+(1-p.spinT/.55)*.55;}
  if(!act&&p.stopT>0&&has('stop')&&!gk&&b.owner!==p){const q=1-p.stopT/.6,fd=Math.min(1,p.stopT/.15)*Math.min(1,q/.1+.3);accClip('stop',.05+q*.85,fd*3*Math.max(.2,1-sp/3),false);}
  if(act){accClear();accClip(act,au,1,false);}
  p._act=act;
  accApply();
  // kicking leg (right) — wind-up, strike, follow-through
  const kick=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1;
  if(kick>=0&&!act){let a1,a2;if(kick<.4){a1=-.95*(kick/.4);a2=.5+1.2*(kick/.4);}else if(kick<.7){const q=(kick-.4)/.3;a1=-.95+2.2*q;a2=1.7-1.65*q;}else{const q=(kick-.7)/.3;a1=1.25-1.1*q;a2=.05+.2*q;}
   leg(-1,a1,a2,.95);arm(1,.5,.4,.25,.7);arm(-1,-.3,.4,.25,.7);add(J['spine.001'],Qx(kick>.3&&kick<.75?-.15:.06));}
  if(slide&&!act){leg(-1,.35,.05,1);leg(1,.55,1.1,1);arm(1,-.5,.3,.35,1);arm(-1,.6,.4,.3,1);}
  if(dive>0&&!act){const dH=p.diveH==null?1:p.diveH;arm(1,dH<.6?2.3:2.9,.05,.1,1);arm(-1,dH<.6?2.3:2.9,.05,.1,1);leg(1,.25,.3,.8);leg(-1,-.25,.3,.8);}
  const hands=gk&&((b.owner===p&&b.inHands)||p.catchT>0);
  if(gk&&p.gkHi>0&&!act&&!dive){const k=Math.sin(Math.PI*(1-p.gkHi/.5));arm(1,2.95,.12,.05,1);arm(-1,2.95,.12,.05,1);leg(1,.5*k,1.05*k,.7*k);leg(-1,.12*k,.45*k,.7*k);}
  else if(hands&&!(p.throwT>0)&&!act){arm(1,.5,.8,-.09,1);arm(-1,.5,.8,-.09,1);}
  else if(gk&&!dive&&b.shot&&b.shot.by.team!==p.team){arm(1,2.4,.15,.1,.8);arm(-1,2.4,.15,.1,.8);}
  const throwing=(b.owner===p&&m.restartKind==='throw')||p.throwT>0;
  if(throwing&&!act){const k=p.throwT>0?(1-p.throwT/.4):0;arm(1,2.75-k*1.6,1.3-k*1.1,-.03,1);arm(-1,2.75-k*1.6,1.3-k*1.1,-.03,1);}
  if(p.jumpT>0&&!slide&&!dive&&!act){const k=Math.sin(Math.PI*(1-p.jumpT/.45));arm(1,1.6*k,.3,.35,.8*k);arm(-1,1.6*k,.3,.35,.8*k);leg(1,.35*k,.9*k,.7*k);leg(-1,.15*k,.6*k,.7*k);}
  if(celeb&&!act){if(sp>1.5){arm(1,.15,.15,1.3,1);arm(-1,.15,.15,1.3,1);add(J['spine.001'],Qz(Math.sin(t*2.2)*.18));}
   else{const k=.5+.5*Math.sin(t*6);arm(1,2.7+k*.2,.35,.25,1);arm(-1,2.7+(1-k)*.2,.35,.25,1);add(J['spine.001'],Qx(-.12));}}
  if(!celeb&&!slide&&!dive&&kick<0&&!act)add(J['spine.001'],Qx(.02+Math.min(1,sp/7)*.12));
  computeGlobals();
  // world: lift/pitch/roll around a pivot, then yaw to facing
  const yaw=Math.atan2(p.fx,-p.fy);let lift=0,pitch=0,roll=0,piv=.95;
  if(slide&&!act){pitch=-1.15;piv=.35;lift=-.28;}
  if(dive>0&&!act){const dH=p.diveH==null?1:p.diveH;const k=Math.sin(Math.min(1,(1-dive)*1.6)*Math.PI*.5);const sideW=-(p.diveDir||1);const fs=Math.sign(-Math.sin(yaw)*0+Math.cos(yaw)*sideW)||1;roll=fs*(dH<.6?1.45:1.3)*k;lift=(.12+.32*Math.min(dH,2))*Math.sin((1-dive)*Math.PI)-.2*k;}
  if(gk&&p.gkHi>0&&!dive&&!act)lift+=.5*Math.sin(Math.PI*(1-p.gkHi/.5));
  if(p.jumpT>0&&!slide&&!dive)lift+=(act==='head'?.6:1)*.42*Math.sin(Math.PI*(1-p.jumpT/.45));
  const sc=p._hs||(p._hs=.95+((p.i*7919)%17)/170);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),spp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
  // R = Ry * Rx(pitch) * Rz(roll)
  const r00=cy*cr+sy*spp*sr,r01=-cy*sr+sy*spp*cr,r02=sy*cp,r10=cp*sr,r11=cp*cr,r12=-spp,r20=-sy*cr+cy*spp*sr,r21=sy*sr+cy*spp*cr,r22=cy*cp;
  // world = T(x, lift, -y) * T(0,piv,0) * R * T(0,-piv,0) * S
  W[0]=r00*sc;W[1]=r10*sc;W[2]=r20*sc;W[3]=0;W[4]=r01*sc;W[5]=r11*sc;W[6]=r21*sc;W[7]=0;W[8]=r02*sc;W[9]=r12*sc;W[10]=r22*sc;W[11]=0;
  W[12]=p.x-r01*piv;W[13]=lift+piv-r11*piv;W[14]=-p.y-r21*piv;W[15]=1;
  writeRow(out,off,W);}
 // position/orientation of a bind-pose point after skinning by joint j (used for the shirt number)
 function jointPoint(j,W,pt,o){const q=GR[j],t=GT[j];const v=[pt[0]-gT[j][0],pt[1]-gT[j][1],pt[2]-gT[j][2]];const ir=qinv(gR[j],[0,0,0,1]);qrot(ir,v,v);qrot(q,v,v);const x=v[0]+t[0],y=v[1]+t[1],z=v[2]+t[2];o[0]=W[0]*x+W[4]*y+W[8]*z+W[12];o[1]=W[1]*x+W[5]*y+W[9]*z+W[13];o[2]=W[2]*x+W[6]*y+W[10]*z+W[14];return o;}
 function jointDir(j,W,d,o){const ir=qinv(gR[j],[0,0,0,1]);const v=qrot(ir,d,[0,0,0]);qrot(GR[j],v,v);o[0]=W[0]*v[0]+W[4]*v[1]+W[8]*v[2];o[1]=W[1]*v[0]+W[5]*v[1]+W[9]*v[2];o[2]=W[2]*v[0]+W[6]*v[1]+W[10]*v[2];return o;}
 return{nJ,J,pose,jointPoint,jointDir,gT,rig:RIG,d64};})();
