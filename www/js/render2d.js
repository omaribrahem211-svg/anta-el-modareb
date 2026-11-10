// مسيرة نجم — رسم بديل ثنائي الأبعاد (للأجهزة اللي مافيهاش WebGL2)
'use strict';
Object.assign(Match.prototype,{
render(ctx,w,h){const cam=this.cam;if(cam.w!==w||cam.h!==h)cam.fit(w,h);const P=(x,y,z)=>cam.p(x,y,z||0);
  ctx.fillStyle='#070C1A';ctx.fillRect(0,0,w,h);
  const poly=(pts,fill)=>{ctx.beginPath();pts.forEach((q,i)=>{const s=P(q[0],q[1],q[2]);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
  // stands
  poly([[-60,W+6,0],[L+60,W+6,0],[L+60,W+34,20],[-60,W+34,20]],'#131A30');
  poly([[-60,W+34,20],[L+60,W+34,20],[L+60,W+36,30],[-60,W+36,30]],'#0B1022');
  const tt=performance.now()/1000,cheer=this.phase==='goal'?1:0;
  for(let i=0;i<CROWD.length;i++){const c=CROWD[i];const s=P(c.x,c.y,c.z+(cheer?Math.max(0,Math.sin(tt*14+c.ph))*.6:Math.sin(tt*2+c.ph)*.05));if(s.x<-4||s.x>w+4)continue;const sz=Math.max(1.4,.55*s.k);ctx.fillStyle=c.c;ctx.fillRect(s.x-sz/2,s.y-sz,sz,sz*1.3);}
  // floodlight glow strip
  poly([[-60,W+5.5,0],[L+60,W+5.5,0],[L+60,W+6,0.2],[-60,W+6,0.2]],'#0B1022');
  // surround grass
  poly([[-12,-10,0],[L+12,-10,0],[L+12,W+6,0],[-12,W+6,0]],'#1C5A30');
  // ad boards
  for(let x=-10;x<L+10;x+=15){const col=((x/15)|0)%2?'#0F1630':'#C6F432';poly([[x,W+3.6,0],[x+15,W+3.6,0],[x+15,W+3.6,1],[x,W+3.6,1]],col);const s=P(x+7.5,W+3.6,.5);if(s.x>-80&&s.x<w+80){ctx.fillStyle=col==='#C6F432'?'#0B1410':'#C6F432';ctx.font=`700 ${Math.max(8,.75*s.k)}px Changa`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('مسيرة نجم',s.x,s.y);}}
  // pitch stripes
  const N=18,sw=L/N;for(let i=0;i<N;i++)poly([[i*sw,0,0],[(i+1)*sw,0,0],[(i+1)*sw,W,0],[i*sw,W,0]],i%2?'#2F8C47':'#2A8141');
  poly([[-4,-4,0],[0,-4,0],[0,W+4,0],[-4,W+4,0]],'#277A3D');poly([[L,-4,0],[L+4,-4,0],[L+4,W+4,0],[L,W+4,0]],'#277A3D');
  // lines
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineCap='round';
  const line=(pts)=>{ctx.beginPath();let kk=0;pts.forEach((q,i)=>{const s=P(q[0],q[1],q[2]||0);kk+=s.k;i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.lineWidth=Math.max(1,.13*kk/pts.length);ctx.stroke();};
  const arc=(cx,cy,r,a0,a1,n)=>{const pts=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return pts;};
  line([[0,0],[L,0],[L,W],[0,W],[0,0]]);line([[CX,0],[CX,W]]);line(arc(CX,CY,9.15,0,Math.PI*2,48));
  for(const s of [0,1]){const gx=s?L:0,d=s?-1:1;line([[gx,CY-20.16],[gx+d*16.5,CY-20.16],[gx+d*16.5,CY+20.16],[gx,CY+20.16]]);line([[gx,CY-9.16],[gx+d*5.5,CY-9.16],[gx+d*5.5,CY+9.16],[gx,CY+9.16]]);
   const a=Math.acos(5.5/9.15);line(s?arc(L-11,CY,9.15,Math.PI-a,Math.PI+a,16):arc(11,CY,9.15,-a,a,16));
   const ps=P(gx+d*11,CY,0);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ps.x,ps.y,Math.max(1.2,.15*ps.k),Math.max(.8,.06*ps.k),0,0,7);ctx.fill();}
  const cs=P(CX,CY,0);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cs.x,cs.y,Math.max(1.2,.15*cs.k),Math.max(.8,.06*cs.k),0,0,7);ctx.fill();
  // goals back/net
  for(const s of [0,1])this.drawGoal(ctx,P,s);
  // shadows + rings
  const h0=this.human;
  for(const p of this.all){const g=P(p.x,p.y,0);if(g.x<-60||g.x>w+60)continue;const k=g.k*1.35;
   if(h0&&p===h0.ctrl){ctx.strokeStyle='#C6F432';ctx.lineWidth=Math.max(2,.09*k);ctx.beginPath();ctx.ellipse(g.x,g.y,.62*k,.22*k,0,0,7);ctx.stroke();}
   else if(p.star){ctx.strokeStyle='#F5C542';ctx.lineWidth=Math.max(1.5,.07*k);ctx.beginPath();ctx.ellipse(g.x,g.y,.55*k,.19*k,0,0,7);ctx.stroke();}
   ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(g.x+.18*k,g.y,.42*k,.13*k,0,0,7);ctx.fill();}
  const b=this.ball;{const g=P(b.x,b.y,0);const r=Math.max(2,.22*g.k*1.35);ctx.fillStyle=`rgba(0,0,0,${clamp(.35-b.z*.05,.08,.35)})`;ctx.beginPath();ctx.ellipse(g.x+b.z*.15*g.k,g.y,r*1.1,r*.45,0,0,7);ctx.fill();}
  // sorted bodies
  const list=this.all.concat((this.leave||[]).map(l=>l.p)).map(p=>({y:p.y,p}));list.push({y:b.y-.01,ball:true});list.sort((a,c)=>c.y-a.y);
  for(const it of list){if(it.ball)this.drawBall(ctx,P);else this.drawPl(ctx,P,it.p,w);}
  // goal front posts
  for(const s of [0,1])this.drawPosts(ctx,P,s);
  // labels
  if(h0&&h0.ctrl){const c=h0.ctrl,g=P(c.x,c.y,2.3*1.35),k=g.k;ctx.fillStyle='#C6F432';ctx.beginPath();ctx.moveTo(g.x,g.y+2);ctx.lineTo(g.x-6,g.y-7);ctx.lineTo(g.x+6,g.y-7);ctx.closePath();ctx.fill();
   ctx.font='700 12px Changa';ctx.textAlign='center';ctx.textBaseline='bottom';const nm=typeof lastName==='function'?lastName(c.name):c.name.split(' ').slice(-1)[0];const tw=ctx.measureText(nm).width+12;ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-tw/2,g.y-25,tw,17);ctx.fillStyle='#EEF2FF';ctx.fillText(nm,g.x,g.y-9);
   if(h0.charge>=0){const pw=Math.min(1,h0.charge);ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-26,g.y-36,52,8);ctx.fillStyle=pw>.85?'#FF5A5F':pw>.6?'#F5C542':'#C6F432';ctx.fillRect(g.x-25,g.y-35,50*pw,6);}
   if(h0.call>0){ctx.fillStyle='#F5C542';ctx.font='800 13px Changa';ctx.fillText('اطلب!',g.x,g.y-38);}}
  for(const p of this.all){if(!p.star||(h0&&p===h0.ctrl))continue;const g=P(p.x,p.y,2.25*1.35);ctx.fillStyle='#F5C542';ctx.font='800 13px Changa';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('★',g.x,g.y);}
  if(!this.demo)this.radar(ctx,w,h);},
drawGoal(ctx,P,s){const gx=s?L:0,gb=s?L+2:-2,y1=CY-GW/2,y2=CY+GW/2;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
  ctx.beginPath();for(let i=0;i<=10;i++){const y=y1+(y2-y1)*i/10;const a=P(gb,y,0),c=P(gb,y,GH*.85);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);const d=P(gx,y,GH);ctx.lineTo(d.x,d.y);}
  for(let j=0;j<=5;j++){const z=GH*.85*j/5;const a=P(gb,y1,z),c=P(gb,y2,z);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
  for(const y of [y1,y2])for(let j=0;j<=5;j++){const a=P(gx,y,GH*j/5),c=P(gb,y,GH*.85*j/5);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
  ctx.stroke();},
drawPosts(ctx,P,s){const gx=s?L:0,y1=CY-GW/2,y2=CY+GW/2;const a=P(gx,y1,0),b=P(gx,y1,GH),c=P(gx,y2,GH),d=P(gx,y2,0);ctx.strokeStyle='#FFFFFF';ctx.lineWidth=Math.max(2,.16*a.k);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();},
drawBall(ctx,P){const b=this.ball,g=P(b.x,b.y,b.z+.11);const r=Math.max(2.2,.22*g.k*1.35);ctx.fillStyle='#FAFAFA';ctx.beginPath();ctx.arc(g.x,g.y-r*.4,r,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#222';const a=b.spin;ctx.beginPath();ctx.arc(g.x+Math.cos(a)*r*.45,g.y-r*.4+Math.sin(a)*r*.3,r*.3,0,7);ctx.fill();ctx.beginPath();ctx.arc(g.x+Math.cos(a+2.5)*r*.5,g.y-r*.4+Math.sin(a+2.5)*r*.35,r*.22,0,7);ctx.fill();},
drawPl(ctx,P,p,w){const g=P(p.x,p.y,0);if(g.x<-60||g.x>w+60)return;const k=g.k*1.35;const t=p.team,kit=t.kit;const shirt=p.role==='GK'?t.gkKit:kit[0];
  const sp=hyp(p.vx,p.vy),sw=Math.sin(p.anim)*Math.min(1,sp/4);const x=g.x,y=g.y;
  let lean=p.slide>0?.6:0;const celeb=this.phase==='goal'&&p===this.celebrator;
  ctx.save();if(lean){ctx.translate(x,y);ctx.rotate((p.fx>=0?1:-1)*1.1);ctx.translate(-x,-y);}
  ctx.lineCap='round';
  const hipY=y-.86*k,shY=y-1.44*k,hdY=y-1.64*k;
  ctx.strokeStyle=kit[2];ctx.lineWidth=Math.max(1.6,.16*k);
  ctx.beginPath();ctx.moveTo(x-.08*k,hipY);ctx.lineTo(x-.08*k+sw*.3*k,y-.06*k);ctx.moveTo(x+.08*k,hipY);ctx.lineTo(x+.08*k-sw*.3*k,y-.06*k);ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-.08*k+sw*.3*k,y-.05*k,Math.max(1,.08*k),0,7);ctx.arc(x+.08*k-sw*.3*k,y-.05*k,Math.max(1,.08*k),0,7);ctx.fill();
  ctx.fillStyle=kit[1];ctx.fillRect(x-.21*k,hipY-.2*k,.42*k,.3*k);
  ctx.strokeStyle=shirt;ctx.lineWidth=Math.max(1.4,.12*k);ctx.beginPath();
  if(celeb){ctx.moveTo(x-.2*k,shY+.08*k);ctx.lineTo(x-.38*k,shY-.42*k);ctx.moveTo(x+.2*k,shY+.08*k);ctx.lineTo(x+.38*k,shY-.42*k);}
  else{ctx.moveTo(x-.21*k,shY+.08*k);ctx.lineTo(x-.3*k-sw*.18*k,shY+.5*k);ctx.moveTo(x+.21*k,shY+.08*k);ctx.lineTo(x+.3*k+sw*.18*k,shY+.5*k);}ctx.stroke();
  ctx.fillStyle=shirt;const tw=.46*k,th=.62*k;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x-tw/2,shY,tw,th,.09*k);else ctx.rect(x-tw/2,shY,tw,th);ctx.fill();
  if(k>13){ctx.fillStyle=lum(shirt)>.6?'#111':'#fff';ctx.font=`800 ${.3*k}px Changa`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.num,x,shY+.32*k);}
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(x,hdY,.155*k,0,7);ctx.fill();ctx.fillStyle=p.hair;ctx.beginPath();ctx.arc(x,hdY-.02*k,.16*k,Math.PI,0);ctx.fill();
  ctx.restore();},
radar(ctx,w,h){const rw=Math.min(132,w*.16),rh=rw*W/L,rx=(w-rw)/2,ry=h-rh-6;ctx.fillStyle='rgba(5,10,22,.42)';ctx.fillRect(rx,ry,rw,rh);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.strokeRect(rx+.5,ry+.5,rw-1,rh-1);ctx.beginPath();ctx.moveTo(rx+rw/2,ry);ctx.lineTo(rx+rw/2,ry+rh);ctx.stroke();
  const m=(x,y)=>[rx+x/L*rw,ry+(W-y)/W*rh];const h0=this.human;
  for(const p of this.all){const q=m(p.x,p.y);ctx.fillStyle=p.role==='GK'?p.team.gkKit:p.team.kit[0];const r=h0&&p===h0.ctrl?4:2.6;ctx.beginPath();ctx.arc(q[0],q[1],r,0,7);ctx.fill();if(h0&&p===h0.ctrl){ctx.strokeStyle='#C6F432';ctx.lineWidth=1.5;ctx.stroke();}}
  const q=m(this.ball.x,this.ball.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q[0],q[1],2,0,7);ctx.fill();}
});
