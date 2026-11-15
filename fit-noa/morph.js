/* שימי פיט · מנוע ההדמיה v2
   ההדמיה מבוססת על צילום הצד (פרופיל הישבן), לא על החזית.
   מה משתנה לאורך הסליידר 1..4, ברציפות:
   1) קו המתאר האמיתי של הגוף (מבוסס סילואטה): בטן ומותן נכנסים, ישבן עולה ונבלט, ירך נדחסת
   2) אחוז שומן: החלקה והבהרה של רקמה רכה באזורי השומן, הפחתת "ריפוד"
   3) טונוס שריר: הדגשת מבנה ושקעים (קונטור, אור-צל) על הישבן, הירך והשוק
   המדידות נגזרות מהצילום והגובה/משקל/BMI. זו הדמיה, לא תחזית רפואית. */
(function(){
const W=360,H=480;

function loadImg(url){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=url;});}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const gauss=(y,c,sig)=>{const d=(y-c)/sig;return Math.exp(-0.5*d*d);};

/* ---------- ניתוח סילואטה: עור + רכיב מחובר מרכזי, עמיד לרקע לא אחיד ---------- */
function silhouette(img,cw){
  cw=cw||220;
  const ch=Math.round(cw*img.height/img.width);
  const c=document.createElement('canvas');c.width=cw;c.height=ch;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,cw,ch);
  const d=x.getImageData(0,0,cw,ch).data;
  const N=cw*ch, mask=new Uint8Array(N), bgm=new Uint8Array(N);
  // רקע: ממוצע מסגרת היקפית (חציון) לכל ערוץ
  const edge=[];
  for(let X=0;X<cw;X+=3){edge.push((X)*4,((ch-1)*cw+X)*4);}
  for(let Y=0;Y<ch;Y+=3){edge.push((Y*cw)*4,(Y*cw+cw-1)*4);}
  const med=k=>{const v=edge.map(i=>d[i+k]).sort((a,b)=>a-b);return v[v.length>>1];};
  const bg=[med(0),med(1),med(2)];
  const spread=edge.reduce((s2,i)=>s2+Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2]),0)/edge.length;
  for(let i=0;i<N;i++){
    const r=d[i*4],g=d[i*4+1],b=d[i*4+2];
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    // עור: R>G>B, רוויה בינונית, בהירות לא קיצונית (עובד גם לגוונים כהים וגם לבהירים)
    const skin=(r>55&&r>=g&&g>=b*0.92&&(r-b)>14&&(r-b)<130&&mx<252&&(mx-mn)/mx>0.10);
    // בגד: כהה או תכלת בהיר/צבעוני שונה מהרקע
    const dist=Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2]);
    mask[i]=(skin||dist>90)?1:0;
  }
  // סגירה מורפולוגית קלה כדי לחבר בגד לעור
  const dil=new Uint8Array(N);
  for(let y=1;y<ch-1;y++)for(let X=1;X<cw-1;X++){const i=y*cw+X;if(mask[i]||mask[i-1]||mask[i+1]||mask[i-cw]||mask[i+cw])dil[i]=1;}
  const cl=new Uint8Array(N);
  for(let y=1;y<ch-1;y++)for(let X=1;X<cw-1;X++){const i=y*cw+X;if(dil[i]&&dil[i-1]&&dil[i+1]&&dil[i-cw]&&dil[i+cw])cl[i]=1;}
  // רכיב מחובר הגדול ביותר שמכיל את מרכז התמונה (או הגדול ביותר)
  const lab=new Int32Array(N);let best=0,bestId=0,id=0;const stack=[];
  for(let i=0;i<N;i++){
    if(!cl[i]||lab[i])continue;
    id++;let cnt=0;stack.push(i);lab[i]=id;
    while(stack.length){const q=stack.pop();cnt++;const qx=q%cw,qy=(q/cw)|0;
      if(qx>0&&cl[q-1]&&!lab[q-1]){lab[q-1]=id;stack.push(q-1);}
      if(qx<cw-1&&cl[q+1]&&!lab[q+1]){lab[q+1]=id;stack.push(q+1);}
      if(qy>0&&cl[q-cw]&&!lab[q-cw]){lab[q-cw]=id;stack.push(q-cw);}
      if(qy<ch-1&&cl[q+cw]&&!lab[q+cw]){lab[q+cw]=id;stack.push(q+cw);}
    }
    // מעדיפים רכיב קרוב למרכז
    const cx=(i%cw), score=cnt*(1-Math.abs(cx-cw/2)/cw*0.6);
    if(score>best){best=score;bestId=id;}
  }
  const left=new Float32Array(ch).fill(-1), right=new Float32Array(ch).fill(-1);
  for(let y=0;y<ch;y++){
    let l=-1,r=-1;
    for(let X=0;X<cw;X++){if(lab[y*cw+X]===bestId){if(l<0)l=X;r=X;}}
    if(l>=0&&r-l>2){left[y]=l;right[y]=r+1;}
  }
  let top=-1,bot=-1;
  for(let y=0;y<ch;y++){if(left[y]>=0){if(top<0)top=y;bot=y;}}
  const ok=top>=0&&bot-top>ch*0.35;
  return {ok,cw,ch,left,right,top,bot,spread,bg,area:best};
}

/* ---------- ניתוח: מדידת צורה מצילום הצד ---------- */
function analyzeSide(img){
  const s=silhouette(img);
  if(!s.ok)return {ok:false,conf:0,reason:'לא זוהתה דמות ברקע אחיד'};
  const span=s.bot-s.top;
  const wAt=f=>{const y=Math.round(s.top+span*f);return (s.right[y]>=0)?s.right[y]-s.left[y]:0;};
  const segMax=(a,b)=>{let m=0;for(let y=Math.round(s.top+span*a);y<Math.round(s.top+span*b);y++){const w=s.right[y]>=0?s.right[y]-s.left[y]:0;if(w>m)m=w;}return m;};
  const segMin=(a,b)=>{let m=1e9;for(let y=Math.round(s.top+span*a);y<Math.round(s.top+span*b);y++){const w=s.right[y]>=0?s.right[y]-s.left[y]:0;if(w>3&&w<m)m=w;}return m===1e9?0:m;};
  const chest=segMax(0.18,0.32), waist=segMin(0.34,0.50), glute=segMax(0.50,0.66), thigh=segMax(0.62,0.76);
  // כיוון הפנייה: הצד שבו הבליטה (בטן/חזה) לעומת הישבן
  let cL=0,cR=0;for(let y=Math.round(s.top+span*0.3);y<Math.round(s.top+span*0.5);y++){if(s.left[y]>=0){cL+=s.left[y];cR+=s.right[y];}}
  const mid=(cL+cR)/2/Math.max(1,(Math.round(s.top+span*0.5)-Math.round(s.top+span*0.3)));
  const conf=clamp(1-s.spread/60,0,1)*((chest&&waist&&glute)?1:0.4);
  return {ok:true,conf:+conf.toFixed(2),chest,waist,glute,thigh,
    gw:glute&&waist?+(glute/waist).toFixed(2):0,
    top:s.top/s.ch,bottom:s.bot/s.ch,cw:s.cw,ch:s.ch,
    facing:0};
}
// נשמר לתאימות אחורה: ניתוח כללי (נקרא מהחזית אם אין צד)
function analyze(img){return analyzeSide(img);}

/* ---------- פרופיל גוף ---------- */
function metrics(p,level){
  const h=(p.height||175)/100, w=p.weight||75, age=p.age||30, sex=p.sex==='f'?0:1;
  const bmi=+(w/(h*h)).toFixed(1);
  let bf=1.20*bmi + 0.23*age - 10.8*sex - 5.4;
  bf=clamp(bf,5,55);
  // יעד אחוז שומן חכם לפי מין, רמה ומצב התחלתי (לא יורד מתחת לרצפה בריאה)
  const floor=sex?9:17;
  const frac=[0,0.28,0.50,0.75,1.0];
  const maxLoss=Math.max(0,bf-floor)*0.75;
  const L=clamp(level,1,4), i=Math.floor(L), f=L-i;
  const fr=(i>=4)?frac[4]:lerp(frac[i],frac[i+1],f);
  const delta=+(maxLoss*fr).toFixed(1);
  const target=+(bf-delta).toFixed(1);
  return {bmi,bf:+bf.toFixed(1),target,delta,sex,floor,
    // מדדים נגזרים להדמיה: תחתית שומן וגובה טונוס
    fatLossK:delta/Math.max(1,bf), toneK:(L-1)/3};
}
function weeks(level){
  const L=clamp(level,1,4);
  return Math.round(lerp(10,16,(L-1)/3)+ (L>=3?2:0));
}

/* ---------- תזוזת קו מתאר (פרופיל גוף) ---------- */
// מחזיר לכל גובה מנורמל (0..1 לאורך הגוף) את התזוזה בפיקסלים (יחסית לרוחב הדמות) לקדימה/אחורה
function outlineShift(level,sex,fat){
  const k=(clamp(level,1,4)-1)/3;           // 0..1 לאורך הסליידר
  const f=clamp(fat,0.08,0.45);              // שומן התחלתי
  const lossK=k*clamp((f-0.12)/0.25,0.25,1); // כמה שומן באמת יורד
  return function(yn){
    // yn = מיקום יחסי בין top ל-bottom
    const belly   = -0.075*lossK * gauss(yn,0.43,0.055); // בטן נכנסת
    const waistIn = -0.045*lossK * gauss(yn,0.36,0.045); // מותן
    const lowBack = -0.012*k      * gauss(yn,0.40,0.04);
    const gluteBack= +0.085*k     * gauss(yn,0.50,0.055);
    const gluteUp  = +0.030*k     * gauss(yn,0.465,0.040);// הרמת הישבן
    const thighFat = -0.030*lossK * gauss(yn,0.62,0.060); // ירך קדמית נחה
    const thighTone= +0.014*k     * gauss(yn,0.60,0.050);
    const calf     = +0.012*k     * gauss(yn,0.80,0.040);
    const chest    = +0.015*k     * gauss(yn,0.20,0.050);
    return {front:belly+waistIn+thighFat-chest*0.3, back:lowBack+gluteBack+gluteUp+thighTone+calf, lift:0.020*k*gauss(yn,0.50,0.075)};
  };
}

/* ---------- ציור: גריד עיוות ---------- */
function coverRect(iw,ih,cw,ch){
  const s=Math.max(cw/iw,ch/ih);
  const w=iw*s,h=ih*s;
  return {x:(cw-w)/2,y:(ch-h)/2,w,h,s};
}
/* התמונה נכנסת שלמה לתוך הקנבס, בלי חיתוך ובלי מתיחה */
function fitContain(iw,ih,cw,ch){
  const s=Math.min(cw/iw,ch/ih);
  const w=iw*s,h=ih*s;
  return {x:(cw-w)/2,y:(ch-h)/2,w,h,s};
}
let _pk=null,_pv=null;
/* פרופיל הגוף: לכל שורה מחפשים איפה הדמות נגמרת מול הרקע שבשולי אותה שורה.
   זה עמיד גם לרקע בהיר וגם לקיר בגוון עור, כי משווים תמיד לשכנים של אותה שורה. */
function profileOf(img,cw,ch){
  const key=(img.currentSrc||img.src||'img')+'|'+cw+'|'+ch;
  if(_pk===key&&_pv)return _pv;
  const c=document.createElement('canvas');c.width=cw;c.height=ch;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#0c1016';x.fillRect(0,0,cw,ch);
  const f=fitContain(img.width,img.height,cw,ch);
  x.drawImage(img,f.x,f.y,f.w,f.h);
  const d=x.getImageData(0,0,cw,ch).data;
  const X0=Math.max(0,Math.round(f.x)),X1=Math.min(cw-1,Math.round(f.x+f.w)-1);
  const Y0=Math.max(0,Math.round(f.y)),Y1=Math.min(ch-1,Math.round(f.y+f.h)-1);
  const mg=Math.max(3,Math.round((X1-X0)*0.035));
  const left=new Float32Array(ch).fill(-1),right=new Float32Array(ch).fill(-1);
  const rawL=new Float32Array(ch).fill(-1),rawR=new Float32Array(ch).fill(-1);
  function chMed(arr,k){const v=arr.map(function(o){return d[o+k];}).sort(function(a,b){return a-b;});return v[v.length>>1];}
  const TH=115;
  for(let y=Y0;y<=Y1;y++){
    const row=y*cw*4;
    const offL=[],offR=[];
    for(let px=X0;px<Math.min(X1,X0+mg);px++)offL.push(row+px*4);
    for(let px=Math.max(X0,X1-mg+1);px<=X1;px++)offR.push(row+px*4);
    if(!offL.length||!offR.length)continue;
    const bl=[chMed(offL,0),chMed(offL,1),chMed(offL,2)];
    const br=[chMed(offR,0),chMed(offR,1),chMed(offR,2)];
    let l=-1,r=-1;
    for(let px=X0;px<=X1;px++){
      const o=row+px*4;
      if(Math.abs(d[o]-bl[0])+Math.abs(d[o+1]-bl[1])+Math.abs(d[o+2]-bl[2])>TH){l=px;break;}
    }
    for(let px=X1;px>=X0;px--){
      const o=row+px*4;
      if(Math.abs(d[o]-br[0])+Math.abs(d[o+1]-br[1])+Math.abs(d[o+2]-br[2])>TH){r=px;break;}
    }
    if(l>=0&&r>l+3){rawL[y]=l;rawR[y]=r+1;}
  }
  /* החלקה חציונית לאורך השורות + השלמת חורים בין השורות הזמינות */
  const W5=3;
  for(let y=Y0;y<=Y1;y++){
    if(rawL[y]<0)continue;
    const ls=[],rs=[];
    for(let k=-W5;k<=W5;k++){const yy=y+k;if(yy<Y0||yy>Y1)continue;if(rawL[yy]>=0){ls.push(rawL[yy]);rs.push(rawR[yy]);}}
    ls.sort(function(a,b){return a-b;});rs.sort(function(a,b){return a-b;});
    left[y]=ls[ls.length>>1];right[y]=rs[rs.length>>1];
  }
  let top=-1,bot=-1;
  for(let y=Y0;y<=Y1;y++){if(left[y]>=0&&right[y]-left[y]>=(X1-X0)*0.04){if(top<0)top=y;bot=y;}}
  if(top>=0){
    let prev=top;
    for(let y=top;y<=bot;y++){
      if(left[y]<0){ /* אינטרפולציה בין שורות תקפות */
        let nx=y;while(nx<=bot&&left[nx]<0)nx++;
        const ax=prev,bx2=(nx<=bot?nx:prev);
        for(let yy=y;yy<nx&&yy<=bot;yy++){
          const t=(yy-ax)/Math.max(1,bx2-ax);
          left[yy]=left[ax]+(left[bx2]-left[ax])*t;
          right[yy]=right[ax]+(right[bx2]-right[ax])*t;
        }
        y=nx;prev=nx>bot?prev:nx;
      } else prev=y;
    }
  }
  const borderPx=[];
  for(let px=X0;px<=X1;px+=2){borderPx.push((Y0*cw+px)*4,(Y1*cw+px)*4);}
  const bgv=[0,1,2].map(function(k){const v=borderPx.map(function(o){return d[o+k];}).sort(function(a,b){return a-b;});return v[v.length>>1]||0;});
  const v={c,f,left,right,top,bot,bg:bgv,ok:top>=0&&bot-top>(Y1-Y0)*0.28};
  _pk=key;_pv=v;return v;
}

/* האם קו המתאר שזוהה אמין: רוחב משתנה ולא כמעט כל רוחב התמונה */
function credible(pr){
  if(!pr||!pr.ok)return false;
  const span=pr.bot-pr.top;
  if(span<pr.left.length*0.15)return false;
  const ws=[];
  for(let fq=0.15;fq<=0.86;fq+=0.05){
    const y=Math.round(pr.top+span*fq),L=pr.left[y],R=pr.right[y];
    if(L>=0&&R>L)ws.push(R-L);
  }
  if(ws.length<6)return false;
  const mn=Math.min.apply(null,ws),mx=Math.max.apply(null,ws);
  const imgW=(pr.f&&pr.f.w)||pr.left.length;
  if(mx>imgW*0.86)return false;
  if(mx-mn<Math.max(4,imgW*0.05))return false;
  return true;
}
function drawWarped(ctx,img,level,opt){
  if(credible(opt.profile))return silhouetteWarp(ctx,img,level,opt);
  return shapeWarp(ctx,img,level,opt);
}
/* עיוות לפי ציר הגוף (עובד גם כשה-background לא חלק): הבטן והמותן נכנסות,
   הישבן מתרחב, והקצוות נשארים במקום כך שהרקע לא זז */
function shapeWarp(ctx,img,level,opt){
  const cw=opt.w, ch=opt.h, pr=opt.profile;
  const srcC=pr&&pr.c?pr.c:null;
  if(!srcC){ctx.drawImage(img,0,0,cw,ch);return;}
  const f=(pr&&pr.f)?pr.f:fitContain(img.width,img.height,cw,ch);
  const sc=srcC.getContext('2d',{willReadFrequently:true});
  const sd=sc.getImageData(0,0,cw,ch).data;
  const out=ctx.createImageData(cw,ch),od=out.data;
  const cx=f.x+f.w/2, R=Math.max(8,f.w*0.46);
  const k=(clamp(level,1,4)-1)/3;
  const fat=(opt.bf??25)/100;
  const lossK=k*clamp((fat-0.12)/0.25,0.25,1);
  const bands=[[0.44,0.085,-0.13*lossK],[0.36,0.060,-0.070*lossK],[0.52,0.060,+0.130*k],[0.66,0.070,-0.030*k]];
  const g=function(yn,c,sg){const t=(yn-c)/sg;return Math.exp(-0.5*t*t);};
  function samp(sx,sy,o){
    let x0=Math.floor(sx),y0=Math.floor(sy);
    if(x0<0)x0=0; if(x0>cw-2)x0=cw-2;
    if(y0<0)y0=0; if(y0>ch-2)y0=ch-2;
    const x1=x0+1,y1=y0+1;
    let fx=sx-x0,fy=sy-y0; fx=fx<0?0:(fx>1?1:fx); fy=fy<0?0:(fy>1?1:fy);
    const i00=(y0*cw+x0)*4,i10=i00+4,i01=(y1*cw+x0)*4,i11=i01+4;
    for(let c2=0;c2<3;c2++){
      const a=sd[i00+c2]+(sd[i10+c2]-sd[i00+c2])*fx;
      const b=sd[i01+c2]+(sd[i11+c2]-sd[i01+c2])*fx;
      od[o+c2]=a+(b-a)*fy;
    }
    od[o+3]=255;
  }
  for(let y=0;y<ch;y++){
    const o=y*cw*4;
    const yn=(y-f.y)/Math.max(1,f.h);
    let s=0;
    for(let i=0;i<bands.length;i++)s+=bands[i][2]*Math.exp(-0.5*Math.pow((yn-bands[i][0])/bands[i][1],2));
    const mult=1+s;
    if(Math.abs(mult-1)<0.004||yn<-0.05||yn>1.05){
      for(let x=0;x<cw;x++){const q=o+x*4;od[q]=sd[q];od[q+1]=sd[q+1];od[q+2]=sd[q+2];od[q+3]=255;}
      continue;
    }
    for(let x=0;x<cw;x++){
      const t=Math.abs(x-cx)/R;
      if(t>=1){const q=o+x*4;od[q]=sd[q];od[q+1]=sd[q+1];od[q+2]=sd[q+2];od[q+3]=255;continue;}
      const hw=Math.pow(1-t,1.5);
      const m=1+(mult-1)*hw;
      samp(cx+(x-cx)/m,y,o+x*4);
    }
  }
  ctx.putImageData(out,0,0);
}
function silhouetteWarp(ctx,img,level,opt){
  const cw=opt.w, ch=opt.h;
  const pr=opt.profile;
  /* בלי פרופיל גוף: מציירים את התמונה כמו שהיא, בלי עיוות */
  if(!pr||!pr.ok){
    ctx.drawImage(img,0,0,cw,ch);
    return false;
  }
  const top=opt.top??0.10, bottom=opt.bottom??0.94;
  const body=Math.max(0.2,bottom-top);
  const fat=(opt.bf??25)/100;
  const sh=outlineShift(level,opt.sex||'f',fat);
  const sc=pr.c.getContext('2d',{willReadFrequently:true});
  const sd=sc.getImageData(0,0,cw,ch).data;
  const out=ctx.createImageData(cw,ch);
  const od=out.data;
  const span=Math.max(1,pr.bot-pr.top);
  const ROW=cw*4;
  function sample(sx,sy,o){
    let x0=Math.floor(sx),y0=Math.floor(sy);
    if(x0<0)x0=0; if(x0>cw-2)x0=cw-2;
    if(y0<0)y0=0; if(y0>ch-2)y0=ch-2;
    const x1=x0+1,y1=y0+1;
    let fx=sx-x0,fy=sy-y0;
    fx=fx<0?0:(fx>1?1:fx); fy=fy<0?0:(fy>1?1:fy);
    const i00=(y0*cw+x0)*4,i10=i00+4,i01=((y1)*cw+x0)*4,i11=i01+4;
    for(let k=0;k<3;k++){
      const a=sd[i00+k]+(sd[i10+k]-sd[i00+k])*fx;
      const b=sd[i01+k]+(sd[i11+k]-sd[i01+k])*fx;
      od[o+k]=a+(b-a)*fy;
    }
    od[o+3]=255;
  }
  for(let y=0;y<ch;y++){
    const L=pr.left[y],R=pr.right[y];
    const base=y*ROW;
    if(L<0||R-L<4){
      for(let x=0;x<cw;x++)osdCopy(base+x*4);
      continue;
    }
    const yn=(y-pr.top)/span;
    if(yn<-0.06||yn>1.06){for(let x=0;x<cw;x++)osdCopy(base+x*4);continue;}
    const m=sh(yn);
    const bw=Math.max(6,R-L);
    /* פנימה: הבטן והמותן נכנסות. החוצה: הישבן נדחף אחורה. */
    const inward=Math.max(0,-m.front)*bw;
    const outward=Math.max(0,m.back)*bw;
    let nL=L+inward*1.00-outward*0.40;
    let nR=R-inward*1.00+outward*0.40;
    if(nL<1)nL=1; if(nR>cw-2)nR=cw-2;
    if(nR-nL<4){nL=L;nR=R;}
    const srcY=y+(m.lift||0)*bw*0.9;
    for(let x=0;x<cw;x++){
      let sx;
      if(x<nL) sx=L*(x/nL);
      else if(x<=nR) sx=L+(R-L)*((x-nL)/(nR-nL));
      else sx=R+(cw-1-R)*((x-nR)/(cw-1-nR));
      sample(sx,srcY,base+x*4);
    }
  }
  ctx.putImageData(out,0,0);
  return;
  function osdCopy(o){od[o]=sd[o];od[o+1]=sd[o+1];od[o+2]=sd[o+2];od[o+3]=255;}
}

/* ---------- שכבות טונוס ושומן (מבוססות תמונה) ----------
   שומן יורד  = ריכוך שקט של אזורי רקמה רכה + הבהרה (פחות "ריפוד", עור מתוח)
   טונוס עולה = חידוד אמיתי (unsharp) על אזורי השריר + קווי אור/צל שמגדירים את השריר
   הכול ממוסך לפי אזור בגוף ומוגבל לתוך הסילואטה, כך שהרקע לא משתנה. */
function bodyMask(ctx,img,opt){
  /* מסכת הגוף מגיעה מקו המתאר שזוהה בתמונה עצמה — לא מניחוש צבע */
  const cw=opt.w,ch=opt.h;
  const pr=opt.profile;
  const m=document.createElement('canvas');m.width=cw;m.height=ch;
  const mc=m.getContext('2d');
  const out=mc.createImageData(cw,ch);
  if(pr&&pr.ok&&credible(pr)){
    for(let y=0;y<ch;y++){
      const L=pr.left[y],R=pr.right[y],row=y*cw*4;
      for(let x=0;x<cw;x++){
        const o=row+x*4;
        out.data[o]=out.data[o+1]=out.data[o+2]=255;
        out.data[o+3]=(L>=0&&x>=L&&x<=R)?255:0;
      }
    }
  } else {
    /* בלי קו מתאר אמין: אליפסה רכה במרכז — מחייב לא נוגעים בשוליים */
    const f=opt.profile&&opt.profile.f?opt.profile.f:fitContain(img.width,img.height,cw,ch);
    const cx=f.x+f.w/2, cy=f.y+f.h*0.56, rx=f.w*0.32, ry=f.h*0.44;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const dx=(x-cx)/rx, dy=(y-cy)/ry, q=dx*dx+dy*dy, o=(y*cw+x)*4;
      out.data[o]=out.data[o+1]=out.data[o+2]=255;
      out.data[o+3]=q<1?Math.round(255*Math.pow(1-q,0.6)):0;
    }
  }
  mc.putImageData(out,0,0);
  const soft=document.createElement('canvas');soft.width=cw;soft.height=ch;
  const sc=soft.getContext('2d');sc.filter='blur(2.5px)';sc.drawImage(m,0,0);sc.filter='none';
  return soft;
}
function zoneMask(cw,ch,yAt,r,body,zones,k){
  const z=document.createElement('canvas');z.width=cw;z.height=ch;
  const zc=z.getContext('2d');
  zones.forEach(zn=>{
    const y0=yAt(zn.c),sig=zn.s*body*r.h*2.4;
    const g=zc.createLinearGradient(0,y0-sig,0,y0+sig);
    g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.5,'rgba(255,255,255,'+Math.min(1,zn.a*k).toFixed(3)+')');g.addColorStop(1,'rgba(255,255,255,0)');
    zc.fillStyle=g;zc.fillRect(0,0,cw,ch);
  });
  return z;
}
function applyMasked(ctx,layer,mask1,mask2,blend,alpha){
  const cw=ctx.canvas.width,ch=ctx.canvas.height;
  const t=document.createElement('canvas');t.width=cw;t.height=ch;
  const tc=t.getContext('2d');
  tc.drawImage(layer,0,0);
  tc.globalCompositeOperation='destination-in';
  if(mask1)tc.drawImage(mask1,0,0);
  if(mask2)tc.drawImage(mask2,0,0);
  ctx.save();ctx.globalCompositeOperation=blend||'source-over';ctx.globalAlpha=alpha==null?1:alpha;ctx.drawImage(t,0,0);ctx.restore();
}
function toneLayers(ctx,img,level,opt){
  const cw=opt.w, ch=opt.h, k=(clamp(level,1,4)-1)/3;
  if(k<0.02)return;
  const top=opt.top??0.10, bottom=opt.bottom??0.94, body=Math.max(0.2,bottom-top);
  const r={w:cw,h:ch};
  const yAt=f=>(top+body*f)*ch;
  const fat=(opt.bf??25)/100, lossK=k*clamp((fat-0.12)/0.25,0.25,1);
  const bm=bodyMask(ctx,img,opt);
  const base=document.createElement('canvas');base.width=cw;base.height=ch;
  base.getContext('2d').drawImage(ctx.canvas,0,0);

  // ===== 1) שומן יורד: ריכוך עדין והבהרה באזורי הבטן/מותן/ירך =====
  const smooth=document.createElement('canvas');smooth.width=cw;smooth.height=ch;
  const smc=smooth.getContext('2d');
  smc.filter='blur('+(1.6+2.4*lossK).toFixed(1)+'px) brightness('+(1+0.07*lossK).toFixed(3)+') contrast('+(1-0.10*lossK).toFixed(3)+')';
  smc.drawImage(base,0,0);smc.filter='none';
  const fatZ=zoneMask(cw,ch,yAt,r,body,[{c:0.43,s:0.060,a:0.95},{c:0.36,s:0.050,a:0.75},{c:0.60,s:0.060,a:0.60}],lossK);
  applyMasked(ctx,smooth,fatZ,bm,'source-over',0.85*lossK);

  // ===== 2) טונוס: חידוד אמיתי (unsharp) על אזורי שריר =====
  const blur=document.createElement('canvas');blur.width=cw;blur.height=ch;
  const bc=blur.getContext('2d');bc.filter='blur(5px)';bc.drawImage(base,0,0);bc.filter='none';
  const bd=blur.getContext('2d').getImageData(0,0,cw,ch);
  const od=base.getContext('2d').getImageData(0,0,cw,ch);
  const sharp=document.createElement('canvas');sharp.width=cw;sharp.height=ch;
  const sd=sharp.getContext('2d').createImageData(cw,ch);
  const amt=0.9+2.6*k;                       // כמה חזק לחדד
  for(let i=0;i<cw*ch*4;i+=4){
    for(let c2=0;c2<3;c2++){
      const v=od.data[i+c2]+(od.data[i+c2]-bd.data[i+c2])*amt;
      sd.data[i+c2]=v<0?0:(v>255?255:v);
    }
    sd.data[i+3]=255;
  }
  sharp.getContext('2d').putImageData(sd,0,0);
  const muscleZ=zoneMask(cw,ch,yAt,r,body,[
    {c:0.50,s:0.080,a:1.00},   // ישבן
    {c:0.63,s:0.090,a:0.95},   // ירך
    {c:0.80,s:0.065,a:0.80},   // שוק
    {c:0.22,s:0.060,a:0.55},   // כתף/חזה
    {c:0.31,s:0.050,a:0.55}    // בטן עליונה/גב
  ],k);
  applyMasked(ctx,sharp,muscleZ,bm,'source-over',Math.min(1,0.45+0.6*k));

  // ===== 3) קונטור שרירי: אור-צל אנכי שמגדיר את צורת השריר (בלי לטשטש) =====
  const sh=document.createElement('canvas');sh.width=cw;sh.height=ch;
  const shc=sh.getContext('2d');
  const gx=shc.createLinearGradient(0,0,cw,0);
  gx.addColorStop(0.00,'rgba(0,0,0,'+(0.42*k).toFixed(3)+')');
  gx.addColorStop(0.30,'rgba(0,0,0,0)');
  gx.addColorStop(0.55,'rgba(255,245,230,'+(0.20*k).toFixed(3)+')');
  gx.addColorStop(0.80,'rgba(0,0,0,0)');
  gx.addColorStop(1.00,'rgba(0,0,0,'+(0.45*k).toFixed(3)+')');
  shc.fillStyle=gx;shc.fillRect(0,0,cw,ch);
  const conZ=zoneMask(cw,ch,yAt,r,body,[{c:0.52,s:0.085,a:1.0},{c:0.65,s:0.095,a:0.95},{c:0.80,s:0.07,a:0.7}],k);
  applyMasked(ctx,sh,conZ,bm,'soft-light',1);

  // ===== 4) שקע עדין בין שרירים (ירך חיצונית/ישבן) בקו אנכי =====
  const line=document.createElement('canvas');line.width=cw;line.height=ch;
  const lc=line.getContext('2d');
  const lg=lc.createLinearGradient(0,0,cw,0);
  lg.addColorStop(0.46,'rgba(0,0,0,0)');lg.addColorStop(0.50,'rgba(0,0,0,'+(0.5*k).toFixed(3)+')');lg.addColorStop(0.54,'rgba(0,0,0,0)');
  lc.fillStyle=lg;lc.fillRect(0,0,cw,ch);
  const grooveZ=zoneMask(cw,ch,yAt,r,body,[{c:0.62,s:0.070,a:0.85},{c:0.74,s:0.060,a:0.6}],k);
  applyMasked(ctx,line,grooveZ,bm,'multiply',0.55);

  // ===== 5) צבע עור בריא יותר (חם, מעט שזוף) רק על העור =====
  const warm=document.createElement('canvas');warm.width=cw;warm.height=ch;
  const wc=warm.getContext('2d');wc.fillStyle='rgba(214,150,96,'+(0.30*k).toFixed(3)+')';wc.fillRect(0,0,cw,ch);
  applyMasked(ctx,warm,bm,null,'soft-light',1);
}

function drawMorph(ctx,img,level,opt){
  opt=opt||{};
  const cw=opt.w||W, ch=opt.h||H;
  ctx.clearRect(0,0,cw,ch);
  ctx.fillStyle='#0c1016';ctx.fillRect(0,0,cw,ch);
  let pr=null;
  try{pr=profileOf(img,cw,ch);}catch(e){pr=null;}
  const o2=Object.assign({},opt,{w:cw,h:ch,profile:pr});
  if(pr&&pr.ok){o2.top=(pr.top/ch);o2.bottom=(pr.bot/ch);}
  drawWarped(ctx,img,level,o2);
  toneLayers(ctx,img,level,o2);
  if(opt.guides){
    ctx.save();ctx.strokeStyle='rgba(187,140,232,.28)';ctx.lineWidth=1;ctx.setLineDash([4,6]);
    [0.10,0.36,0.50,0.72].forEach(t=>{ctx.beginPath();ctx.moveTo(0,ch*t);ctx.lineTo(cw,ch*t);ctx.stroke();});
    ctx.restore();
  }
}


/* ---------- הערכת היקפים מסילואטות: חזית + צד ----------
   עיקרון: גובה האדם בפיקסלים = גובה אמיתי בס"מ, כך שכל פיקסל מתורגם לס"מ.
   רוחב (חזית) ועומק (צד) בכל גובה בגוף => היקף כאליפסה (נוסחת רמנוג'אן).
   אם חסר צילום צד, העומק מוערך מהרוחב לפי יחס טיפוסי לפי מין. */
function ellipseCirc(a,b){ // a,b חצאי צירים
  const h=Math.pow(a-b,2)/Math.pow(a+b,2);
  return Math.PI*(a+b)*(1+3*h/(10+Math.sqrt(4-3*h)));
}
function measureBody(frontImg,sideImg,p){
  const hcm=p.height||170, sex=p.sex==='f'?'f':'m';
  const F=frontImg?silhouette(frontImg,260):null;
  const S=sideImg?silhouette(sideImg,260):null;
  const okF=F&&F.ok, okS=S&&S.ok;
  if(!okF&&!okS)return {ok:false,reason:'לא זוהתה דמות. נדרש רקע אחיד וגוף מלא.'};
  const prof=(sil,f)=>{
    const span=sil.bot-sil.top, cm=hcm/span;      // ס"מ לפיקסל
    const w=y=>{const yy=Math.round(sil.top+span*y);return sil.right[yy]>=0?(sil.right[yy]-sil.left[yy])*cm:0;};
    const mx=(a,b)=>{let m=0;for(let t=a;t<=b;t+=0.005){m=Math.max(m,w(t));}return m;};
    const mn=(a,b)=>{let m=1e9;for(let t=a;t<=b;t+=0.005){const v=w(t);if(v>4&&v<m)m=v;}return m===1e9?0:m;};
    return {cm,span,w,mx,mn};
  };
  const pf=okF?prof(F,'f'):null, ps=okS?prof(S,'s'):null;
  // גובה מותן טיפוסי: 0.60-0.64 מגובה הראש (מלמעלה); ירכיים/ישבן: 0.50-0.56
  const waistW = pf? pf.mn(0.30,0.46):0;
  const hipW   = pf? pf.mx(0.46,0.58):0;
  const waistD = ps? ps.mn(0.30,0.46):0;
  const gluteD = ps? ps.mx(0.46,0.60):0;
  // השלמת הציר החסר מיחס טיפוסי (עומק/רוחב)
  const rW = sex==='f'?0.72:0.74;  // מותן
  const rH = sex==='f'?0.78:0.74;  // ירכיים
  const wW = waistW||(waistD/rW), wD = waistD||(waistW*rW);
  const hW = hipW||(gluteD/rH),  hD = gluteD||(hipW*rH);
  const waistC = ellipseCirc(wW/2,wD/2);
  const hipC   = ellipseCirc(hW/2,hD/2);
  const whr = hipC? waistC/hipC:0;
  // רקמות רכות מגדילות את הסילואטה: נתקן מעט כלפי מטה
  const corr=0.94;
  return {ok:true,
    sources:{front:!!okF,side:!!okS},
    waist:Math.round(waistC*corr), hip:Math.round(hipC*corr),
    whr:+whr.toFixed(2),
    conf:Math.round(((okF?0.5:0)+(okS?0.5:0))*100)/100*(1-Math.min(.5,(F?F.spread:S.spread)/120))};
}
// BMI מוערך מהסילואטה + גובה: נפח גוף כצילינדרים אליפטיים -> משקל, כבדיקת שפיות מול המשקל שהוזן
function estimateBMIfromShape(m,p){
  if(!m||!m.ok)return null;
  const hcm=p.height||170, h=hcm/100;
  // משקל מוערך מהיקפים: נוסחת אומדן מבוססת היקף מותן וירכיים (מקורבת)
  const sex=p.sex==='f'?0:1;
  const w=0.34*m.waist+0.25*m.hip + (hcm-100)*0.32 - (sex?8:12);
  const bmi=+(clamp(w,35,200)/(h*h)).toFixed(1);
  return {weight:Math.round(clamp(w,35,200)),bmi};
}

window.MORPH={measureBody,estimateBMIfromShape,silhouette,loadImg,analyze,analyzeSide,metrics,weeks,drawMorph,outlineShift,profileOf,W,H};
})();
