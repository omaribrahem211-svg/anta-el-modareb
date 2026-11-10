// مسيرة نجم — الرسم ثلاثي الأبعاد بـ WebGL2 (لاعيبة، ملعب، جمهور، إضاءة وظلال)
/* ================= 3D RENDERER (WebGL2) ================= */
const lin=c=>{let n=parseInt(String(c||'#888888').slice(1,7),16);if(!isFinite(n))n=0x888888;return[Math.pow(((n>>16)&255)/255,2.2),Math.pow(((n>>8)&255)/255,2.2),Math.pow((n&255)/255,2.2),1];};
const M4={
 mul(o,a,b){for(let c=0;c<4;c++){const b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];for(let r=0;r<4;r++)o[c*4+r]=a[r]*b0+a[4+r]*b1+a[8+r]*b2+a[12+r]*b3;}return o;},
 persp(o,fy,as,n,f){const t=1/Math.tan(fy/2);o.fill(0);o[0]=t/as;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
 ortho(o,l,r,b,t,n,f){o.fill(0);o[0]=2/(r-l);o[5]=2/(t-b);o[10]=-2/(f-n);o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);o[15]=1;return o;},
 look(o,e,c,u){let fx=c[0]-e[0],fy=c[1]-e[1],fz=c[2]-e[2];let l=Math.hypot(fx,fy,fz);fx/=l;fy/=l;fz/=l;let sx=fy*u[2]-fz*u[1],sy=fz*u[0]-fx*u[2],sz=fx*u[1]-fy*u[0];l=Math.hypot(sx,sy,sz);sx/=l;sy/=l;sz/=l;const ux=sy*fz-sz*fy,uy=sz*fx-sx*fz,uz=sx*fy-sy*fx;
  o[0]=sx;o[4]=sy;o[8]=sz;o[1]=ux;o[5]=uy;o[9]=uz;o[2]=-fx;o[6]=-fy;o[10]=-fz;o[3]=o[7]=o[11]=0;o[12]=-(sx*e[0]+sy*e[1]+sz*e[2]);o[13]=-(ux*e[0]+uy*e[1]+uz*e[2]);o[14]=fx*e[0]+fy*e[1]+fz*e[2];o[15]=1;return o;}
};
/* ---- geometry ---- */
function gBox(){const P=[],N=[],T=[],I=[];const F=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
 for(const [n,u,v] of F){const b=P.length/3;for(const [a,c,tu,tv] of [[-1,-1,0,1],[1,-1,1,1],[1,1,1,0],[-1,1,0,0]]){for(let i=0;i<3;i++)P.push(n[i]*.5+u[i]*.5*a+v[i]*.5*c);N.push(...n);T.push(tu,tv);}I.push(b,b+1,b+2,b,b+2,b+3);}return{P,N,T,I};}
function gCyl(S){const P=[],N=[],T=[],I=[];for(let i=0;i<=S;i++){const a=i/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);P.push(c*.5,-.5,s*.5,c*.5,.5,s*.5);N.push(c,0,s,c,0,s);T.push(i/S,1,i/S,0);}
 for(let i=0;i<S;i++){const a=i*2;I.push(a,a+1,a+3,a,a+3,a+2);}
 for(const y of [-.5,.5]){const b=P.length/3;P.push(0,y,0);N.push(0,Math.sign(y),0);T.push(.5,.5);for(let i=0;i<=S;i++){const a=i/S*Math.PI*2;P.push(Math.cos(a)*.5,y,Math.sin(a)*.5);N.push(0,Math.sign(y),0);T.push(.5,.5);}for(let i=0;i<S;i++)I.push(b,b+1+i,b+2+i);}return{P,N,T,I};}
function gSph(la,lo){const P=[],N=[],T=[],I=[];for(let j=0;j<=la;j++){const v=j/la,t=v*Math.PI;for(let i=0;i<=lo;i++){const u=i/lo,p=u*Math.PI*2;const x=Math.sin(t)*Math.cos(p),y=Math.cos(t),z=Math.sin(t)*Math.sin(p);P.push(x*.5,y*.5,z*.5);N.push(x,y,z);T.push(u,v);}}
 for(let j=0;j<la;j++)for(let i=0;i<lo;i++){const a=j*(lo+1)+i,b=a+lo+1;I.push(a,b,a+1,a+1,b,b+1);}return{P,N,T,I};}
function gLathe(prof,S){const P=[],N=[],T=[],I=[];const n=prof.length;
 for(let i=0;i<n;i++){const [r,y]=prof[i];const a=prof[Math.max(0,i-1)],b=prof[Math.min(n-1,i+1)];let dr=b[0]-a[0],dy=b[1]-a[1];let nr=dy,ny=-dr;const l=Math.hypot(nr,ny)||1;nr/=l;ny/=l;
  for(let j=0;j<=S;j++){const t=j/S*Math.PI*2,c=Math.cos(t),s=Math.sin(t);P.push(r*c,y,r*s);N.push(nr*c,ny,nr*s);T.push(j/S,i/(n-1));}}
 for(let i=0;i<n-1;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j,b=a+S+1;I.push(a,b,a+1,a+1,b,b+1);}return{P,N,T,I};}
const PROF={limb:[[0,-.5],[.3,-.48],[.45,-.42],[.5,-.3],[.5,.3],[.45,.42],[.3,.48],[0,.5]],
 thigh:[[0,-.5],[.28,-.48],[.36,-.4],[.4,-.2],[.47,.12],[.5,.32],[.45,.44],[.3,.49],[0,.5]],
 calf:[[0,-.5],[.24,-.48],[.29,-.4],[.31,-.15],[.44,.12],[.5,.28],[.45,.43],[.3,.49],[0,.5]],
 fore:[[0,-.5],[.3,-.47],[.35,-.35],[.41,0],[.5,.3],[.45,.44],[.3,.49],[0,.5]],
 torso:[[0,-.5],[.36,-.49],[.43,-.42],[.42,-.2],[.45,.04],[.5,.24],[.5,.35],[.45,.43],[.28,.49],[0,.5]],
 shorts:[[0,-.5],[.44,-.5],[.5,-.38],[.49,.1],[.46,.4],[.3,.49],[0,.5]],
 hair:[[.5,-.02],[.505,.12],[.47,.27],[.38,.39],[.24,.47],[0,.505]]};
function gPlane(){return{P:[-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5],N:[0,1,0,0,1,0,0,1,0,0,1,0],T:[0,0,1,0,1,1,0,1],I:[0,1,2,0,2,3]};}
function gQuad(){return{P:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],N:[0,0,1,0,0,1,0,0,1,0,0,1],T:[0,1,1,1,1,0,0,0],I:[0,1,2,0,2,3]};}
function gRing(S,ri){const P=[],N=[],T=[],I=[];for(let i=0;i<=S;i++){const a=i/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);P.push(c*ri,0,s*ri,c,0,s);N.push(0,1,0,0,1,0);T.push(0,0,1,1);}for(let i=0;i<S;i++){const a=i*2;I.push(a,a+1,a+3,a,a+3,a+2);}return{P,N,T,I};}

const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aT;
layout(location=3) in vec4 m0;layout(location=4) in vec4 m1;layout(location=5) in vec4 m2;layout(location=6) in vec4 m3;
layout(location=7) in vec4 iC;layout(location=8) in vec4 iU;
uniform mat4 uVP,uLVP;uniform float uTime,uWave;
out vec3 vN,vW;out vec4 vC;out vec2 vT;out vec4 vL;
void main(){mat4 M=mat4(m0,m1,m2,m3);vec4 w=M*vec4(aP,1.0);
 if(uWave>0.0){w.y+=max(0.0,sin(uTime*(9.0+iU.y*7.0)+iU.x*6.283))*0.45*uWave;}
 vW=w.xyz;vN=mat3(M)*aN;vC=iC;vT=aT*iU.zw+iU.xy;vL=uLVP*w;gl_Position=uVP*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vN,vW;in vec4 vC;in vec2 vT;in vec4 vL;
uniform sampler2D uTex;uniform sampler2DShadow uSh;uniform int uMode;uniform float uUnlit,uShOn,uTime,uWave;uniform vec3 uLd,uCam;uniform vec2 uShTex;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
float sh(vec3 n){if(uShOn<0.5)return 1.0;vec3 p=vL.xyz/vL.w*0.5+0.5;if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0)return 1.0;
 float b=0.0008+0.0025*(1.0-max(dot(n,uLd),0.0));float s=0.0;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture(uSh,vec3(p.xy+vec2(float(i),float(j))*uShTex,p.z-b));return s/9.0;}
void main(){vec4 base=vC;
 if(uMode==1){vec4 t=texture(uTex,vT);base.rgb*=t.rgb;}
 else if(uMode==2){vec4 t=texture(uTex,vT);if(t.a<0.04)discard;base=vec4(vec3(0.9),t.a*0.85);}
 else if(uMode==3){vec4 t=texture(uTex,vT);base=vec4(base.rgb*t.a,1.0);}
 else if(uMode==4){vec4 t=texture(uTex,vT);base=vec4(0.0,0.0,0.0,t.a*vC.a);}
 else if(uMode==6){vec2 uv=vT;float cx=floor(uv.x*40.0),cy=floor(uv.y*8.0);float hs=fract(sin(cx*12.9898+cy*78.233)*43758.5453);uv.y+=max(0.0,sin(uTime*(7.0+hs*6.0)+hs*6.283))*uWave*0.028;vec4 t=texture(uTex,uv);base.rgb*=t.rgb;}
 else if(uMode==7){vec4 t=texture(uTex,vT);if(t.a<0.5)discard;base.rgb=t.rgb;}
 else if(uMode==5){vec4 t=texture(uTex,vT);if(t.a<0.45)discard;base=vec4(mix(vec3(0.015),vC.rgb,t.r),1.0);}
 vec3 col;
 if(uUnlit>0.0){col=base.rgb*uUnlit;}
 else{vec3 n=normalize(vN);float d=max(dot(n,uLd),0.0);float s=sh(n);
  vec3 hemi=mix(vec3(0.07,0.09,0.07),vec3(0.30,0.34,0.46),n.y*0.5+0.5);
  vec3 v=normalize(uCam-vW);vec3 hv=normalize(uLd+v);float sp=pow(max(dot(n,hv),0.0),28.0)*0.18*s;
  col=base.rgb*(hemi+vec3(1.0,0.97,0.9)*1.9*d*(0.3+0.7*s))+sp;
  float fd=length(uCam-vW);col=mix(col,vec3(0.02,0.03,0.07),clamp((fd-120.0)/300.0,0.0,0.55));}
 if(uMode==3){o=vec4(col,1.0);return;}
 col=aces(col*1.08);col=pow(col,vec3(1.0/2.2));o=vec4(col,base.a);}`;
// شيدر اللاعيبة: لون الطقم/البشرة × تفاصيل التكستشر (ثنيات القماش، الوش، الجزمة)
const SFS=FS.replace('in vec4 vL;','in vec4 vL;flat in int vR;uniform vec3 uRN[8];uniform sampler2D uKit;uniform float uKitOn;').replace('void main(){vec4 base=vC;','void main(){vec4 base=vC;if(uMode==0&&uKitOn>0.5){vec3 kt=texture(uKit,vT).rgb;base.rgb*=min(kt/uRN[vR],vec3(2.2));}');
const DVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=3) in vec4 m0;layout(location=4) in vec4 m1;layout(location=5) in vec4 m2;layout(location=6) in vec4 m3;
uniform mat4 uLVP;void main(){gl_Position=uLVP*(mat4(m0,m1,m2,m3)*vec4(aP,1.0));}`;
const DFS=`#version 300 es
precision mediump float;void main(){}`;

const SVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in uvec4 aJ;layout(location=3) in vec4 aW;layout(location=4) in float aR;layout(location=5) in vec2 aU;
uniform mat4 uVP,uLVP;uniform highp sampler2D uBones;uniform int uNJ;uniform float uTime,uWave;
out vec3 vN,vW;out vec4 vC;out vec2 vT;out vec4 vL;flat out int vR;
mat4 bone(int r,int j){int x=j*4;return mat4(texelFetch(uBones,ivec2(x,r),0),texelFetch(uBones,ivec2(x+1,r),0),texelFetch(uBones,ivec2(x+2,r),0),texelFetch(uBones,ivec2(x+3,r),0));}
void main(){int r=gl_InstanceID;vec4 w4=aW/max(aW.x+aW.y+aW.z+aW.w,1e-4);
 mat4 S=bone(r,int(aJ.x))*w4.x+bone(r,int(aJ.y))*w4.y+bone(r,int(aJ.z))*w4.z+bone(r,int(aJ.w))*w4.w;
 vec4 w=S*vec4(aP,1.0);vW=w.xyz;vN=mat3(S)*aN;vR=int(aR+0.5);vC=texelFetch(uBones,ivec2(uNJ*4+vR,r),0);vT=vec2(aU.x,1.0-aU.y);vL=uLVP*w;gl_Position=uVP*w;}`;
const SDVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=2) in uvec4 aJ;layout(location=3) in vec4 aW;
uniform mat4 uLVP;uniform highp sampler2D uBones;
mat4 bone(int r,int j){int x=j*4;return mat4(texelFetch(uBones,ivec2(x,r),0),texelFetch(uBones,ivec2(x+1,r),0),texelFetch(uBones,ivec2(x+2,r),0),texelFetch(uBones,ivec2(x+3,r),0));}
void main(){int r=gl_InstanceID;vec4 w4=aW/max(aW.x+aW.y+aW.z+aW.w,1e-4);mat4 S=bone(r,int(aJ.x))*w4.x+bone(r,int(aJ.y))*w4.y+bone(r,int(aJ.z))*w4.z+bone(r,int(aJ.w))*w4.w;gl_Position=uLVP*(S*vec4(aP,1.0));}`;

class R3D{
 constructor(cv){const gl=cv.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('no webgl2');this.gl=gl;this.cv=cv;
  this.prog=this.mk(VS,FS);this.dprog=this.mk(DVS,DFS);
  const U=n=>gl.getUniformLocation(this.prog,n);this.u={VP:U('uVP'),LVP:U('uLVP'),Time:U('uTime'),Wave:U('uWave'),Tex:U('uTex'),Sh:U('uSh'),Mode:U('uMode'),Unlit:U('uUnlit'),ShOn:U('uShOn'),Ld:U('uLd'),Cam:U('uCam'),ShTex:U('uShTex')};
  this.du={LVP:gl.getUniformLocation(this.dprog,'uLVP')};
  this.aniso=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  this.G={box:this.geo(gBox()),cyl:this.geo(gCyl(10)),sph:this.geo(gSph(10,16)),ball:this.geo(gSph(14,22)),plane:this.geo(gPlane()),quad:this.geo(gQuad()),ring:this.geo(gRing(40,.78))};for(const k in PROF)this.G[k]=this.geo(gLathe(PROF[k],k==='torso'||k==='hair'?14:9));
  this.VP=new Float32Array(16);this.V=new Float32Array(16);this.Pm=new Float32Array(16);this.LVP=new Float32Array(16);this.LV=new Float32Array(16);this.LP=new Float32Array(16);this.tm=new Float32Array(16);
  this.Ld=[0,1,0];{const l=[-0.5,0.8,0.55],n=Math.hypot(...l);this.Ld=l.map(v=>v/n);}
  this.skin=null;try{if(typeof Skel!=='undefined'&&Skel)this.initSkin();}catch(e){console.warn('skin off',e);this.skin=null;}
  this.quality=2;this.mkTextures();this.mkStatic();this.shadowSize=0;this.ballR=new Float32Array([1,0,0,0,1,0,0,0,1]);this.frameN=0;
  // dynamic batches
  this.dyn={cyl:this.batch(this.G.cyl,500),box:this.batch(this.G.box,300),sph:this.batch(this.G.sph,120),ball:this.batch(this.G.ball,2),ring:this.batch(this.G.ring,4),glow:this.batch(this.G.quad,16),blob:this.batch(this.G.plane,44),limb:this.batch(this.G.limb,200),thigh:this.batch(this.G.thigh,60),calf:this.batch(this.G.calf,60),fore:this.batch(this.G.fore,60),torso:this.batch(this.G.torso,30),shorts:this.batch(this.G.shorts,30),hair:this.batch(this.G.hair,30),num:this.batch(this.G.quad,40),face:this.batch(this.G.quad,2)};
 }
 mk(vs,fs){const gl=this.gl;const c=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};const p=gl.createProgram();gl.attachShader(p,c(gl.VERTEX_SHADER,vs));gl.attachShader(p,c(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 geo(g){const gl=this.gl;const mkb=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b;};return{p:mkb(new Float32Array(g.P),gl.ARRAY_BUFFER),n:mkb(new Float32Array(g.N),gl.ARRAY_BUFFER),t:mkb(new Float32Array(g.T),gl.ARRAY_BUFFER),i:mkb(new Uint16Array(g.I),gl.ELEMENT_ARRAY_BUFFER),cnt:g.I.length};}
 initSkin(){const gl=this.gl,R=Skel.rig,d=Skel.d64;const sk={nJ:Skel.nJ,max:32};
  sk.prog=this.mk(SVS,SFS);sk.dprog=this.mk(SDVS,DFS);const U=n=>gl.getUniformLocation(sk.prog,n);
  sk.u={VP:U('uVP'),LVP:U('uLVP'),Time:U('uTime'),Wave:U('uWave'),Tex:U('uTex'),Sh:U('uSh'),Mode:U('uMode'),Unlit:U('uUnlit'),ShOn:U('uShOn'),Ld:U('uLd'),Cam:U('uCam'),ShTex:U('uShTex'),Bones:U('uBones'),NJ:U('uNJ'),RN:U('uRN'),Kit:U('uKit'),KitOn:U('uKitOn')};sk.rn=new Float32Array(24);(R.rnorm||[]).forEach((c,i)=>{sk.rn[i*3]=c[0];sk.rn[i*3+1]=c[1];sk.rn[i*3+2]=c[2];});for(let i=(R.rnorm||[]).length;i<8;i++){sk.rn[i*3]=sk.rn[i*3+1]=sk.rn[i*3+2]=1;}
  sk.du={LVP:gl.getUniformLocation(sk.dprog,'uLVP'),Bones:gl.getUniformLocation(sk.dprog,'uBones')};
  const mkb=(arr,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,arr,gl.STATIC_DRAW);return b;};
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,mkb(d(R.v,Float32Array),gl.ARRAY_BUFFER));gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
  gl.bindBuffer(gl.ARRAY_BUFFER,mkb(d(R.j,Uint8Array),gl.ARRAY_BUFFER));gl.enableVertexAttribArray(2);gl.vertexAttribIPointer(2,4,gl.UNSIGNED_BYTE,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,mkb(d(R.w,Uint8Array),gl.ARRAY_BUFFER));gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.UNSIGNED_BYTE,true,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,mkb(d(R.r,Uint8Array),gl.ARRAY_BUFFER));gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,1,gl.UNSIGNED_BYTE,false,0,0);
  if(R.uv){gl.bindBuffer(gl.ARRAY_BUFFER,mkb(d(R.uv,Float32Array),gl.ARRAY_BUFFER));gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,2,gl.FLOAT,false,0,0);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mkb(d(R.i,Uint16Array),gl.ELEMENT_ARRAY_BUFFER));gl.bindVertexArray(null);sk.vao=vao;sk.cnt=R.nI;
  sk.kitOn=0;if(R.uv&&typeof KIT_TEX!=='undefined'){const im=new Image();im.onload=()=>{try{sk.kit=this.tex(im,true);sk.kitOn=1;}catch(e){console.warn(e);}};im.src=KIT_TEX;}
  sk.texW=sk.nJ*4+8;sk.data=new Float32Array(sk.texW*4*sk.max);sk.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,sk.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,sk.texW,sk.max,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  sk.W=new Float32Array(16);sk.mat=new Float32Array(Skel.nJ*16);sk.n=0;this.skin=sk;}
 // لاعب بالموديل الجديد: الوضعية في صف من تكستشر العضم + ألوان الطقم + الرقم على الضهر
 skinPlayer(p,m,t){const sk=this.skin;if(sk.n>=sk.max)return;const row=sk.n++;const tc=this.teamCols(p.team),gk=p.role==='GK';
  if(!p._sk){p._sk=lin(p.skin);p._hr=lin(p.hair);}
  if(!isFinite(p.x)||!isFinite(p.y)){sk.n--;return;}if(!isFinite(p.fx)||!isFinite(p.fy)||(p.fx===0&&p.fy===0)){p.fx=p.team&&p.team.dir||1;p.fy=0;}if(!isFinite(p.anim))p.anim=0;if(!isFinite(p.ampS))p.ampS=0;
  Skel.pose(p,m,t,sk.mat,0,sk.W);{let ok=true;for(let i=0;i<sk.mat.length;i+=7)if(!isFinite(sk.mat[i])){ok=false;break;}if(!ok){// وضع آمن لو الحركة طلعت أرقام بايظة: اللاعب يفضل باين
   const sv=[p.kickT,p.windT,p.slide,p.diveT,p.jumpT,p.catchT,p.throwT,p.lungeT];p.kickT=p.windT=p.slide=p.diveT=p.jumpT=p.catchT=p.throwT=p.lungeT=0;p.anim=0;p.ampS=0;Skel.pose(p,m,t,sk.mat,0,sk.W);}}
  const o=row*sk.texW*4;sk.data.set(sk.mat,o);
  const cols=[p._sk,gk?tc.gk:tc.shirt,gk?tc.gks:tc.shorts,gk?tc.gk:tc.socks,p.star?lin('#F5C542'):[0.012,0.012,0.014,1],p._hr,gk?lin('#F5F5F5'):p._sk];
  cols.push([1,1,1,1]);for(let k=0;k<8;k++){const c=cols[k],q=o+(sk.nJ*4+k)*4;sk.data[q]=c[0];sk.data[q+1]=c[1];sk.data[q+2]=c[2];sk.data[q+3]=1;}
  // number on the back of the shirt, following spine.003
  const J=Skel.J,W=sk.W,P=Skel.jointPoint(J['spine.003'],W,Skel.rig.uv?[0,1.29,-0.128]:[0,1.36,-0.165],[0,0,0]),up=Skel.jointDir(J['spine.003'],W,[0,1,0],[0,0,0]),rt=Skel.jointDir(J['spine.003'],W,[1,0,0],[0,0,0]),bk=Skel.jointDir(J['spine.003'],W,[0,0,-1],[0,0,0]);
  const n=p.num%100,mo=this.tm,sx=Skel.rig.uv?-.2:.21,sy=.21;mo[0]=rt[0]*sx;mo[1]=rt[1]*sx;mo[2]=rt[2]*sx;mo[3]=0;mo[4]=up[0]*sy;mo[5]=up[1]*sy;mo[6]=up[2]*sy;mo[7]=0;mo[8]=bk[0];mo[9]=bk[1];mo[10]=bk[2];mo[11]=0;mo[12]=P[0];mo[13]=P[1];mo[14]=P[2];mo[15]=1;
  this.add(this.dyn.num,mo,lum(p.team.kit[0])>.6&&!gk?[0.02,0.02,0.03,1]:[1,1,1,1],[(n%10)/10,Math.floor(n/10)/10,.1,.1]);
  // وش اللاعب من صورة المستخدم (لنجمك بس)
  if(p.star&&window.FACE_IMG&&FACE_IMG.complete&&FACE_IMG.naturalWidth){if(this.faceSrc!==FACE_IMG.src){this.faceSrc=FACE_IMG.src;this.tFace=this.tex(FACE_IMG);}
   const H=J['head'],fp=Skel.jointPoint(H,W,Skel.rig.uv?[0,1.60,0.152]:[0,1.665,0.118],[0,0,0]),fu=Skel.jointDir(H,W,[0,1,0],[0,0,0]),fr=Skel.jointDir(H,W,[-1,0,0],[0,0,0]),fn=Skel.jointDir(H,W,[0,0,1],[0,0,0]);const fx=.17,fy=.21;
   mo[0]=fr[0]*fx;mo[1]=fr[1]*fx;mo[2]=fr[2]*fx;mo[3]=0;mo[4]=fu[0]*fy;mo[5]=fu[1]*fy;mo[6]=fu[2]*fy;mo[7]=0;mo[8]=fn[0];mo[9]=fn[1];mo[10]=fn[2];mo[11]=0;mo[12]=fp[0];mo[13]=fp[1];mo[14]=fp[2];mo[15]=1;this.add(this.dyn.face,mo,[1,1,1,1]);}}
 skinUpload(){const gl=this.gl,sk=this.skin;if(!sk.n)return;gl.bindTexture(gl.TEXTURE_2D,sk.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,sk.texW,sk.n,gl.RGBA,gl.FLOAT,sk.data,0);}
 batch(geo,max){const gl=this.gl;const b={geo,max,n:0,d:new Float32Array(max*24),vao:gl.createVertexArray(),ib:gl.createBuffer()};gl.bindVertexArray(b.vao);
  [[geo.p,0,3],[geo.n,1,3],[geo.t,2,2]].forEach(([buf,l,s])=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,s,gl.FLOAT,false,0,0);});
  gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);gl.bufferData(gl.ARRAY_BUFFER,b.d.byteLength,gl.DYNAMIC_DRAW);for(let i=0;i<6;i++){gl.enableVertexAttribArray(3+i);gl.vertexAttribPointer(3+i,4,gl.FLOAT,false,96,i*16);gl.vertexAttribDivisor(3+i,1);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geo.i);gl.bindVertexArray(null);return b;}
 add(b,m,c,u){if(b.n>=b.max)return;const o=b.n*24,d=b.d;for(let i=0;i<16;i++)d[o+i]=m[i];d[o+16]=c[0];d[o+17]=c[1];d[o+18]=c[2];d[o+19]=c[3]===undefined?1:c[3];if(u){d[o+20]=u[0];d[o+21]=u[1];d[o+22]=u[2];d[o+23]=u[3];}else{d[o+20]=0;d[o+21]=0;d[o+22]=1;d[o+23]=1;}b.n++;}
 up(b){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);gl.bufferSubData(gl.ARRAY_BUFFER,0,b.d,0,b.n*24);}
 draw(b){if(!b.n)return;const gl=this.gl;gl.bindVertexArray(b.vao);gl.drawElementsInstanced(gl.TRIANGLES,b.geo.cnt,gl.UNSIGNED_SHORT,0,b.n);}
 trs(x,y,z,ry,sx,sy,sz){const o=this.tm,c=Math.cos(ry),s=Math.sin(ry);o.fill(0);o[0]=c*sx;o[2]=-s*sx;o[5]=sy;o[8]=s*sz;o[10]=c*sz;o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o;}
 seg(A,B,sx,sz,S){const o=this.tm;let dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2];const len=Math.hypot(dx,dy,dz)||1e-4;dx/=len;dy/=len;dz/=len;
  let xx=dy*S[2]-dz*S[1],xy=dz*S[0]-dx*S[2],xz=dx*S[1]-dy*S[0];let xl=Math.hypot(xx,xy,xz);if(xl<1e-4){xx=1;xy=0;xz=0;xl=1;}xx/=xl;xy/=xl;xz/=xl;
  const zx=xy*dz-xz*dy,zy=xz*dx-xx*dz,zz=xx*dy-xy*dx;
  o[0]=xx*sx;o[1]=xy*sx;o[2]=xz*sx;o[3]=0;o[4]=dx*len;o[5]=dy*len;o[6]=dz*len;o[7]=0;o[8]=zx*sz;o[9]=zy*sz;o[10]=zz*sz;o[11]=0;o[12]=(A[0]+B[0])/2;o[13]=(A[1]+B[1])/2;o[14]=(A[2]+B[2])/2;o[15]=1;return o;}
 tex(cv,rep){const gl=this.gl;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,cv);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);const w=rep?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
  if(this.aniso)gl.texParameterf(gl.TEXTURE_2D,this.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return t;}
 mkTextures(){const C=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  // pitch
  const M=3,PW=L+M*2,PH=W+M*2,S=2048/PW,cw=2048,ch=Math.round(PH*S);const pc=C(cw,ch),g=pc.getContext('2d');
  const X=x=>(x+M)*S,Y=y=>(W-y+M)*S;g.fillStyle='#2b6e2f';g.fillRect(0,0,cw,ch);
  const N=20,sw=L/N;for(let i=-1;i<=N;i++){const gr=g.createLinearGradient(0,0,0,ch);if(i%2){gr.addColorStop(0,'#357d37');gr.addColorStop(.5,'#3a853a');gr.addColorStop(1,'#347b36');}else{gr.addColorStop(0,'#27652b');gr.addColorStop(.5,'#2a6a2d');gr.addColorStop(1,'#26632a');}g.fillStyle=gr;g.fillRect(X(i*sw),0,sw*S+1,ch);}
  for(let i=0;i<160000;i++){const x=Math.random()*cw,y=Math.random()*ch,k=Math.random();g.fillStyle=k<.45?'rgba(10,30,8,0.10)':k<.85?'rgba(120,170,90,0.07)':'rgba(170,150,80,0.06)';g.fillRect(x,y,1,1+Math.random()*2.5);}
  for(let i=0;i<40;i++){const x=Math.random()*cw,y=Math.random()*ch,r=30+Math.random()*90;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(80,60,20,0.07)');gr.addColorStop(1,'rgba(80,60,20,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
  const goalWear=(gx)=>{const gr=g.createRadialGradient(X(gx),Y(CY),0,X(gx),Y(CY),7*S);gr.addColorStop(0,'rgba(120,95,40,0.28)');gr.addColorStop(1,'rgba(120,95,40,0)');g.fillStyle=gr;g.fillRect(X(gx)-7*S,Y(CY)-7*S,14*S,14*S);};goalWear(2.5);goalWear(L-2.5);
  g.strokeStyle='rgba(248,250,245,0.95)';g.lineWidth=0.14*S;g.lineCap='round';
  const ln=(pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));g.stroke();};
  ln([[0,0],[L,0],[L,W],[0,W],[0,0]]);ln([[CX,0],[CX,W]]);g.beginPath();g.arc(X(CX),Y(CY),9.15*S,0,Math.PI*2);g.stroke();
  for(const s of [0,1]){const gx=s?L:0,d=s?-1:1;ln([[gx,CY-20.16],[gx+d*16.5,CY-20.16],[gx+d*16.5,CY+20.16],[gx,CY+20.16]]);ln([[gx,CY-9.16],[gx+d*5.5,CY-9.16],[gx+d*5.5,CY+9.16],[gx,CY+9.16]]);
   const a=Math.acos(5.5/9.15);g.beginPath();if(s)g.arc(X(L-11),Y(CY),9.15*S,Math.PI-a,Math.PI+a);else g.arc(X(11),Y(CY),9.15*S,-a,a);g.stroke();
   g.fillStyle='#fff';g.beginPath();g.arc(X(gx+d*11),Y(CY),0.16*S,0,7);g.fill();
   for(const cy of [0,W]){g.beginPath();g.arc(X(gx),Y(cy),1*S,0,7);g.stroke();}}
  g.fillStyle='#fff';g.beginPath();g.arc(X(CX),Y(CY),0.16*S,0,7);g.fill();
  this.tPitch=this.tex(pc);this.pitchM=M;
  // surround
  const sc=C(256,256),s2=sc.getContext('2d');s2.fillStyle='#1f5a30';s2.fillRect(0,0,256,256);for(let i=0;i<5000;i++){s2.fillStyle=Math.random()<.5?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.05)';s2.fillRect(Math.random()*256,Math.random()*256,1,2);}this.tSur=this.tex(sc,true);
  // net
  const nc=C(64,64),n2=nc.getContext('2d');n2.strokeStyle='rgba(255,255,255,1)';n2.lineWidth=3;n2.strokeRect(0,0,64,64);this.tNet=this.tex(nc,true);
  // ads
  const ac=C(2048,64),a2=ac.getContext('2d');const ads=[['#C6F432','#0B1410','مسيرة نجم'],['#0F1630','#C6F432','MASIRET NAGM'],['#E53935','#FFFFFF','الكورة حياة'],['#0F1630','#F5C542','من الرابعة للقمة'],['#1E88E5','#FFFFFF','مسيرة نجم'],['#F5C542','#0B1410','العب بشغف'],['#0F1630','#FFFFFF','MASIRET NAGM'],['#2E7D32','#FFFFFF','مسيرة نجم']];
  ads.forEach((a,i)=>{a2.fillStyle=a[0];a2.fillRect(i*256,0,256,64);a2.fillStyle=a[1];a2.font='800 34px Changa, sans-serif';a2.textAlign='center';a2.textBaseline='middle';a2.fillText(a[2],i*256+128,34);});this.tAds=this.tex(ac,true);this.adsCanvas=ac;
  // ball
  const bc=C(256,128),b2=bc.getContext('2d');b2.fillStyle='#f4f4f4';b2.fillRect(0,0,256,128);b2.fillStyle='#151515';for(let j=0;j<4;j++)for(let i=0;i<6;i++){const x=(i+(j%2)*.5)*256/6,y=(j+.5)*128/4;b2.beginPath();for(let k=0;k<5;k++){const a=k/5*Math.PI*2-Math.PI/2;const r=13*(j===0||j===3?.7:1);b2.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}b2.fill();}this.tBall=this.tex(bc,true);
  // glow
  const gc=C(128,128),g2=gc.getContext('2d');const gr=g2.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.2,'rgba(255,250,230,.55)');gr.addColorStop(1,'rgba(255,240,200,0)');g2.fillStyle=gr;g2.fillRect(0,0,128,128);this.tGlow=this.tex(gc);
  // shirt numbers atlas
  const na=C(1280,1280),nx=na.getContext('2d');nx.font='800 92px Changa, sans-serif';nx.textAlign='center';nx.textBaseline='middle';nx.lineJoin='round';for(let k=0;k<100;k++){const x=(k%10)*128+64,y=Math.floor(k/10)*128+68;nx.lineWidth=12;nx.strokeStyle='#000';nx.strokeText(String(k),x,y);nx.fillStyle='#fff';nx.fillText(String(k),x,y);}this.tNum=this.tex(na);
  // white
  const wc=C(4,4),w2=wc.getContext('2d');w2.fillStyle='#fff';w2.fillRect(0,0,4,4);this.tWhite=this.tex(wc);
  // الجمهور: صورة فيها صفوف ناس (راس وكتاف وإيدين) بتتكرر على المدرجات، أخف وأحلى من آلاف المكعبات
  const CW=1024,CH=512,NX=40,NY=8,cw2=CW/NX,ch2=CH/NY;const cc=C(CW,CH),q=cc.getContext('2d');q.fillStyle='#161b2a';q.fillRect(0,0,CW,CH);
  const shirts=['#8a2f2f','#a0903f','#c9c7c0','#33507a','#202022','#2e2e36','#45454f','#6a5440','#4e5a66','#7a7a80','#a33c3c','#e0dbd2','#2a3a58','#463a30','#b0a48f','#24361f','#c6f432','#d65a1f'];
  const skins=['#e8c39e','#d6a77a','#b9835a','#8d5a3b','#6b4029'],hairs=['#141414','#2a1d14','#3b2a1e','#5a4632','#0c0c0c','#7a7a7a'];
  for(let j=0;j<NY;j++){q.fillStyle=j%2?'#1b2133':'#141a29';q.fillRect(0,j*ch2+ch2*.78,CW,ch2*.22);
   for(let i=0;i<NX;i++){if(Math.random()<.08)continue;const x=i*cw2+cw2/2+(Math.random()-.5)*4,yb=j*ch2+ch2*.86,sc=.85+Math.random()*.3;const sh=shirts[(Math.random()*shirts.length)|0];
    q.fillStyle=sh;q.beginPath();q.moveTo(x-cw2*.42*sc,yb);q.quadraticCurveTo(x-cw2*.44*sc,yb-ch2*.42*sc,x-cw2*.18*sc,yb-ch2*.47*sc);q.lineTo(x+cw2*.18*sc,yb-ch2*.47*sc);q.quadraticCurveTo(x+cw2*.44*sc,yb-ch2*.42*sc,x+cw2*.42*sc,yb);q.closePath();q.fill();
    if(Math.random()<.18){q.strokeStyle=sh;q.lineWidth=cw2*.16;q.lineCap='round';q.beginPath();q.moveTo(x-cw2*.3*sc,yb-ch2*.4*sc);q.lineTo(x-cw2*.42*sc,yb-ch2*.86*sc);q.stroke();}
    const hy=yb-ch2*.6*sc,hr=cw2*.2*sc;q.fillStyle=skins[(Math.random()*skins.length)|0];q.beginPath();q.arc(x,hy,hr,0,Math.PI*2);q.fill();
    q.fillStyle=hairs[(Math.random()*hairs.length)|0];q.beginPath();q.arc(x,hy-hr*.25,hr*1.02,Math.PI*1.05,Math.PI*1.95);q.fill();
    q.fillStyle='rgba(0,0,0,0.25)';q.fillRect(x-cw2*.42*sc,yb-ch2*.08,cw2*.84*sc,ch2*.08);}}
  this.tCrowd=this.tex(cc,true);this.crowdNX=NX;this.crowdNY=NY;}
 refreshAds(){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.tAds);}
 mkStatic(){const gl=this.gl;
  const st={plane:this.batch(this.G.plane,4),box:this.batch(this.G.box,9000),crowd:this.batch(this.G.box,7000),cyl:this.batch(this.G.cyl,40),ads:this.batch(this.G.quad,60),lamp:this.batch(this.G.box,40)};this.st=st;
  const M=this.pitchM;
  this.add(st.plane,this.trs(CX,0,-CY,0,L+M*2,1,W+M*2),[0.5,0.4,0.36,1]);
  this.surMat=new Float32Array(this.trs(CX,-0.02,-CY,0,L+90,1,W+70));
  // stands
  const concrete=lin('#1d2335'),seat=lin('#232c48'),seat2=lin('#1a2340'),roof=lin('#0c1020'),tower=lin('#2a3040');
  const crowdCols=['#7a2b2b','#8a7a3a','#b8b8b4','#2f4a72','#1c1c1e','#2a2a30','#3b3b44','#5a4636','#46505a','#6b6b70','#8c3a3a','#d0ccc4','#24324a','#3a2f28','#9a8f80','#1e2a1e'].map(lin);
  const skin=['#F1C27D','#E0AC69','#C68642','#8D5524'].map(lin);
  const HS=typeof STAD!=='undefined';
  if(!HS){const rows=20;for(let r=0;r<rows;r++){const y=W+6.5+r*1.05,h=0.6+r*0.62;this.add(st.box,this.trs(CX,h/2,-y,0,L+70,h,1.05),r%2?seat:seat2);}
  this.add(st.box,this.trs(CX,0.6+rows*0.62+3,-(W+6.5+rows*1.05+.5),0,L+70,7,1.2),concrete);
  this.add(st.box,this.trs(CX,0.6+rows*0.62+7.2,-(W+6.5+rows*1.05*.55),0,L+74,0.6,rows*1.05+6),roof);
  this.add(st.lamp,this.trs(CX,0.6+rows*0.62+6.8,-(W+6.5),0,L+74,0.25,0.4),[3.2,3.1,2.8,1]);
  // end stands
  }
  if(!HS)  for(const s of [0,1]){for(let r=0;r<13;r++){const off=8+r*1.05,x=s?L+off:-off,h=0.6+r*0.6;this.add(st.box,this.trs(x,h/2,-CY,Math.PI/2,W+30,h,1.05),r%2?seat:seat2);}
   const bx=s?L+8+13*1.05:-(8+13*1.05);this.add(st.box,this.trs(bx,4.5,-CY,0,1.2,9,W+30),concrete);}
  // ad boards
  for(let x=-4;x<L+4;x+=12){this.add(st.ads,this.trs(x+6,0.5,-(W+3.2),0,12,1,1),[1,1,1,1],[((x/12)|0)*0.125,0,0.125*1.0,1]);this.add(st.box,this.trs(x+6,0.5,-(W+3.35),0,12,1,0.2),concrete);}
  for(const s of [0,1])for(let y=-2;y<W+2;y+=12){const x=s?L+4:-4,ry=s?-Math.PI/2:Math.PI/2;this.add(st.ads,this.trs(x,0.5,-(y+6),ry,12,1,1),[1,1,1,1],[(((y/12)|0)+3)*0.125,0,0.125,1]);}
  // dugouts
  // floodlight towers
  this.lamps=[];if(HS){this.mkStad();}else for(const [x,y] of [[-18,W+20],[L+18,W+20],[-18,-14],[L+18,-14]]){this.add(st.cyl,this.trs(x,19,-y,0,1.1,38,1.1),tower);this.add(st.box,this.trs(x,38.5,-y,Math.atan2(CY-y,CX-x),2,3.4,6.5),tower);this.add(st.lamp,this.trs(x+(CX-x)*0.025,38.5,-y-(CY-y)*0.025,Math.atan2(CY-y,CX-x),1.9,3,6.2),[4,3.9,3.5,1]);this.lamps.push([x+(CX-x)*0.04,38.5,-y-(CY-y)*0.04]);}
  // goals
  const white=lin('#F4F6F8');this.goalNet=[];
  for(const s of [0,1]){const gx=s?L:0,gb=s?L+2.5:-2.5,y1=CY-GW/2,y2=CY+GW/2,r=0.15;
   this.add(st.cyl,this.seg([gx,0,-y1],[gx,GH+r/2,-y1],r,r,[1,0,0]),white);this.add(st.cyl,this.seg([gx,0,-y2],[gx,GH+r/2,-y2],r,r,[1,0,0]),white);this.add(st.cyl,this.seg([gx,GH,-y1+r/2],[gx,GH,-y2-r/2],r,r,[1,0,0]),white);
   const gr=lin('#9aa0a6');this.add(st.cyl,this.seg([gb,0,-y1],[gb,GH*.8,-y1],.05,.05,[1,0,0]),gr);this.add(st.cyl,this.seg([gb,0,-y2],[gb,GH*.8,-y2],.05,.05,[1,0,0]),gr);this.add(st.cyl,this.seg([gb,GH*.8,-y1],[gb,GH*.8,-y2],.05,.05,[1,0,0]),gr);
   this.add(st.cyl,this.seg([gx,GH,-y1],[gb,GH*.8,-y1],.05,.05,[0,0,1]),gr);this.add(st.cyl,this.seg([gx,GH,-y2],[gb,GH*.8,-y2],.05,.05,[0,0,1]),gr);
   this.goalNet.push([[gb,0,-y1],[gb,0,-y2],[gb,GH*.8,-y2],[gb,GH*.8,-y1]],[[gx,GH,-y1],[gx,GH,-y2],[gb,GH*.8,-y2],[gb,GH*.8,-y1]],[[gx,0,-y1],[gb,0,-y1],[gb,GH*.8,-y1],[gx,GH,-y1]],[[gx,0,-y2],[gb,0,-y2],[gb,GH*.8,-y2],[gx,GH,-y2]]);}
  // net geometry
  const P=[],Nn=[],T=[],I=[];for(const q of this.goalNet){const b=P.length/3;q.forEach(p=>{P.push(...p);Nn.push(0,1,0);});const d01=Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1],q[1][2]-q[0][2]),d03=Math.hypot(q[3][0]-q[0][0],q[3][1]-q[0][1],q[3][2]-q[0][2]);const k=5;T.push(0,0,d01*k,0,d01*k,d03*k,0,d03*k);I.push(b,b+1,b+2,b,b+2,b+3);}
  this.netB=this.batch(this.geo({P,N:Nn,T,I}),1);const idm=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);this.add(this.netB,idm,[1,1,1,1]);
  for(const k in st)this.up(st[k]);this.up(this.netB);
  this.sur=this.batch(this.G.plane,1);this.add(this.sur,this.surMat,[1,1,1,1],[0,0,40,30]);this.up(this.sur);
  if(!HS){const P=[],N=[],T=[],I=[];const NX=this.crowdNX,NY=this.crowdNY;
   const quad=(a,b,c,d,us,vs)=>{const o=P.length/3;for(const v of [a,b,c,d])P.push(...v);const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n)||1;n=n.map(x=>Math.abs(x/l)*(x<0&&n[1]<0?-1:1));for(let k=0;k<4;k++)N.push(0,.8,.6);T.push(0,vs,us,vs,us,0,0,0);I.push(o,o+1,o+2,o,o+2,o+3);};
   const r0=W+6.5,r1=W+6.5+19*1.05,h0=0.6+0.05,h1=0.6+19*0.62+0.95;
   quad([-32,h0,-r0],[L+32,h0,-r0],[L+32,h1,-r1],[-32,h1,-r1],(L+64)/0.72/NX,20/NY);
   for(const sd of [0,1]){const x0=sd?L+8:-8,x1=sd?L+8+12*1.05:-(8+12*1.05),e0=0.65,e1=0.6+12*0.6+0.95;
    quad([x0,e0,-(W+12)],[x0,e0,12],[x1,e1,12],[x1,e1,-(W+12)],(W+24)/0.75/NX,13/NY);}
   this.G.crowdS=this.geo({P,N,T,I});this.crowdS=this.batch(this.G.crowdS,1);this.add(this.crowdS,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),[0.95,0.95,0.95,1]);this.up(this.crowdS);}
  this.crowdCount=st.crowd.n;}
 // الاستاد: الهيكل من الموديل + جمهور قاعد على كل كرسي (كارت من صورة الجمهور)
 mkStad(){const S=STAD,sc=1/S.sc,dec=b=>{const r=atob(b),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u.buffer;};this.stadB=[];
  for(const pt of S.parts){const P16=new Int16Array(dec(pt.p)),N8=new Int8Array(dec(pt.n)),I=new Uint16Array(dec(pt.i));const P=new Float32Array(P16.length),N=new Float32Array(N8.length);for(let i=0;i<P.length;i++){P[i]=P16[i]*sc;N[i]=N8[i]/127;}
   const g=this.geo({P,N,T:new Float32Array(pt.nv*2),I});const b=this.batch(g,1);const mt=S.mats[pt.m];const e=mt.e[0]+mt.e[1]+mt.e[2]>0;this.add(b,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),e?[mt.c[0]*3,mt.c[1]*3,mt.c[2]*3,1]:[mt.c[0],mt.c[1],mt.c[2],1]);this.up(b);b.emis=e;this.stadB.push(b);}
  for(let k=0;k<S.lights.length;k+=3)this.lamps.push(S.lights[k]);
  // جمهور: كارت لكل كرسي (حوالي 88% من الكراسي مليانة)
  const ST=new Int16Array(dec(S.seats)),NX=this.crowdNX,NY=this.crowdNY;let rs=12345;const rnd=()=>{rs=(rs*1103515245+12345)&0x7fffffff;return rs/0x7fffffff;};
  let P=[],N=[],T=[],I=[];this.crowdS=[];const flush=()=>{if(!I.length)return;const b=this.batch(this.geo({P,N,T,I}),1);this.add(b,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),[0.95,0.95,0.95,1]);this.up(b);this.crowdS.push(b);P=[];N=[];T=[];I=[];};
  for(let k=0;k<S.ns;k++){if(rnd()<.12)continue;const x=ST[k*5]*sc,y=ST[k*5+1]*sc,z=ST[k*5+2]*sc,yw=ST[k*5+3]/127*Math.PI;const fx=Math.sin(yw),fz=Math.cos(yw),rx=fz,rz=-fx,hw=.36,h=1.05,y0=y-.12,cx=x-fx*.05,cz=z-fz*.05;
   const o=P.length/3;P.push(cx-rx*hw,y0,cz-rz*hw,cx+rx*hw,y0,cz+rz*hw,cx+rx*hw,y0+h,cz+rz*hw,cx-rx*hw,y0+h,cz-rz*hw);for(let q=0;q<4;q++)N.push(fx*.6,.8,fz*.6);
   const ci=(rnd()*NX)|0,cj=(rnd()*NY)|0,u0=ci/NX+.002,u1=(ci+1)/NX-.002,v0=cj/NY+.01,v1=(cj+.93)/NY;T.push(u0,v1,u1,v1,u1,v0,u0,v0);I.push(o,o+1,o+2,o,o+2,o+3);if(P.length/3>64000)flush();}
  flush();}
 shadowSetup(size){const gl=this.gl;if(this.shadowSize===size)return;this.shadowSize=size;if(this.shTex)gl.deleteTexture(this.shTex);if(this.shFB)gl.deleteFramebuffer(this.shFB);
  this.shTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shTex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,size,size);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  this.shFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 teamCols(t){if(!t._c)t._c={shirt:lin(t.kit[0]),shorts:lin(t.kit[1]),socks:lin(t.kit[2]),gk:lin(t.gkKit),gks:lin('#1B1B1B')};return t._c;}
 player(p,m){const D=this.dyn,th=Math.atan2(p.fy,p.fx),c=Math.cos(th),s=Math.sin(th);const F=[c,0,-s],S0=[s,0,c],X=p.x,Z=-p.y;
  const tc=this.teamCols(p.team),gk=p.role==='GK';const shirt=gk?tc.gk:tc.shirt,shorts=gk?tc.gks:tc.shorts,socks=gk?tc.gk:tc.socks;
  if(!p._sk){p._sk=lin(p.skin);p._hr=lin(p.hair);}const skin=p._sk,hair=p._hr,boot=p.star?lin('#F5C542'):[0.012,0.012,0.014,1],glove=lin('#F5F5F5');
  const sp=Math.hypot(p.vx,p.vy),amp=p.ampS!=null?p.ampS:clamp(sp/7,0,1),ph=p.anim;const gw=clamp((amp-.03)/.14,0,1);const slide=p.slide>0,celeb=m.phase==='goal'&&p===m.celebrator;
  const b=m.ball,throwing=(b.owner===p&&m.restartKind==='throw')||p.throwT>0,kick=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1,dive=p.diveT>0?p.diveT/.75:0;
  const dH=p.diveH==null?1:p.diveH,hands=gk&&((b.owner===p&&b.inHands)||p.catchT>0),crouch=gk&&!hands&&!(dive>0)&&b.owner&&b.owner.team!==p.team&&sp<2.2&&Math.hypot(b.x-p.x,b.y-p.y)<24;
  // root rotation: pitch (slide) around side axis, roll (GK dive) around forward axis
  let ap=0,ar=0,lift=0,piv=.95;if(slide){ap=-1.15;piv=.35;lift=-.28;}
  if(dive>0){const dz=-(p.diveDir||1);const sg=Math.sign(S0[2]*dz)||1;const k=Math.sin(Math.min(1,(1-dive)*1.6)*Math.PI*.5);ar=sg*(dH<.6?1.45:1.3)*k;lift=(.12+.32*Math.min(dH,2))*Math.sin((1-dive)*Math.PI)+(-.2*k);}
  if(p.jumpT>0&&!slide&&!(dive>0))lift+=.42*Math.sin(Math.PI*(1-p.jumpT/.45));
  const cp=Math.cos(ap),spp=Math.sin(ap),cr=Math.cos(ar),sr=Math.sin(ar);
  const P=(f,u,sd)=>{const du=u-piv;const f1=f*cp-du*spp,u1=f*spp+du*cp;const s2=sd*cr-u1*sr,u2=sd*sr+u1*cr;return[X+F[0]*f1+S0[0]*s2,u2+piv+lift,Z+F[2]*f1+S0[2]*s2];};
  const Sd=(()=>{const a=P(0,piv,0),b2=P(0,piv,1);return[b2[0]-a[0],b2[1]-a[1],b2[2]-a[2]];})();
  const SEG=(bt,A,B,w,d,col)=>this.add(bt,this.seg(A,B,w,d,Sd),col);
  // ----- legs -----
  const legs=[];let drop=0;
  for(const k of [1,-1]){const phi=ph+(k>0?0:Math.PI);let a1=Math.sin(phi)*.78*amp,a2=amp*(.15+1.15*Math.max(0,-Math.cos(phi-.45)))+.12;
   if(!slide&&!celeb&&gw<1){a1=k*.04+(a1-k*.04)*gw;a2=.14+(a2-.14)*gw;}
   if(kick>=0&&k===-1){if(kick<.4){a1=-.95*(kick/.4);a2=.5+1.2*(kick/.4);}else if(kick<.7){const q=(kick-.4)/.3;a1=-.95+2.2*q;a2=1.7-1.65*q;}else{const q=(kick-.7)/.3;a1=1.25-1.1*q;a2=.05+.2*q;}}
   if(crouch){a1=.5;a2=.85;}
   if(slide){a1=1.35;a2=k>0?.05:.9;}if(dive>0){a1=.25*k;a2=.3;}
   const kf=Math.sin(a1)*.46,ku=-Math.cos(a1)*.46,af=kf+Math.sin(a1-a2)*.45,au=ku-Math.cos(a1-a2)*.45;legs.push({k,kf,ku,af,au,a:a1-a2});drop=Math.max(drop,-au);}
  const bob=amp>.2?Math.abs(Math.sin(ph))*.04*amp:0;const hipY=slide||dive>0?.95:drop+.085+bob;
  for(const g of legs){const hw=g.k*.105;const hip=P(0,hipY,hw),knee=P(g.kf,hipY+g.ku,hw*1.02),ank=P(g.af,hipY+g.au,hw);
   SEG(D.thigh,knee,hip,.19,.2,skin);SEG(D.calf,ank,knee,.145,.15,socks);
   const ca=Math.cos(g.a*.3),sa=Math.sin(g.a*.3);const heel=P(g.af-.06*ca,hipY+g.au-.035+.06*sa,hw),toe=P(g.af+.2*ca,hipY+g.au-.055-.2*sa*.3,hw);SEG(D.limb,heel,toe,.085,.115,boot);}
  // ----- body -----
  const lean=slide?-.1:(.05+amp*.22-(kick>.3&&kick<.75?.15:0)+(celeb?-.08:0));const sl=Math.sin(lean),cl=Math.cos(lean);
  const at=(d)=>[sl*d,hipY+cl*d];
  SEG(D.shorts,P(0,hipY-.2,0),P(sl*.08,hipY+.1,0),.3,.46,shorts);
  const w0=at(.02),w1=at(.62);SEG(D.torso,P(w0[0],w0[1],0),P(w1[0],w1[1],0),.27,.5,shirt);
  // number on the back
  {const nb=at(.36),n=p.num%100,o=this.tm;const bk=P(nb[0]-cl*.138,nb[1]+sl*.138,0),up=[F[0]*sl,cl,F[2]*sl],sx=-.2,sy=.2;
   o[0]=Sd[0]*-sx;o[1]=Sd[1]*-sx;o[2]=Sd[2]*-sx;o[3]=0;o[4]=up[0]*sy;o[5]=up[1]*sy;o[6]=up[2]*sy;o[7]=0;o[8]=-F[0];o[9]=0;o[10]=-F[2];o[11]=0;o[12]=bk[0];o[13]=bk[1];o[14]=bk[2];o[15]=1;
   this.add(D.num,o,lum(p.team.kit[0])>.6&&!gk?[0.02,0.02,0.03,1]:[1,1,1,1],[(n%10)/10,Math.floor(n/10)/10,.1,.1]);}
  const nk=at(.64),hdp=at(.8);SEG(D.limb,P(nk[0],nk[1],0),P(hdp[0]-sl*.02,hdp[1]-.06,0),.11,.11,skin);
  const hd=P(hdp[0],hdp[1],0);this.add(D.sph,this.trs(hd[0],hd[1],hd[2],th,.215,.25,.2),skin);
  {const o=this.seg(P(hdp[0]-.022-sl*.25,hdp[1]+.012-cl*.25,0),P(hdp[0]-.022+sl*.25,hdp[1]+.012+cl*.25,0),.232,.215,Sd);this.add(D.hair,o,hair);}
  // ----- arms -----
  for(const k of [1,-1]){const phi=ph+(k>0?0:Math.PI);let b1=-Math.sin(phi)*.75*amp,b2=.35+1.05*amp,out=0;
   if(!celeb&&gw<1){b1=.08+(b1-.08)*gw;b2=.25+(b2-.25)*gw;out=.02*(1-gw);}
   if(kick>=0){b1=k===1?.5:-.3;b2=.4;out=.12;}
   if(celeb){b1=2.7;b2=.12;out=.08;}if(slide){b1=-.9;b2=.25;out=.15;}
   if(throwing){b1=2.75-(p.throwT>0?(1-p.throwT/.4)*1.6:0);b2=1.3-(p.throwT>0?(1-p.throwT/.4)*1.1:0);out=-.03;}
   if(crouch){b1=.55;b2=.55;out=.16;}
   if(gk&&(dive>0||(b.shot&&b.shot.by.team!==p.team))){b1=2.4;b2=.15;out=.1;}
   if(dive>0){b1=dH<.6?2.3:2.9;b2=.05;}
   if(hands&&!(p.gkThrowT>0&&p.throwT>0)){b1=.5;b2=.8;out=-.09;}
   const sh=at(.53);const shf=sh[0],shu=sh[1],sw=k*(.25+out);
   const el=[shf+Math.sin(b1)*.29,shu-Math.cos(b1)*.29,k*(.27+out*1.6)],ha=[el[0]+Math.sin(b1+b2)*.27,el[1]-Math.cos(b1+b2)*.27,k*(.28+out*2)];
   const S1=P(shf,shu,sw),E1=P(el[0],el[1],el[2]),H1=P(ha[0],ha[1],ha[2]);
   this.add(D.sph,this.trs(S1[0],S1[1],S1[2],th,.15,.14,.15),shirt);
   SEG(D.limb,S1,P(shf+Math.sin(b1)*.14,shu-Math.cos(b1)*.14,k*(.26+out*1.3)),.13,.13,shirt);
   SEG(D.fore,E1,P(shf+Math.sin(b1)*.1,shu-Math.cos(b1)*.1,k*(.26+out*1.2)),.105,.105,skin);SEG(D.fore,H1,E1,.09,.09,skin);
   this.add(D.sph,this.trs(H1[0],H1[1],H1[2],th,gk?.12:.09,gk?.12:.09,gk?.12:.09),gk?glove:skin);}
  }
 render(m,w,h,dpr,t){const gl=this.gl,cv=this.cv;const W2=Math.round(w*dpr),H2=Math.round(h*dpr);if(cv.width!==W2||cv.height!==H2){cv.width=W2;cv.height=H2;}
  const q=this.quality;this.shadowSetup(q>=2?2048:1024);
  // camera
  const b=m.ball;if(!m._c3)m._c3={x:clamp(b.x,7,L-7),y:clamp(b.y,14,W-10)};const c3=m._c3;const dt=Math.min(0.05,(t-(c3.t||t))/1000)||0.016;c3.t=t;
  const cel=m.phase==='goal'&&m.celebrator;const ow=b.owner,pd=ow?ow.team.dir:(b.last?b.last.team.dir*.5:0);
  // كاميرا ناعمة: زنبرك متخمّد (من غير قفزات)، سبقة بسيطة ناحية الهجمة، وزووم تدريجي كل ما الكورة تقرب من المرمى
  const SD=(k,target,tau)=>{const v=k+'v';const om=2/tau,x=om*dt,ex=1/(1+x+.48*x*x+.235*x*x*x);const ch=(c3[k]==null?target:c3[k])-target,tmp=((c3[v]||0)+om*ch)*dt;c3[v]=((c3[v]||0)-om*tmp)*ex;c3[k]=target+(ch+tmp)*ex;return c3[k];};
  const wl=m.phase==='play'?pd*5+(ow?ow.vx*.3:b.vx*.2):0;SD('lx',clamp(wl,-8,8),1.1);
  const dGo=Math.min(b.x,L-b.x),zt=m.phase==='play'&&Math.abs(b.y-CY)<26?1-.1*clamp((30-dGo)/16,0,1):1;SD('zk',zt,.9);
  const CM=+((typeof App!=='undefined'&&App.settings&&App.settings.cam)||0),hu=m.human,stp=m.t&&m.t[0].star&&!m.t[0].star.off&&m.t[0].pl.includes(m.t[0].star)?m.t[0].star:null;
  // في وضع "لاعبي بس" أو كاميرا اللاعب: الكاميرا بتجمع بين الكورة ولاعبك عشان يفضل باين دايماً
  const follow=stp&&!cel&&m.phase!=='intro'&&(CM===3||(hu&&hu.lock));const fw=CM===3?.75:.42;
  const fx0=cel?cel.x:follow?stp.x*fw+(b.x+c3.lx)*(1-fw):b.x+c3.lx,fy0=cel?cel.y:follow?stp.y*fw+b.y*(1-fw):b.y;const tx=clamp(fx0,7,L-7),ty=clamp(fy0,cel?4:14,W-12);SD('x',tx,.42);SD('y',ty,.6);
  const aspect=w/h,zoomK=aspect<1.5?1.25:1;let eye,tgt,wf;
  if(m.phase==='intro'){const a=t/1000*.22+(c3.a0||(c3.a0=Math.random()*6));eye=[CX+Math.cos(a)*86,30+Math.sin(a*.6)*5,-CY+Math.sin(a)*52];tgt=[CX,2,-CY];wf=aspect<1.5?50:38;c3.f=wf;}
  else if(m.phase==='replay'){const d=m.rpDir||1;const wantE=[b.x-d*12,3.4,-b.y+11],wantT=[b.x+d*3,1,-b.y];if(!c3.re){c3.re=wantE.slice();c3.rt=wantT.slice();}for(let i=0;i<3;i++){c3.re[i]+=(wantE[i]-c3.re[i])*Math.min(1,dt*3);c3.rt[i]+=(wantT[i]-c3.rt[i])*Math.min(1,dt*4);}eye=c3.re.slice();tgt=c3.rt.slice();wf=aspect<1.5?44:34;c3.f=wf;}
  else if(CM===3&&follow){c3.re=null;const dir=m.t[0].dir;SD('pd',dir,1.2);const d=c3.pd;// كاميرا ورا لاعبك (زي وضع احترف)
   eye=[c3.x-d*12.5,7.6,-c3.y+1.2];tgt=[c3.x+d*5.5,-0.6,-c3.y];wf=aspect<1.5?62:50;c3.f=c3.f||wf;c3.f+=(wf-c3.f)*Math.min(1,dt*1.5);}
  else{c3.re=null;const H=CM===1?9.6:CM===2?19:13.5,Dz=CM===1?14.5:CM===2?28:21,fk=CM===1?.88:CM===2?1.12:1;eye=[c3.x,H*zoomK,Dz*zoomK-(c3.y-34)*0.28];tgt=[c3.x,0.6,-(c3.y*0.88+3.5)];wf=(aspect<1.5?34:23)*fk*(cel?0.62:c3.zk);c3.f=c3.f||wf;c3.f+=(wf-c3.f)*Math.min(1,dt*1.5);}
  if(this.debugCam){eye=this.debugCam.eye.slice();tgt=this.debugCam.tgt.slice();c3.f=this.debugCam.fov;}
  if(m.shake>0){const k=m.shake*.45;eye[0]+=R(-k,k);eye[1]+=R(-k,k)*.6;tgt[1]+=R(-k,k)*.3;}
  M4.look(this.V,eye,tgt,[0,1,0]);M4.persp(this.Pm,c3.f*Math.PI/180,aspect,1,600);M4.mul(this.VP,this.Pm,this.V);this.eye=eye;
  // light
  const Ld=this.Ld,ctr=[c3.x,0,-c3.y];M4.look(this.LV,[ctr[0]+Ld[0]*90,Ld[1]*90,ctr[2]+Ld[2]*90],ctr,[0,0,-1]);M4.ortho(this.LP,-58,58,-48,48,10,200);M4.mul(this.LVP,this.LP,this.LV);
  // dynamic
  const D=this.dyn;for(const k in D)D[k].n=0;
  const useSk=this.skin&&!(typeof App!=='undefined'&&App.settings&&+App.settings.plm===1);if(this.skin)this.skin.n=0;
  let drawL=m.leave&&m.leave.length?m.all.concat(m.leave.map(l=>l.p)):m.all;{const st0=m.t&&m.t[0].star;if(st0&&drawL.includes(st0)&&drawL[0]!==st0)drawL=[st0].concat(drawL.filter(q=>q!==st0));}
  for(const p of drawL){const sx=p.x-c3.x;if(sx<-60||sx>60)continue;if(useSk)this.skinPlayer(p,m,t/1000);else this.player(p,m);this.add(D.blob,this.trs(p.x+0.15,0.012,-p.y-0.1,0,1.25,1,1.0),[0,0,0,0.5]);}this.add(D.blob,this.trs(b.x,0.013,-b.y,0,0.5,1,0.5),[0,0,0,clamp(0.55-b.z*0.08,0.12,0.55)]);
  // ball
  // دوران الكورة من المسافة اللي اتحركتها فعلاً على الأرض (مافيش انزلاق)، وفي الهوا بتحتفظ بلفّتها
  let bvx,bvy;{const lx=this._bpx==null?b.x:this._bpx,ly=this._bpy==null?b.y:this._bpy;this._bpx=b.x;this._bpy=b.y;const ddt=Math.max(dt,1e-3);let mx=(b.x-lx)/ddt,my=(b.y-ly)/ddt;if(Math.hypot(mx,my)>45){mx=b.vx;my=b.vy;}
   if(b.z<.08){bvx=mx;bvy=my;this._bsp=[mx,my];}else{const sp0=this._bsp||[b.vx,b.vy];sp0[0]*=1-dt*.15;sp0[1]*=1-dt*.15;bvx=sp0[0];bvy=sp0[1];}}
  const bv=Math.hypot(bvx,bvy);if(bv>0.05){const ax=-bvy/bv,az=-bvx/bv,ang=bv*dt/0.15;const co=Math.cos(ang),si=Math.sin(ang),oc=1-co;const Rm=[co+ax*ax*oc,az*si,ax*az*oc, -az*si,co,ax*si, az*ax*oc,-ax*si,co+az*az*oc];const B=this.ballR,n=new Float32Array(9);
   for(let cc=0;cc<3;cc++)for(let r=0;r<3;r++)n[cc*3+r]=Rm[r]*B[cc*3]+Rm[3+r]*B[cc*3+1]+Rm[6+r]*B[cc*3+2];this.ballR=n;if((++this.frameN)%120===0){const v0=[n[0],n[1],n[2]],l0=Math.hypot(...v0);v0.forEach((v,i)=>n[i]=v/l0);let d=n[3]*n[0]+n[4]*n[1]+n[5]*n[2];for(let i=0;i<3;i++)n[3+i]-=d*n[i];const l1=Math.hypot(n[3],n[4],n[5]);for(let i=0;i<3;i++)n[3+i]/=l1;n[6]=n[1]*n[5]-n[2]*n[4];n[7]=n[2]*n[3]-n[0]*n[5];n[8]=n[0]*n[4]-n[1]*n[3];}}
  {const B=this.ballR,sc=0.3,o=this.tm;o[0]=B[0]*sc;o[1]=B[1]*sc;o[2]=B[2]*sc;o[3]=0;o[4]=B[3]*sc;o[5]=B[4]*sc;o[6]=B[5]*sc;o[7]=0;o[8]=B[6]*sc;o[9]=B[7]*sc;o[10]=B[8]*sc;o[11]=0;o[12]=b.x;o[13]=b.z+0.15;o[14]=-b.y;o[15]=1;this.add(D.ball,o,[1,1,1,1]);}
  // rings
  const h0=m.human;if(h0&&h0.ctrl){const p=h0.ctrl;this.add(D.ring,this.trs(p.x,0.03,-p.y,0,0.75,1,0.75),lin('#C6F432'));}
  for(const p of m.all)if(p.star&&!(h0&&p===h0.ctrl))this.add(D.ring,this.trs(p.x,0.03,-p.y,0,0.62,1,0.62),lin('#F5C542'));
  // glows (billboards facing camera)
  for(const L0 of this.lamps){const dx=eye[0]-L0[0],dz=eye[2]-L0[2];const ry=Math.atan2(dx,dz);this.add(D.glow,this.trs(L0[0],L0[1],L0[2],ry,26,26,1),[1.6,1.5,1.3,1]);}
  for(const k in D)this.up(D[k]);if(this.skin)this.skinUpload();
  // shadow pass
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.dprog);gl.uniformMatrix4fv(this.du.LVP,false,this.LVP);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);[D.cyl,D.box,D.sph,D.ball,D.limb,D.thigh,D.calf,D.fore,D.torso,D.shorts,D.hair,this.st.cyl].forEach(x=>this.draw(x));
  if(this.skin&&this.skin.n){const sk=this.skin;gl.useProgram(sk.dprog);gl.uniformMatrix4fv(sk.du.LVP,false,this.LVP);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,sk.tex);gl.uniform1i(sk.du.Bones,2);gl.activeTexture(gl.TEXTURE0);gl.bindVertexArray(sk.vao);gl.drawElementsInstanced(gl.TRIANGLES,sk.cnt,gl.UNSIGNED_SHORT,0,sk.n);gl.bindVertexArray(null);}
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W2,H2);gl.clearColor(0.02,0.03,0.07,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.prog);const u=this.u;gl.uniformMatrix4fv(u.VP,false,this.VP);gl.uniformMatrix4fv(u.LVP,false,this.LVP);gl.uniform1f(u.Time,t/1000);gl.uniform3fv(u.Ld,Ld);gl.uniform3fv(u.Cam,eye);gl.uniform2f(u.ShTex,1/this.shadowSize,1/this.shadowSize);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shTex);gl.uniform1i(u.Sh,1);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(u.Tex,0);
  const set=(mode,tex,unlit,shOn,wave)=>{gl.uniform1i(u.Mode,mode);if(tex)gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(u.Unlit,unlit||0);gl.uniform1f(u.ShOn,shOn?1:0);gl.uniform1f(u.Wave,wave||0);};
  gl.bindTexture(gl.TEXTURE_2D,this.tWhite);
  set(1,this.tSur,0,1);this.draw(this.sur);
  set(1,this.tPitch,0,1);this.draw(this.st.plane);
  set(0,null,0,0);this.draw(this.st.box);this.draw(this.st.cyl);
  if(this.stadB){set(0,null,0,0);for(const b of this.stadB)if(!b.emis)this.draw(b);set(0,null,1);for(const b of this.stadB)if(b.emis)this.draw(b);}
  set(6,this.tCrowd,0,0,m.phase==='goal'||m.phase==='end'?1:0.08);if(Array.isArray(this.crowdS))this.crowdS.forEach(b=>this.draw(b));else this.draw(this.crowdS);
  set(0,null,1);this.draw(this.st.lamp);
  set(1,this.tAds,1.25);this.draw(this.st.ads);
  set(0,null,0,1);this.draw(D.cyl);this.draw(D.box);this.draw(D.sph);[D.limb,D.thigh,D.calf,D.fore,D.torso,D.shorts,D.hair].forEach(x=>this.draw(x));
  if(this.skin&&this.skin.n){const sk=this.skin,su=sk.u;gl.useProgram(sk.prog);gl.uniformMatrix4fv(su.VP,false,this.VP);gl.uniformMatrix4fv(su.LVP,false,this.LVP);gl.uniform1f(su.Time,t/1000);gl.uniform3fv(su.Ld,Ld);gl.uniform3fv(su.Cam,eye);gl.uniform2f(su.ShTex,1/this.shadowSize,1/this.shadowSize);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shTex);gl.uniform1i(su.Sh,1);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,sk.tex);gl.uniform1i(su.Bones,2);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tWhite);gl.uniform1i(su.Tex,0);
   gl.uniform1i(su.Mode,0);gl.uniform1f(su.Unlit,0);gl.uniform1f(su.ShOn,1);gl.uniform1f(su.Wave,0);gl.uniform1i(su.NJ,sk.nJ);gl.uniform3fv(su.RN,sk.rn);gl.uniform1f(su.KitOn,sk.kitOn&&sk.kit?1:0);if(sk.kit){gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,sk.kit);gl.uniform1i(su.Kit,3);gl.activeTexture(gl.TEXTURE0);}
   gl.bindVertexArray(sk.vao);gl.drawElementsInstanced(gl.TRIANGLES,sk.cnt,gl.UNSIGNED_SHORT,0,sk.n);gl.bindVertexArray(null);gl.useProgram(this.prog);}
  set(5,this.tNum,0,1);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-2);this.draw(D.num);if(this.tFace&&D.face.n){set(7,this.tFace,0,0);this.draw(D.face);}gl.disable(gl.POLYGON_OFFSET_FILL);gl.activeTexture(gl.TEXTURE0);
  set(1,this.tBall,0,1);this.draw(D.ball);
  set(0,null,1.4);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-4);this.draw(D.ring);gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.enable(gl.BLEND);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);set(4,this.tGlow,1);this.draw(D.blob);set(2,this.tNet,0,0);this.draw(this.netB);
  gl.blendFunc(gl.ONE,gl.ONE);set(3,this.tGlow,1);this.draw(D.glow);
  gl.depthMask(true);gl.disable(gl.BLEND);}
 project(x,y,z,w,h){const v=this.VP,X=x,Y=z,Z=-y;const cx=v[0]*X+v[4]*Y+v[8]*Z+v[12],cy=v[1]*X+v[5]*Y+v[9]*Z+v[13],cw=v[3]*X+v[7]*Y+v[11]*Z+v[15];if(cw<=0.01)return null;return{x:(cx/cw*0.5+0.5)*w,y:(1-(cy/cw*0.5+0.5))*h};}
}
