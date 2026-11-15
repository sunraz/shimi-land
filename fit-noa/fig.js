/* שימי פיט · מנוע דמות v4 — נועה, שלד עם IK ואנטומיה, לבוש קנוני סגול
   figures drawn from real joint kinematics: hip/shoulder anchors, feet planted,
   knees solved by 2-bone IK, tapered muscle shapes instead of tubes. */
(function(){
'use strict';
const W=300,H=290,GROUND=262;
const THIGH=50,SHIN=52,TORSO=52,NECK=8.5,HEADR=10.6,UPPER=29,FORE=26;
const LIGHT={x:-0.42,y:-0.91};
const C={
  /* נועה — עור זית בהיר, שיער ערמוני גלי ארוך, תחרה סגולה קנונית */
  skin:'#cf9c74',skinL:'#e9c6a0',skinD:'#b07f58',skinDD:'#8d5f3e',
  leg:'#1a1d23',legL:'#2f3540',legD:'#0e1014',
  bra:'#6f34a8',braL:'#a86bd6',braD:'#431d66',
  lace:'#8a4fc4',laceD:'#38194f',
  gold:'#bb8ce8',goldD:'#7c4fae',
  hair:'#5a2a13',hairL:'#8e4a22',hairD:'#37170a',
  shoe:'#f0f4f9',shoeD:'#c2cbd7',
  metal:'#98a5b7',metalD:'#5d6979',
  pad:'#2b3443',padD:'#1a212c',mat:'#161d27'
};

/* ---------- math ---------- */
function lerp(a,b,t){return a+(b-a)*t;}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function dirOf(deg){const r=deg*Math.PI/180;return [Math.sin(r),Math.cos(r)];}
function prof(v,t){
  t=clamp(t,0,1);const n=v.length-1,x=t*n,i=Math.min(n-1,Math.floor(x)),f=x-i;
  const p0=v[Math.max(0,i-1)],p1=v[i],p2=v[i+1],p3=v[Math.min(n,i+2)];
  const f2=f*f,f3=f2*f;
  return 0.5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f2+(-p0+3*p1-3*p2+p3)*f3);
}
function outline(a,b,radFn,N){
  N=N||18;
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
  const nx=-dy/L,ny=dx/L,pts=[];
  for(let i=0;i<=N;i++){const t=i/N,r=radFn(t);pts.push([a[0]+dx*t+nx*r,a[1]+dy*t+ny*r]);}
  let A=Math.atan2(ny,nx),r1=radFn(1);
  for(let k=1;k<=9;k++){const q=A+Math.PI*k/9;pts.push([b[0]+Math.cos(q)*r1,b[1]+Math.sin(q)*r1]);}
  for(let i=N;i>=0;i--){const t=i/N,r=radFn(t);pts.push([a[0]+dx*t-nx*r,a[1]+dy*t-ny*r]);}
  A=Math.atan2(-ny,-nx);r1=radFn(0);
  for(let k=1;k<=9;k++){const q=A+Math.PI*k/9;pts.push([a[0]+Math.cos(q)*r1,a[1]+Math.sin(q)*r1]);}
  return pts;
}
function trace(ctx,pts){
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();
}
function bone(ctx,a,b,radFn,cL,cM,cD,edge){
  const pts=outline(a,b,radFn);
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
  const nx=-dy/L,ny=dx/L,m=[(a[0]+b[0])/2,(a[1]+b[1])/2],r=Math.max(2,radFn(0.5));
  const g=ctx.createLinearGradient(m[0]+nx*r,m[1]+ny*r,m[0]-nx*r,m[1]-ny*r);
  const lit=(nx*LIGHT.x+ny*LIGHT.y)>0;
  if(lit){g.addColorStop(0,cL);g.addColorStop(.40,cM);g.addColorStop(1,cD);}
  else{g.addColorStop(0,cD);g.addColorStop(.56,cM);g.addColorStop(1,cL);}
  trace(ctx,pts);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle=edge||'rgba(0,0,0,.34)';ctx.lineWidth=.8;ctx.stroke();
}
/* muscle radius profiles: fat at the belly of the muscle, thin at the joint */
const R={
  thighF:t=>prof([12.5,17.5,17,12.5,10],t),
  thighB:t=>prof([14.5,20,19,14,10.6],t),
  shinF:t=>prof([9.6,11.4,10,6.8,5.2],t),
  shinB:t=>prof([10.6,13.4,11.4,7.4,5.6],t),
  upper:t=>prof([9.4,10.2,9,7.2,6],t),
  fore:t=>prof([6.4,6.4,5.4,4.4,3.6],t),
  neck:t=>prof([8,7.2,6.6,6.4,6.2],t)
};
function skinPair(far){return far?[C.skinD,C.skinD,C.skinDD]:[C.skinL,C.skin,C.skinD];}
function legPair(far){
  /* רגל חשופה עם הגדרת שריר (סט ספורט: תחתון ספורט בלבד) */
  if(window.FIT_BARE_LEGS!==false){
    return far?[C.skinD,C.skin,C.skinDD]:[C.skinL,C.skin,C.skinD];
  }
  return [C.legL,C.leg,C.legD];
}

/* 2-bone IK: returns joint position between root and target */
function ik(root,target,l1,l2,bend){
  let dx=target[0]-root[0],dy=target[1]-root[1];
  let d=Math.hypot(dx,dy);
  if(d<0.001){dx=0;dy=1;d=1;}
  const orig=Math.hypot(target[0]-root[0],target[1]-root[1])||1;
  d=clamp(d,Math.abs(l1-l2)+1,l1+l2-0.6);
  const ux=dx/orig,uy=dy/orig;
  const a=(l1*l1-l2*l2+d*d)/(2*d);
  const h=Math.sqrt(Math.max(0,l1*l1-a*a));
  const bx=root[0]+ux*a,by=root[1]+uy*a;
  const px=-uy,py=ux;
  return [bx+px*h*bend,by+py*h*bend];
}
function ikAuto(root,target,l1,l2,mode){
  if(mode==='down')return ik(root,target,l1,l2,1)[1]>ik(root,target,l1,l2,-1)[1]?ik(root,target,l1,l2,1):ik(root,target,l1,l2,-1);
  if(mode==='up')return ik(root,target,l1,l2,1)[1]<ik(root,target,l1,l2,-1)[1]?ik(root,target,l1,l2,1):ik(root,target,l1,l2,-1);
  return ik(root,target,l1,l2,mode||1);
}

/* ---------- rig ---------- */
function rig(p){
  const dir=p.dir||1;
  const tilt=(p.tilt||0)*Math.PI/180;
  const up=[Math.sin(tilt),-Math.cos(tilt)];
  let sh,hip;
  if(p.sa){sh=[p.sa[0],p.sa[1]];hip=[sh[0]-up[0]*TORSO,sh[1]-up[1]*TORSO];}
  else{hip=[(p.hip?p.hip[0]:150),(p.hip?p.hip[1]:158)];sh=[hip[0]+up[0]*TORSO,hip[1]+up[1]*TORSO];}
  const ht=(p.headTilt||0)*Math.PI/180;
  const hu=[up[0]*Math.cos(ht)-up[1]*Math.sin(ht),up[0]*Math.sin(ht)+up[1]*Math.cos(ht)];
  const head=[sh[0]+hu[0]*(NECK+HEADR*0.92),sh[1]+hu[1]*(NECK+HEADR*0.92)];
  const front=[dir*(-up[1]),dir*(up[0])];

  const feet=p.feet||[[hip[0]-dir*5,254],[hip[0]+dir*5,254]];
  const bends=p.bends||[];
  const legs=feet.map((f,i)=>{
    let ankle, knee;
    if(Array.isArray(f)){
      ankle=[f[0],f[1]];
      const b=bends[i]!==undefined?bends[i]:(p.kneeBend!==undefined?p.kneeBend:-dir);
      knee=ikAuto(hip,ankle,THIGH,SHIN,b);
    }else{
      const a=dirOf(f.a||0),b=dirOf((f.a||0)+(f.b||0));
      knee=[hip[0]+a[0]*THIGH,hip[1]+a[1]*THIGH];
      ankle=[knee[0]+b[0]*SHIN,knee[1]+b[1]*SHIN];
    }
    return {hip,knee,ankle};
  });

  const hands=p.hands||[[sh[0]+dir*6,sh[1]+UPPER+FORE-4],[sh[0]+dir*10,sh[1]+UPPER+FORE]];
  const ab=p.armBend!==undefined?p.armBend:-dir;
  const arms=hands.map((h,i)=>{
    const s=[sh[0]+dir*(i?3:-1),sh[1]+(i?2.5:0)];
    const elb=ik(s,[h[0],h[1]],UPPER,FORE,ab);
    return {s,elb,hand:[h[0],h[1]]};
  });
  return {dir,up,front,hip,sh,head,legs,arms,tilt:p.tilt||0};
}

/* ---------- props ---------- */
function shadow(ctx,cx,cy,rx,ry){
  const g=ctx.createRadialGradient(cx,cy,1,cx,cy,Math.max(rx,ry));
  g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/Math.max(rx,ry));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,7);ctx.fill();ctx.restore();
}
function bench(ctx,x,y,w){
  const h=13;
  ctx.save();
  shadow(ctx,x+w/2,GROUND+1,w*0.55,7);
  ctx.fillStyle=C.padD;ctx.fillRect(x+7,y+h,7,GROUND-y-h);
  ctx.fillStyle=C.padD;ctx.fillRect(x+w-14,y+h,7,GROUND-y-h);
  ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(x+7,y+h,2,GROUND-y-h);
  ctx.fillStyle=C.padD;
  const gr=ctx.createLinearGradient(x,y,x,y+h);
  gr.addColorStop(0,'#39445a');gr.addColorStop(.5,C.pad);gr.addColorStop(1,'#141a24');
  ctx.beginPath();ctx.roundRect(x,y,w,h,5);ctx.fillStyle=gr;ctx.fill();
  ctx.strokeStyle='rgba(187,140,232,.28)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+4,y+1.6);ctx.lineTo(x+w-4,y+1.6);ctx.stroke();
  ctx.restore();
}
function mat(ctx){
  ctx.save();
  const g=ctx.createLinearGradient(0,GROUND-9,0,GROUND+4);
  g.addColorStop(0,'#20293a');g.addColorStop(1,C.mat);
  ctx.beginPath();ctx.roundRect(46,GROUND-9,208,12,6);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(187,140,232,.20)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(60,GROUND-3.5);ctx.lineTo(240,GROUND-3.5);ctx.stroke();
  ctx.restore();
}
function dumbbell(ctx,hand,dir){
  ctx.save();ctx.translate(hand[0],hand[1]);ctx.rotate(-dir*0.1);
  const g=ctx.createLinearGradient(0,-4,0,4);
  g.addColorStop(0,C.metal);g.addColorStop(1,C.metalD);
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-5,-3.4,20,6.8,3);ctx.fill();
  ctx.fillStyle='#2c3543';
  ctx.beginPath();ctx.roundRect(-8,-6.4,5.5,12.8,2.4);ctx.fill();
  ctx.beginPath();ctx.roundRect(14.5,-6.4,5.5,12.8,2.4);ctx.fill();
  ctx.strokeStyle=C.gold;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(12,0);ctx.stroke();
  ctx.restore();
}
function barbell(ctx,c,dir,ang){
  ctx.save();ctx.translate(c[0],c[1]);ctx.rotate(ang||0);
  const g=ctx.createLinearGradient(0,-3.5,0,3.5);
  g.addColorStop(0,'#c6d0dc');g.addColorStop(1,'#7c8798');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-34,-3,68,6,3);ctx.fill();
  ctx.fillStyle='#1b2028';
  ctx.beginPath();ctx.roundRect(-40,-9,9,18,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(31,-9,9,18,3);ctx.fill();
  ctx.fillStyle=C.gold;ctx.fillRect(-31,-3.2,4,6.4);ctx.fillRect(27,-3.2,4,6.4);
  ctx.restore();
}
function stepBox(ctx,x,top){
  ctx.save();
  shadow(ctx,x+33,GROUND+1,40,6);
  const g=ctx.createLinearGradient(x,top,x,GROUND);
  g.addColorStop(0,'#38425a');g.addColorStop(1,'#161d29');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,top,66,GROUND-top,5);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+3,top,60,2.4);
  ctx.strokeStyle='rgba(187,140,232,.30)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+6,top+2.6);ctx.lineTo(x+60,top+2.6);ctx.stroke();
  ctx.restore();
}
function band(ctx,a,b){
  ctx.save();
  ctx.strokeStyle='rgba(187,140,232,.75)';ctx.lineWidth=2.6;ctx.setLineDash([6,3]);
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+3,b[0],b[1]);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
}

/* ---------- body parts ---------- */
function drawShoe(ctx,ankle,knee,dir){
  const ang=Math.atan2(ankle[1]-knee[1],ankle[0]-knee[0])-Math.PI/2;
  ctx.save();ctx.translate(ankle[0],ankle[1]);ctx.rotate(ang*0.35);
  if(dir<0)ctx.scale(-1,1);
  const g=ctx.createLinearGradient(0,-7,0,6);
  g.addColorStop(0,C.shoe);g.addColorStop(1,C.shoeD);
  ctx.beginPath();
  ctx.moveTo(-7,-7);
  ctx.quadraticCurveTo(-9.6,1,-6.4,5.4);
  ctx.lineTo(12,5.4);
  ctx.quadraticCurveTo(16.4,4.6,15.4,0.4);
  ctx.quadraticCurveTo(12.4,-5,6.4,-7);
  ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.fillStyle='#f7fafd';
  ctx.beginPath();ctx.moveTo(-6.6,4.6);ctx.lineTo(14.2,4.6);ctx.lineTo(13.6,7.4);ctx.lineTo(-6.2,7.4);ctx.closePath();ctx.fill();
  ctx.fillStyle=C.gold;ctx.fillRect(-5.4,7.4,19,1.3);
  ctx.strokeStyle='rgba(120,136,156,.85)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-1,-5.6);ctx.lineTo(5.4,0.6);ctx.moveTo(3.4,-6.4);ctx.lineTo(9,2);ctx.stroke();
  ctx.restore();
}
function drawArm(ctx,arm,far){
  const sk=skinPair(far);
  bone(ctx,arm.s,arm.elb,R.upper,sk[0],sk[1],sk[2]);
  bone(ctx,arm.elb,arm.hand,R.fore,sk[0],sk[1],sk[2]);
  ctx.beginPath();ctx.arc(arm.s[0],arm.s[1],8.2,0,7);
  ctx.fillStyle=sk[1];ctx.fill();
  ctx.beginPath();ctx.arc(arm.hand[0],arm.hand[1],4.4,0,7);
  ctx.fillStyle=sk[1];ctx.fill();
}
function drawLeg(ctx,leg,far){
  const lg=legPair(far);
  bone(ctx,leg.hip,leg.knee,far?R.thighF:R.thighB,lg[0],lg[1],lg[2]);
  bone(ctx,leg.knee,leg.ankle,far?R.shinF:R.shinB,lg[0],lg[1],lg[2]);
  /* legging highlights: outer seam + front specular */
  ctx.save();ctx.globalAlpha=far?.35:.6;
  const dx=leg.knee[0]-leg.hip[0],dy=leg.knee[1]-leg.hip[1],L=Math.hypot(dx,dy)||1;
  const nx=-dy/L,ny=dx/L,r=14;
  const g=ctx.createLinearGradient(leg.hip[0]+nx*r,leg.hip[1]+ny*r,leg.hip[0]-nx*r,leg.hip[1]-ny*r);
  g.addColorStop(0,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.strokeStyle=g;ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(leg.hip[0],leg.hip[1]);ctx.lineTo(leg.knee[0],leg.knee[1]);ctx.stroke();
  ctx.restore();
  /* knee cap */
  ctx.beginPath();ctx.arc(leg.knee[0],leg.knee[1],far?7.4:8,0,7);
  ctx.fillStyle=lg[1];ctx.fill();
}
function drawTorsoSide(ctx,r,opts){
  const {hip,sh,dir}=r;
  const dx=sh[0]-hip[0],dy=sh[1]-hip[1],L=Math.hypot(dx,dy)||1;
  const u=[dx/L,dy/L],F=[dir*(-u[1]),dir*u[0]];
  const BACK=[17.2,12.9,10.6,11.2,11.7], FRONT=[11.2,9.4,10.4,13.6,14.8];
  const N=20,B=[],Fr=[];
  for(let i=0;i<=N;i++){
    const t=i/N,c=[hip[0]+dx*t,hip[1]+dy*t];
    const rb=prof(BACK,t), rf=prof(FRONT,t);
    B.push([c[0]-F[0]*rb,c[1]-F[1]*rb]);
    Fr.push([c[0]+F[0]*rf,c[1]+F[1]*rf]);
  }
  const pts=[].concat(B,Fr.slice().reverse());
  trace(ctx,pts);
  ctx.save();ctx.clip();
  /* base skin */
  const g=ctx.createLinearGradient(hip[0]-F[0]*16,hip[1]-F[1]*16,hip[0]+F[0]*16,hip[1]+F[1]*16);
  g.addColorStop(0,C.skinD);g.addColorStop(.45,C.skin);g.addColorStop(1,C.skinL);
  ctx.fillStyle=g;ctx.fillRect(hip[0]-90,hip[1]-90,180,180);
  function bandFill(t0,t1,fill){
    const a=[hip[0]+dx*t0,hip[1]+dy*t0], b=[hip[0]+dx*t1,hip[1]+dy*t1];
    const rb0=prof(BACK,t0),rf0=prof(FRONT,t0),rb1=prof(BACK,t1),rf1=prof(FRONT,t1);
    ctx.beginPath();
    ctx.moveTo(a[0]-F[0]*rb0,a[1]-F[1]*rb0);
    ctx.lineTo(b[0]-F[0]*rb1,b[1]-F[1]*rb1);
    ctx.lineTo(b[0]+F[0]*rf1,b[1]+F[1]*rf1);
    ctx.lineTo(a[0]+F[0]*rf0,a[1]+F[1]*rf0);
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  /* קנון נועה: תחתון תחרה סגול, גזרה נמוכה מאוד, שוליים פתוחים */
  bandFill(-0.10,0.175,C.bra);
  bandFill(0.175,0.194,C.braD);
  ctx.save();ctx.globalAlpha=.30;ctx.fillStyle=C.braL;
  for(let i=0;i<12;i++){const tt=-0.09+i*0.022;bandFill(tt,tt+0.006,C.braL);}
  ctx.restore();
  /* sports bra */
  const bg=ctx.createLinearGradient(hip[0]-F[0]*15,hip[1]-F[1]*15,hip[0]+F[0]*15,hip[1]+F[1]*15);
  bg.addColorStop(0,C.braD);bg.addColorStop(.45,C.bra);bg.addColorStop(1,C.braL);
  bandFill(0.545,1.16,bg);
  /* ---- מחשוף V אמיתי: חיתוך בצווארון (צד) ---- */
  const vW=10.5;
  const vp=function(t,off){return [hip[0]+dx*t+F[0]*off, hip[1]+dy*t+F[1]*off];};
  /* פרופיל: צווארון V — עור מהכתף הקדמית אל עצם החזה, הגב נשאר מכוסה */
  const vA=vp(1.26, vW*1.02), vB=vp(1.26,-vW*0.15), vC=vp(0.60, vW*0.52);
  ctx.beginPath();ctx.moveTo(vA[0],vA[1]);ctx.lineTo(vB[0],vB[1]);ctx.lineTo(vC[0],vC[1]);
  ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.lineJoin='round';
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2.2;
  ctx.beginPath();ctx.moveTo(vA[0],vA[1]);ctx.lineTo(vB[0],vB[1]);ctx.lineTo(vC[0],vC[1]);ctx.stroke();
  ctx.strokeStyle='rgba(187,140,232,.92)';ctx.lineWidth=1;ctx.stroke();
  /* קנון: בלי כתפיות. שולי תחרה פתוחים לאורך החלק התחתון של הפס */
  (function(){
    const y0=hip[1]+dy*0.552, y1=hip[1]+dy*0.560;
    const xa=hip[0]+dx*0.552-F[0]*prof(BACK,0.552), xb=hip[0]+dx*0.552+F[0]*prof(FRONT,0.552);
    ctx.strokeStyle='rgba(168,107,214,.85)';ctx.lineWidth=1;ctx.setLineDash([1.8,2.2]);
    ctx.beginPath();ctx.moveTo(xa,y0);ctx.lineTo(xb,y1);ctx.stroke();ctx.setLineDash([]);
  })();
  /* ab shadow + glute crease */
  ctx.globalAlpha=.35;
  bandFill(0.30,0.36,'rgba(150,90,66,.6)');
  ctx.globalAlpha=1;
  ctx.restore();
  /* torso outline */
  trace(ctx,pts);
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.9;ctx.stroke();
  /* collar */
  ctx.beginPath();ctx.arc(sh[0],sh[1],4.6,0,7);ctx.fillStyle=C.skinD;ctx.fill();
}
function drawGlute(ctx,r){
  const {hip,dir}=r;
  ctx.save();
  ctx.translate(hip[0],hip[1]);
  ctx.rotate(Math.atan2(r.up[0],-r.up[1]));
  const g=ctx.createRadialGradient(-dir*4,-4,2,-dir*2,0,20);
  g.addColorStop(0,C.skinL);g.addColorStop(.58,C.skin);g.addColorStop(1,C.skinD);
  ctx.beginPath();ctx.ellipse(-dir*5,1,14.5,12.5,dir*0.25,0,7);
  ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.8;ctx.stroke();
  ctx.restore();
}
function drawHead(ctx,r){
  const c=r.head,dir=r.dir;
  ctx.save();ctx.translate(c[0],c[1]);
  ctx.rotate(((r.tilt-90)*0)*Math.PI/180);
  if(dir<0)ctx.scale(-1,1);
  /* neck */
  bone(ctx,[-1,9],[1,2],R.neck,C.skinD,C.skin,C.skinDD,'rgba(0,0,0,.18)');
  /* hair mass behind */
  ctx.fillStyle=C.hair;
  ctx.beginPath();
  ctx.moveTo(-6.4,8);
  ctx.bezierCurveTo(-13.6,3,-14.4,-7,-7.4,-11.6);
  ctx.bezierCurveTo(-1.6,-14.6,5.4,-13.4,8.2,-8.4);
  ctx.lineTo(8.6,-3.6);
  ctx.bezierCurveTo(2.4,-9,-4.6,-7.4,-5.8,-0.4);
  ctx.closePath();ctx.fill();
  /* face */
  const g=ctx.createLinearGradient(-6,-9,9,9);
  g.addColorStop(0,C.skinL);g.addColorStop(.55,C.skin);g.addColorStop(1,C.skinD);
  ctx.beginPath();
  ctx.moveTo(-6,-2.4);
  ctx.bezierCurveTo(-6.2,-9.6,-0.4,-13,5.6,-10.9);
  ctx.bezierCurveTo(9.2,-9.6,10.2,-4.8,10.2,-1.6);
  ctx.lineTo(12,1.9);
  ctx.lineTo(9.7,2.9);
  ctx.lineTo(10.1,4.9);
  ctx.lineTo(8.5,6.4);
  ctx.bezierCurveTo(8.2,9,3.6,10.8,-1.2,10.4);
  ctx.bezierCurveTo(-4.4,10.1,-6.2,7.4,-6,-2.4);
  ctx.closePath();ctx.fillStyle=g;ctx.fill();
  /* ear */
  ctx.beginPath();ctx.ellipse(-2,1.6,2.5,3.4,0,0,7);ctx.fillStyle=C.skinD;ctx.fill();
  ctx.strokeStyle='rgba(120,70,52,.5)';ctx.lineWidth=.8;ctx.stroke();
  /* eye + brow + lips */
  ctx.fillStyle='#5d6b33';
  ctx.beginPath();ctx.ellipse(6,-3.2,1.5,1.6,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(42,31,24,.9)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(3.6,-6.6);ctx.quadraticCurveTo(6.6,-7.6,9.2,-6.4);ctx.stroke();
  ctx.strokeStyle='rgba(150,80,70,.8)';ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(8.2,4.8);ctx.lineTo(10,4.6);ctx.stroke();
  /* שיער ארוך גלי — נועה */
  ctx.fillStyle=C.hairD;
  ctx.beginPath();
  ctx.moveTo(-6.6,-7.2);
  ctx.bezierCurveTo(-14.8,-3.2,-18.8,4.6,-16.4,15.2);
  ctx.bezierCurveTo(-15.2,20.6,-11.2,22.8,-8.8,20.8);
  ctx.bezierCurveTo(-12.4,15.4,-12.6,7.4,-9.4,1.4);
  ctx.bezierCurveTo(-8.2,-0.9,-6.3,-3.4,-4.6,-4.6);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=C.hair;
  ctx.beginPath();
  ctx.moveTo(-6.2,-6.2);
  ctx.bezierCurveTo(-12.6,-2.2,-15.2,4.8,-13.4,13.4);
  ctx.bezierCurveTo(-12.4,18.2,-9.6,19.8,-8,18.2);
  ctx.bezierCurveTo(-10.6,12.8,-10.1,5.6,-7.2,0.4);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(142,74,34,.85)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-9.6,2.2);ctx.bezierCurveTo(-11.4,7,-11,12,-8.6,16.6);ctx.stroke();
  /* hair sheen */
  ctx.strokeStyle='rgba(150,112,84,.55)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-5,-9.6);ctx.quadraticCurveTo(1.2,-13.2,6.4,-9.8);ctx.stroke();
  ctx.restore();
}

/* ---------- side view ---------- */
function sideFigure(ctx,p){
  const r=rig(p);
  const props=(p.prop||'').split('+').filter(Boolean);
  if(props.includes('mat'))mat(ctx);
  if(props.includes('bench'))bench(ctx,p.benchX!==undefined?p.benchX:182,p.benchY!==undefined?p.benchY:196,p.benchW||66);
  if(props.includes('step'))stepBox(ctx,p.benchX!==undefined?p.benchX:196,p.benchY!==undefined?p.benchY:206);
  shadow(ctx,r.hip[0],GROUND-1,52,7);
  /* far limb */
  drawLeg(ctx,r.legs[0],true);
  drawArm(ctx,r.arms[0],true);
  /* body */
  drawTorsoSide(ctx,r);
  drawGlute(ctx,r);
  /* near limb */
  drawLeg(ctx,r.legs[1],false);
  drawShoe(ctx,r.legs[1].ankle,r.legs[1].knee,r.dir);
  drawArm(ctx,r.arms[1],false);
  drawHead(ctx,r);
  if(props.includes('band')&&p.band){band(ctx,p.band[0],p.band[1]);}
  if(props.includes('bar')){
    const at=p.barAt==='hands'?r.arms[1].hand:[r.hip[0]+r.front[0]*7,r.hip[1]+r.front[1]*7];
    barbell(ctx,at,r.dir,p.barAng||0);
  }
  if(props.includes('dumbbell'))dumbbell(ctx,r.arms[1].hand,r.dir);
}

/* ---------- front view ---------- */
function frontFigure(ctx,p){
  const hip=p.hip||[p.hx!==undefined?p.hx:150,p.hy!==undefined?p.hy:160];
  const sp=p.spread!==undefined?p.spread:22;
  const ao=p.armOut!==undefined?p.armOut:22;
  const hd=p.handDrop!==undefined?p.handDrop:46;
  const feet=p.feet||[[hip[0]-sp,254],[hip[0]+sp,254]];
  const hands=p.hands||[[hip[0]-ao-6,hip[1]-TORSO+26+hd],[hip[0]+ao+6,hip[1]-TORSO+26+hd]];
  const sh=[hip[0],hip[1]-TORSO];
  shadow(ctx,hip[0],GROUND-1,54,7);
  if((p.prop||'').includes('band')&&p.band)band(ctx,p.band[0],p.band[1]);
  const legs=feet.map((f,i)=>{
    const s=i?-1:1;
    const knee=ikAuto(hip,[f[0],f[1]],THIGH,SHIN,s);
    return {hip:hip,knee:knee,ankle:[f[0],f[1]],out:s};
  });
  const arms=hands.map((h,i)=>{
    const s=[hip[0]+(i?15:-15),sh[1]+3];
    const elb=ikAuto(s,[h[0],h[1]],UPPER,FORE,i?-1:1);
    return {s,elb,hand:[h[0],h[1]]};
  });
  drawLeg(ctx,legs[1],true);
  drawArm(ctx,arms[1],true);
  /* torso */
  const N=18,B=[],Fr=[];
  const Bk=[18.6,13.2,11.5,12,12.8],Frp=[18.6,13.2,11.5,12,12.8];
  for(let i=0;i<=N;i++){
    const t=i/N,c=[hip[0],hip[1]-TORSO*t];
    B.push([c[0]-prof(Bk,t),c[1]]);
    Fr.push([c[0]+prof(Frp,t),c[1]]);
  }
  const pts=[].concat(B,Fr.slice().reverse());
  trace(ctx,pts);
  ctx.save();ctx.clip();
  const g=ctx.createLinearGradient(hip[0]-16,0,hip[0]+16,0);
  g.addColorStop(0,C.skinD);g.addColorStop(.42,C.skinL);g.addColorStop(1,C.skinD);
  ctx.fillStyle=g;ctx.fillRect(hip[0]-40,sh[1]-12,80,TORSO+24);
  function fb(t0,t1,fill){ctx.fillStyle=fill;ctx.fillRect(hip[0]-30,hip[1]-TORSO*t1,60,TORSO*(t1-t0));}
  /* ---- קנון נועה: תחתון תחרה סגול, גזרה נמוכה, חוטי קשירה בצד ---- */
  fb(-0.06,0.168,C.bra);
  fb(0.168,0.188,C.braD);
  ctx.fillStyle=C.braL;
  for(let i=0;i<7;i++){
    const tt=0.168-i*0.026, w=prof(Frp,tt);
    ctx.fillRect(hip[0]+w-2.4,hip[1]-TORSO*(tt+0.013),2.4,TORSO*0.028);
    ctx.fillRect(hip[0]-w,hip[1]-TORSO*(tt+0.013),2.4,TORSO*0.028);
  }
  fb(0.50,1.16,C.bra);
  /* ---- מחשוף V אמיתי: חיתוך בצווארון, לא קו דקורטיבי ---- */
  const vApex=0.60, vTop=1.20, vW=14;
  const vy=function(tv){return hip[1]-TORSO*tv;};
  ctx.beginPath();
  ctx.moveTo(hip[0]-vW, vy(vTop));
  ctx.lineTo(hip[0], vy(vApex));
  ctx.lineTo(hip[0]+vW, vy(vTop));
  ctx.closePath();
  ctx.fillStyle=g;ctx.fill();
  /* שולי החיתוך: צל בד + תפר זהב דק */
  ctx.lineJoin='round';
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2.2;
  ctx.beginPath();
  ctx.moveTo(hip[0]-vW, vy(vTop));ctx.lineTo(hip[0], vy(vApex));ctx.lineTo(hip[0]+vW, vy(vTop));
  ctx.stroke();
  ctx.strokeStyle='rgba(187,140,232,.92)';ctx.lineWidth=1;ctx.stroke();
  /* קנון: בלי כתפיות. שולי תחרה פתוחים בקצה התחתון של הפס */
  ctx.strokeStyle='rgba(168,107,214,.8)';ctx.lineWidth=1;ctx.setLineDash([1.8,2.2]);
  ctx.beginPath();ctx.moveTo(hip[0]-prof(Frp,0.505),vy(0.505));ctx.lineTo(hip[0]+prof(Frp,0.505),vy(0.505));
  ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
  trace(ctx,pts);ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.9;ctx.stroke();
  drawLeg(ctx,legs[0],false);
  drawShoe(ctx,legs[0].ankle,legs[0].knee,1);
  drawShoe(ctx,legs[1].ankle,legs[1].knee,-1);
  drawArm(ctx,arms[0],false);
  /* head front */
  const c=[hip[0],sh[1]-NECK-HEADR*0.92];
  bone(ctx,[c[0],c[1]+11],[c[0],c[1]+4],R.neck,C.skinD,C.skin,C.skinDD,'rgba(0,0,0,.2)');
  ctx.fillStyle=C.hair;
  ctx.beginPath();ctx.ellipse(c[0],c[1]-1.6,11.4,11.6,0,0,7);ctx.fill();
  /* שיער ארוך גלי משני צדי הפנים — נועה */
  [-1,1].forEach(function(s){
    ctx.beginPath();
    ctx.moveTo(c[0]+s*10.4,c[1]-4.6);
    ctx.bezierCurveTo(c[0]+s*15.8,c[1]+3.6,c[0]+s*13.8,c[1]+15.6,c[0]+s*9.6,c[1]+24.4);
    ctx.bezierCurveTo(c[0]+s*7.4,c[1]+26,c[0]+s*5.2,c[1]+24.4,c[0]+s*5.6,c[1]+21.4);
    ctx.bezierCurveTo(c[0]+s*9.4,c[1]+13.4,c[0]+s*9.6,c[1]+5,c[0]+s*7.1,c[1]-1.8);
    ctx.closePath();ctx.fillStyle=C.hair;ctx.fill();
  });
  const fg=ctx.createRadialGradient(c[0]-3,c[1]-4,2,c[0],c[1],12);
  fg.addColorStop(0,C.skinL);fg.addColorStop(.7,C.skin);fg.addColorStop(1,C.skinD);
  ctx.beginPath();ctx.ellipse(c[0],c[1]+1.2,9.2,10,0,0,7);ctx.fillStyle=fg;ctx.fill();
  ctx.fillStyle='#5d6b33';
  ctx.beginPath();ctx.ellipse(c[0]-3.4,c[1]-0.6,1.25,1.5,0,0,7);ctx.fill();
  ctx.beginPath();ctx.ellipse(c[0]+3.4,c[1]-0.6,1.25,1.5,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(150,80,70,.8)';ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(c[0]-2,3.8);ctx.quadraticCurveTo(c[0],5,c[0]+2,3.8);ctx.stroke();
  ctx.fillStyle=C.hair;
  ctx.beginPath();ctx.moveTo(c[0]-11,-2);ctx.quadraticCurveTo(c[0]-9,-12,c[0],-12.4);
  ctx.quadraticCurveTo(c[0]+9,-12,c[0]+11,-2);ctx.quadraticCurveTo(c[0]+4,-7.6,c[0]-4,-7.6);
  ctx.quadraticCurveTo(c[0]-8,-6,c[0]-11,-2);ctx.fill();
  if((p.prop||'').includes('dumbbell'))dumbbell(ctx,hands[0],1);
}

/* ---------- frame ---------- */
function bg(ctx){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#18202c');g.addColorStop(.62,'#101620');g.addColorStop(1,'#080b10');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const r=ctx.createRadialGradient(W*.5,96,8,W*.5,96,215);
  r.addColorStop(0,'rgba(187,140,232,.11)');r.addColorStop(1,'rgba(187,140,232,0)');
  ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
}
function floorLine(ctx){
  const g=ctx.createLinearGradient(0,GROUND-3,0,GROUND+8);
  g.addColorStop(0,'rgba(187,140,232,.13)');g.addColorStop(1,'rgba(187,140,232,0)');
  ctx.fillStyle=g;ctx.fillRect(24,GROUND-3,252,11);
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(18,GROUND+.5);ctx.lineTo(282,GROUND+.5);ctx.stroke();
}
function legacy(p){
  if(p.hip||p.sa||p.view==='front')return p;
  const o={view:p.view||'side',dir:p.facing||1,tilt:p.lean||0,hip:[p.hx!==undefined?p.hx:150,p.hy!==undefined?p.hy:150],
    feet:[[(p.hx||150)-((p.spread||16)),(p.footY||254)],[(p.hx||150)+(p.spread||16),(p.footY||254)]],
    hands:[[(p.hx||150)-(p.armOut||22)-8,((p.hy||150)-52+26)+(p.handDrop||24)],
           [(p.hx||150)+(p.armOut||22)+8,((p.hy||150)-52+26)+(p.handDrop||24)]],
    prop:p.prop};
  return o;
}
/* ---------- הגדרת שרירים על הגוף (צל+אור, לא לבוש) ---------- */
function muscleDefs(ctx,r){
  const {hip,sh,dir}=r;
  const u=[sh[0]-hip[0],sh[1]-hip[1]],L=Math.hypot(u[0],u[1])||1;
  const U=[u[0]/L,u[1]/L], F=[-dir*U[1],dir*U[0]];
  const P=(t,o)=>{const c=[hip[0]+u[0]*t,hip[1]+u[1]*t];return [c[0]+F[0]*o,c[1]+F[1]*o];};
  const line=(a,b,w,alpha,light)=>{
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
    ctx.lineWidth=w;
    ctx.strokeStyle=light?'rgba(255,236,214,'+alpha+')':'rgba(90,44,26,'+alpha+')';
    ctx.lineCap='round';ctx.stroke();
  };
  ctx.save();
  /* בטן: שלוש שורות */
  for(let i=0;i<3;i++){
    const t=0.30+i*0.075;
    line(P(t,-5.5),P(t,5.5),1.5,0.20,false);
    line(P(t+0.012,-5.2),P(t+0.012,5.2),0.9,0.13,true);
  }
  /* אלכסוני בטן (אובליק) */
  line(P(0.20,-7.5),P(0.40,-4.5),1.5,0.16,false);
  line(P(0.20,7.5),P(0.40,4.5),1.5,0.16,false);
  /* טרפז */
  line([sh[0],sh[1]],P(0.90,-4.0),2.0,0.18,false);
  line([sh[0],sh[1]],P(0.90,4.0),2.0,0.18,false);
  /* דלתא */
  ctx.beginPath();ctx.arc(sh[0]+F[0]*2,sh[1]+3,6.5,0,7);
  ctx.strokeStyle='rgba(90,44,26,.18)';ctx.lineWidth=1.4;ctx.stroke();
  /* ישבן: קמט תחתון + הפרדה */
  const g=[hip[0]-U[0]*5-F[0]*6,hip[1]-U[1]*5-F[1]*6];
  ctx.beginPath();ctx.moveTo(g[0]-U[0]*7,g[1]-U[1]*7);ctx.lineTo(g[0]+U[0]*7,g[1]+U[1]*7);
  ctx.strokeStyle='rgba(90,44,26,.30)';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.moveTo(g[0]-F[0]*10,g[1]-F[1]*10);ctx.lineTo(g[0]-F[0]*2+U[0]*2,g[1]-F[1]*2+U[1]*2);
  ctx.lineWidth=1.3;ctx.stroke();
  /* ירך קדמית (ארבע ראשי) ואחורית (המסטרינג) + שוק */
  r.legs.forEach(function(leg,idx){
    const hb=leg.hip,kb=leg.knee,ab=leg.ankle, far=idx===1&&r.legs.length>1;
    const dx=kb[0]-hb[0],dy=kb[1]-hb[1],LL=Math.hypot(dx,dy)||1;
    const nx=-dy/LL,ny=dx/LL;
    const al=far?0.10:0.18;
    for(let k=-1;k<=1;k++){
      const o=k*4.2;
      ctx.beginPath();
      ctx.moveTo(hb[0]+nx*o+dx*0.15,hb[1]+ny*o+dy*0.15);
      ctx.lineTo(kb[0]+nx*o-dx*0.10,kb[1]+ny*o-dy*0.10);
      ctx.strokeStyle='rgba(90,44,26,'+al+')';ctx.lineWidth=1.2;ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(hb[0]-nx*7,hb[1]-ny*7);ctx.lineTo(kb[0]-nx*5.5,kb[1]-ny*5.5);
    ctx.strokeStyle='rgba(255,236,214,'+(far?0.07:0.14)+')';ctx.lineWidth=2.0;ctx.stroke();
    /* שוק */
    const sx=ab[0]-kb[0],sy=ab[1]-kb[1],SL=Math.hypot(sx,sy)||1;
    ctx.beginPath();
    ctx.moveTo(kb[0]+sx*0.25-(sy/SL)*5,kb[1]+sy*0.25+(sx/SL)*5);
    ctx.lineTo(kb[0]+sx*0.75-(sy/SL)*4,kb[1]+sy*0.75+(sx/SL)*4);
    ctx.strokeStyle='rgba(90,44,26,'+(far?0.08:0.16)+')';ctx.lineWidth=1.3;ctx.stroke();
  });
  ctx.restore();
}

function draw(ctx,p0,opts){
  const p=legacy(p0||{});
  opts=opts||{};
  ctx.clearRect(0,0,W,H);
  bg(ctx);
  if(opts.ground!==false)floorLine(ctx);
  ctx.save();ctx.translate(W/2,GROUND);ctx.scale(1.07,1.07);ctx.translate(-W/2,-GROUND);
  if(p.view==='front')frontFigure(ctx,p);else sideFigure(ctx,p);
  try{ if(opts.defs!==false) muscleDefs(ctx,rig(p)); }catch(_){}
  if(opts.arrow&&p.arrow){
    ctx.save();ctx.strokeStyle='rgba(187,140,232,.75)';ctx.lineWidth=2.6;ctx.setLineDash([5,5]);
    ctx.beginPath();ctx.moveTo(p.arrow[0],p.arrow[1]);ctx.lineTo(p.arrow[2],p.arrow[3]);ctx.stroke();ctx.setLineDash([]);
    const ang=Math.atan2(p.arrow[3]-p.arrow[1],p.arrow[2]-p.arrow[0]);
    ctx.translate(p.arrow[2],p.arrow[3]);ctx.rotate(ang);ctx.fillStyle='rgba(187,140,232,.95)';
    ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(-10,-5);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
/* ---------- animation ---------- */
function blend(a,b,t){
  if(typeof a==='number'&&typeof b==='number')return lerp(a,b,t);
  if(Array.isArray(a)&&Array.isArray(b)){
    const n=Math.max(a.length,b.length),o=[];
    for(let i=0;i<n;i++)o.push(blend(a[i]!==undefined?a[i]:b[i],b[i]!==undefined?b[i]:a[i],t));
    return o;
  }
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
    const o={},ks=new Set(Object.keys(a).concat(Object.keys(b)));
    ks.forEach(k=>{o[k]=(a[k]!==undefined&&b[k]!==undefined)?blend(a[k],b[k],t):(t<.5?a[k]:b[k]);});
    return o;
  }
  return t<.5?a:b;
}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
function phasePose(frames,phase){
  const n=frames.length,x=((phase%1)+1)%1*n;
  const i=Math.floor(x),t=ease(x-i);
  const o=blend(frames[i%n],frames[(i+1)%n],t);
  if(frames[i%n].arrow&&frames[(i+1)%n].arrow){
    const A=frames[i%n].arrow,B=frames[(i+1)%n].arrow;
    o.arrow=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t),lerp(A[3],B[3],t)];
  }
  return o;
}
window.FIG={draw,phasePose,W,H,GROUND,blend,lerp,bg,rig};
})();
