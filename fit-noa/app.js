/* שימי פיט · הלוגיקה */
(function(){
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const SKEY='shimifit_v1';
const native=(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.shimi)||null;

let S={
  name:'', sex:'m', age:30, height:175, weight:78, waist:0, hip:0,
  exp:0, level:2, photos:{front:null,side:null}, scan:null,
  minutes:0, intensity:0,
  plan:null, sessions:[], started:null,
  gymLoc:null, remindAt:'19:00', voice:true, locationOn:true, devid:'IPHONE-SUN'
};
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}
  try{fetch('api/state.php?op=save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(S)}).catch(()=>{});}catch(e){}}
function load(){try{const r=localStorage.getItem(SKEY);if(r)S=Object.assign(S,JSON.parse(r));}catch(e){}}
load();
const GX=(m,f)=>S.sex==='f'?f:m;                 // לשון פנייה לפי המגדר שנבחר
const TIER_MIN={1:18,2:24,3:30,4:50};
function prefMin(){const tr=Math.round(S.level||2);return +S.minutes||TIER_MIN[tr]||30;}
function prefInt(){return +S.intensity||Math.round(S.level||2)||2;}
function dispName(){return (S.name&&S.name!=='חבר'&&S.name!=='חברה')?S.name:GX('חבר','חברה');}
function buildPlan(){
  S.plan=DATA.plan(Math.round(S.level||2),S.sex,{minutes:prefMin(),intensity:prefInt()});
  return S.plan;
}
// הגירה חד-פעמית: שם ברירת מחדל שנשמר בעבר, ותוכניות מלפני מודל הזמן
if(S.name==='חבר'||S.name==='חברה')S.name='';
if(S.plan&&!S.plan.estimate)buildPlan();
try{const q=new URLSearchParams(location.search);if(q.get('photo')&&!S.photos.front){S.photos.front=q.get('photo');}}catch(e){}

/* ---------- קול ---------- */
let voiceOn=S.voice!==false;
function speak(t,rate){
  if(!voiceOn||!t)return;
  if(native){try{native.postMessage(JSON.stringify({cmd:'say',text:t,rate:rate||0.5}));return;}catch(e){}}
  try{
    const u=new SpeechSynthesisUtterance(t);
    u.lang='he-IL';u.rate=rate||1.0;u.pitch=1.02;
    const v=(speechSynthesis.getVoices()||[]).find(v=>/he/i.test(v.lang));
    if(v)u.voice=v;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){}
}
function haptic(p){if(native){try{native.postMessage(JSON.stringify({cmd:'haptic',style:p||'light'}));}catch(e){}}}
function notifyLocal(title,body){
  if(native){try{native.postMessage(JSON.stringify({cmd:'notify',title:title,body:body}));return;}catch(e){}}
  if('Notification' in window){
    if(Notification.permission==='granted') new Notification(title,{body:body});
    else if(Notification.permission!=='denied') Notification.requestPermission().then(p=>{if(p==='granted')new Notification(title,{body:body});});
  }
}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hide');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hide'),2200);}

/* ---------- ניווט ---------- */
let tab='today';
function go(t){tab=t;$$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));render();}
$$('.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));

/* ---------- אונבורדינג ---------- */
let obStep=1;
function setOb(n){
  obStep=n;
  $$('.ob-step').forEach(s=>s.classList.toggle('hide',+s.dataset.step!==n));
  $$('.steps i').forEach((i,k)=>i.classList.toggle('on',k<n));
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===2)updBmi();
  if(n===3)drawDemos();
  if(n===4)initGoal();
  if(n===5)finishOnboard();
}
$$('[data-next]').forEach(b=>b.onclick=()=>{if(!collect())return;setOb(obStep+1);});
$$('[data-prev]').forEach(b=>b.onclick=()=>setOb(Math.max(1,obStep-1)));
$$('#obSex button').forEach(b=>b.onclick=()=>{$$('#obSex button').forEach(x=>x.classList.remove('on'));b.classList.add('on');S.sex=b.dataset.v;});

function collect(){
  if(obStep===1){
    S.name=($('#obName').value||'').trim()||GX('חבר','חברה');
    S.age=+$('#obAge').value||30;
    S.exp=+$('#obExp').value||0;
    if(!$('#obAge').value){toast('כמה בן/בת? זה קובע את החישוב');return false;}
  }
  if(obStep===2){
    S.height=+$('#obHeight').value||0; S.weight=+$('#obWeight').value||0;
    S.waist=+$('#obWaist').value||S.waist||0; S.hip=+$('#obHip').value||S.hip||0;
    if(S.height<120||S.weight<35){toast('גובה ומשקל נראים לא מלאים');return false;}
    save();
  }
  return true;
}
function drawDemos(){
  const poses={
    Front:{view:'front',hip:[150,150],feet:[[132,254],[168,254]],hands:[[116,196],[184,196]]},
    Side:{view:'side',dir:1,tilt:0,hip:[150,150],feet:[[144,254],[156,254]],hands:[[146,200],[152,202]]}
  };
  ['Front','Side'].forEach(v=>{
    const c=document.getElementById('demo'+v);
    if(!c||!window.FIG||!FIG.draw)return;
    try{
      const ctx=c.getContext('2d');
      c.width=FIG.W*2; c.height=FIG.H*2; c.style.width='100%'; c.style.height='auto';
      ctx.setTransform(2,0,0,2,0,0);
      FIG.draw(ctx,poses[v],{ground:true,defs:false});
    }catch(e){ console.error('demo draw failed',v,e); }
  });
}
function updBmi(){
  const h=+($('#obHeight')||{}).value, w=+($('#obWeight')||{}).value;
  const tmp=Object.assign({},S,{height:h>=100?h:S.height, weight:w>=30?w:S.weight});
  const m=MORPH.metrics(tmp,S.level);
  $('#bmiCard').innerHTML=`<b style="color:#bb8ce8">BMI ${m.bmi}</b> · אחוז שומן מוערך ${m.bf}%<br><span class="iffy">הערכה לפי גובה, משקל, גיל ומין (נוסחת Deurenberg). זו הערכה, לא מדידה.</span>`;
}
['#obHeight','#obWeight'].forEach(sel=>{const el=document.querySelector(sel);if(el){el.addEventListener('input',updBmi);el.addEventListener('change',updBmi);}});

/* תמונות */
function hookShot(btnId,fileId,imgId,key){
  $(btnId).onclick=()=>$(fileId).click();
  $(fileId).onchange=e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      const im=$(imgId);im.src=r.result;im.style.display='block';$(btnId).classList.add('has');
      S.photos[key]=r.result;save();
      doScan();
    };
    r.readAsDataURL(f);
  };
}
hookShot('#shotFront','#fileFront','#imgFront','front');
hookShot('#shotSide','#fileSide','#imgSide','side');
$('#skipPhotos').onclick=()=>{toast('בלי תמונות ההדמיה תהיה פחות מדויקת');setOb(4);};

async function doScan(){
  const card=$('#scanCard');
  if(!S.photos.front&&!S.photos.side){return;}
  card.innerHTML='מודד את הצילומים…';
  try{
    const fi=S.photos.front?await MORPH.loadImg(S.photos.front):null;
    const si=S.photos.side?await MORPH.loadImg(S.photos.side):null;
    const sideA=si?MORPH.analyzeSide(si):null;
    S.scan=sideA&&sideA.ok?sideA:(fi?MORPH.analyzeSide(fi):null);
    const m=MORPH.measureBody(fi,si,S);
    S.body=m;save();
    if(!m.ok){card.innerHTML='<b>לא הצלחתי למדוד</b><br>'+(m.reason||'')+' נסי לצלם שוב לפי ההדגמה.';return;}
    S.waist=S.waist||m.waist; S.hip=S.hip||m.hip;
    const est=MORPH.estimateBMIfromShape(m,S);
    const real=MORPH.metrics(S,1);
    const used=(m.sources.front&&m.sources.side)?'חזית + צד':(m.sources.front?'חזית בלבד (העומק מוערך)':'צד בלבד (הרוחב מוערך)');
    card.innerHTML=`<b style="color:#bb8ce8">נמדד מהצילום</b> · ${used}<br>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0">
        <div style="background:#0f1620;border:1px solid #232f3f;border-radius:12px;padding:9px;text-align:center"><div style="font-size:11.5px;color:#8b95a7">מותן</div><div style="font-size:22px;font-weight:800;color:#5fd0a0">${m.waist}</div><div style="font-size:11px;color:#7b8697">ס״מ</div></div>
        <div style="background:#0f1620;border:1px solid #232f3f;border-radius:12px;padding:9px;text-align:center"><div style="font-size:11.5px;color:#8b95a7">ירכיים</div><div style="font-size:22px;font-weight:800;color:#f7d98a">${m.hip}</div><div style="font-size:11px;color:#7b8697">ס״מ</div></div>
        <div style="background:#0f1620;border:1px solid #232f3f;border-radius:12px;padding:9px;text-align:center"><div style="font-size:11.5px;color:#8b95a7">מותן/ירך</div><div style="font-size:22px;font-weight:800;color:#bb8ce8">${m.whr}</div><div style="font-size:11px;color:#7b8697">יחס</div></div>
      </div>
      BMI מהגובה והמשקל: <b>${real.bmi}</b>${est?` · BMI מהצילום: <b>${est.bmi}</b> (משקל מוערך ${est.weight} ק״ג)`:''}<br>
      <span class="iffy">הערכה מסילואטה וגובה, בטעות של כ-3-5 ס״מ. אם המספר רחוק ממה שמדדת, אפשר לעדכן ידנית בהגדרות.</span>`;
  }catch(e){card.innerHTML='שגיאה בקריאת התמונה: '+e.message;}
}
/* ---------- יעד + סליידר ---------- */
let morphImg=null;
function initGoal(){
  const sl=$('#goalSlider');
  sl.value=S.level||2;
  sl.oninput=()=>{S.level=+sl.value;paintGoal();};
  const src=S.photos.side||S.photos.front;
  if(src){
    MORPH.loadImg(src).then(i=>{
      morphImg=i;
      try{S.scan=MORPH.analyzeSide(i);}catch(e){}
      paintGoal();
    }).catch(()=>paintGoal());
  } else paintGoal();
}
function paintGoal(){
  const can=$('#sliderCanvas'),ctx=can.getContext('2d');
  const rect=can.getBoundingClientRect();
  const w=Math.round(rect.width*2)||MORPH.W, h=Math.round(w*4/3);
  if(can.width!==w){can.width=w;can.height=h;}
  const lv=S.level;
  if(morphImg){
    MORPH.drawMorph(ctx,morphImg,lv,{w,h,sex:S.sex,bf:MORPH.metrics(S,1).bf,top:(S.scan&&S.scan.ok)?S.scan.top:0.10,bottom:(S.scan&&S.scan.ok)?S.scan.bottom:0.94});
  } else {
    ctx.clearRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#18202c');g.addColorStop(1,'#0c1016');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const p={hx:w/2,hy:h*(0.66-0.02*(lv-1)),view:'front',spread:16+9*(lv-1),kneeY:h*0.80,armOut:22,handDrop:140,lean:2};
    ctx.save();ctx.scale(w/300,h/290);
    FIG.draw(ctx,p,{});
    ctx.restore();
  }
  const m=MORPH.metrics(S,lv), wk=MORPH.weeks(lv);
  const L=Math.min(4,Math.max(1,lv));
  const tierName=['','יסודות · רך','טונוס · מתגבש','חידוד · חד','מקצועי · משורטט'][Math.round(L)];
  $('#morphBadge').textContent=`${L.toFixed(2)} · ${tierName}`;
  $$('#tierLabels span').forEach((sp,i)=>sp.classList.toggle('hot',Math.round(L)===i+1));
  const tr=Math.round(L);
  const n=DATA.nutrition(S,tr);
  const t=DATA.TIER[tr];
  const _p=buildPlan();
  // מדדי ההדמיה הנגזרים מהסליידר
  const lean=Math.max(0,Math.round((m.delta)*S.weight/100*10)/10);          // ק״ג שומן שיורד
  const muscleGain=+((L-1)*0.55*(S.sex==='f'?0.8:1.1)).toFixed(1);           // ק״ג שריר משוער
  const gluteCm=+((L-1)*1.4*(S.sex==='f'?1.1:0.9)).toFixed(1);               // תוספת היקף ישבן משוערת (ס״מ)
  const waistCm=+(-(L-1)*1.7*Math.min(1,Math.max(0.35,(m.bf-12)/22))).toFixed(1);
  const tonePct=Math.round((L-1)/3*100);
  const bar=(pct,color)=>`<div style="height:7px;background:#1b2330;border-radius:6px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${pct}%;background:${color||'linear-gradient(90deg,#bb8ce8,#f7d98a)'};border-radius:6px"></div></div>`;
  const big=(lbl,from,to,unit,pct,col)=>`
    <div style="padding:10px 0;border-bottom:1px solid #1d2733">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="color:#9aa6b8;font-size:13.5px">${lbl}</span>
        <span style="font-size:22px;font-weight:800;color:#f2f5fa">${from!==null?`<span style="color:#7b8697;font-size:15px;font-weight:600">${from}${unit}</span> <span style="color:#bb8ce8">←</span> `:''}${to}${unit}</span>
      </div>${bar(pct,col)}</div>`;
  $('#goalCard').innerHTML=`
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
     <div style="background:#0f1620;border:1px solid #232f3f;border-radius:13px;padding:10px;text-align:center">
       <div style="font-size:12px;color:#8b95a7">אחוז שומן</div>
       <div style="font-size:28px;font-weight:800;color:#bb8ce8;line-height:1.1">${m.target}%</div>
       <div style="font-size:12px;color:#7b8697">היום ${m.bf}% · ${m.delta>0?'−'+m.delta:'0'} נק׳</div>
     </div>
     <div style="background:#0f1620;border:1px solid #232f3f;border-radius:13px;padding:10px;text-align:center">
       <div style="font-size:12px;color:#8b95a7">זמן ליעד</div>
       <div style="font-size:28px;font-weight:800;color:#bb8ce8;line-height:1.1">${wk}</div>
       <div style="font-size:12px;color:#7b8697">שבועות</div>
     </div>
   </div>
   ${big('אחוז שומן',m.bf,m.target,'%',Math.round(m.delta/Math.max(1,m.bf-m.floor)*100*1.3))}
   ${big('טונוס שריר (ישבן · ירך)',null,tonePct,'%',tonePct)}
   ${big('היקף ישבן משוער',null,(gluteCm>=0?'+':'')+gluteCm,' ס״מ',Math.round((L-1)/3*100))}
   ${big('היקף מותן משוער',null,waistCm,' ס״מ',Math.round(Math.abs(waistCm)/5*100))}
   ${big('שריר שנוסף · שומן שירד',null,'+'+muscleGain+' / −'+lean,' ק״ג',Math.round((L-1)/3*100),'linear-gradient(90deg,#5fd0a0,#9be8c6)')}
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
     <div style="background:#0f1620;border:1px solid #232f3f;border-radius:13px;padding:9px;text-align:center"><div style="font-size:12px;color:#8b95a7">אימונים בשבוע</div><div style="font-size:20px;font-weight:800">${t.days}</div><div style="font-size:12px;color:#7b8697">${_p.minutes} דק׳ כל אחד</div></div>
     <div style="background:#0f1620;border:1px solid #232f3f;border-radius:13px;padding:9px;text-align:center"><div style="font-size:12px;color:#8b95a7">קלוריות · חלבון</div><div style="font-size:20px;font-weight:800">${n.kcal}</div><div style="font-size:12px;color:#7b8697">${n.protein} ג׳ חלבון ביום</div></div>
   </div>
   <div class="iffy" style="margin-top:10px">ההדמיה והמספרים הם הערכה לפי הצילום, הגובה, המשקל והגיל. הם מראים כיוון, לא תחזית רפואית.</div>`;
  buildPlan();
}
function finishOnboard(){
  S.started=S.started||Date.now();
  buildPlan();
  save();
  const t=DATA.TIER[Math.round(S.level||2)];
  const m=MORPH.metrics(S,S.level);
  const p=S.plan||buildPlan();
  const e=p.estimate||DATA.estimate(prefMin(),prefInt(),4);
  $('#readyLede').textContent=`${dispName()}, בניתי לך ${t.days} אימונים בשבוע, ${p.minutes} דקות כל אחד, עד יעד של ${m.target}% שומן.`;
  $('#readyCard').innerHTML=`
   <div class="kv"><span>תוכנית</span><b>${t.name} · ${DATA.loadFor(prefInt())}</b></div>
   <div class="kv"><span>אורך אימון</span><b>${p.minutes} דק׳</b></div>
   <div class="kv"><span>עצימות</span><b>${(+prefInt()).toFixed(1).replace('.0','')}/4 · ${e.count} תרגילים × ${e.sets} סטים</b></div>
   <div class="kv"><span>חזרות ומנוחה</span><b>${e.reps} · ${e.rest} שנ׳</b></div>
   <div class="kv"><span>אורך</span><b>${t.weeks} שבועות</b></div>
   <div class="kv"><span>BMI</span><b>${m.bmi}</b></div>
   <div class="kv"><span>המדריכה</span><b>נועה · שימי פיט</b></div>`;
  const po=$('#prefOnboard'); if(po){po.innerHTML=prefHtml('ob');paintPref('ob');wirePref('ob');}
  $('#readyCard').innerHTML+=`<div class="iffy">התוכנית נשמרת במכשיר. אפשר לשנות יעד בכל רגע במסך ההתקדמות.</div>`;
}
$('#startApp').onclick=async()=>{
  $('#onboard').classList.add('hide');$('#app').classList.remove('hide');
  if(!S.plan)buildPlan();
  save();render();startLocation();
};

/* ---------- מסכים ---------- */
function todayIdx(){
  if(!S.plan)return 0;
  const n=S.plan.days.length;
  const done=(S.sessions||[]).filter(x=>sameDay(x.date,Date.now())).length;
  const total=(S.sessions||[]).length;
  return (total)%n;
}
function sameDay(a,b){const d1=new Date(a),d2=new Date(b);return d1.toDateString()===d2.toDateString();}
function dayKey(d){return d.toISOString().slice(0,10);}

function render(){
  $('#hUserName').textContent=dispName?dispName():S.name;
  const t=DATA.TIER[Math.round(S.level||2)];
  $('#hSub').textContent=`תוכנית ${t.name} · ${t.days} אימונים בשבוע`;
  if(tab==='today')renderToday();
  if(tab==='plan')renderPlan();
  if(tab==='progress')renderProgress();
  if(tab==='despair')renderDespair();
  if(tab==='settings')renderSettings();
}

function renderToday(){
  const p=S.plan||buildPlan();
  const i=todayIdx(), d=p.days[i];
  const doneToday=(S.sessions||[]).some(x=>sameDay(x.date,Date.now()));
  const totalEx=d.exercises.length;
  const mins=d.minutes;
  $('#view').innerHTML=`
   <div class="hero">
     <div class="k">${doneToday?'הושלם היום · כל הכבוד':'האימון של היום'}</div>
     <h2>${d.title}</h2>
     <div class="sub">${d.sub}</div>
     <div class="meta"><span><b>${totalEx}</b> תרגילים</span><span><b>~${mins}</b> דק׳</span><span><b>${DATA.TIER[Math.round(S.level)].name}</b></span></div>
   </div>
   <button class="btn" id="goTrain">${doneToday?'עוד אימון':'התחל אימון'}</button>
   <div class="card">
     <div class="kv"><span>רצף אימונים</span><b>${streak()} ימים</b></div>
     <div class="kv"><span>אימונים החודש</span><b>${(S.sessions||[]).filter(x=>new Date(x.date).getMonth()===new Date().getMonth()).length}</b></div>
     <div class="kv"><span>זמן באימון</span><b>${Math.round((S.sessions||[]).reduce((s,x)=>s+(x.minutes||0),0))} דק׳</b></div>
   </div>
   <h2 style="margin:18px 0 10px">התרגילים</h2>
   <div class="list">${d.exercises.map((e,k)=>`
     <div class="item" data-ex="${e.ex}">
       <div class="num">${k+1}</div>
       <div class="t"><b>${e.name}</b><span>${e.sets} סטים · ${e.reps} · מנוחה ${e.rest}″</span></div>
       <div class="go">›</div>
     </div>`).join('')}</div>
   <div class="card soft" style="margin-top:16px">המדריכה <b style="color:#bb8ce8">נועה</b> מקריאה כל תרגיל, סופרת חזרות ומלווה אותך בקול. הטלפון יכול להישאר בכיס — רק הקשב.</div>`;
  $('#goTrain').onclick=()=>startWorkout(i);
  $$('#view .item').forEach(it=>it.onclick=()=>{const k=$$('#view .item').indexOf(it);startWorkout(i,k);});
}

function streak(){
  const days=new Set((S.sessions||[]).map(x=>new Date(x.date).toDateString()));
  let c=0,d=new Date();
  for(let i=0;i<400;i++){
    if(days.has(d.toDateString()))c++;
    else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return c;
}

function renderPlan(){
  const p=S.plan||buildPlan();
  $('#view').innerHTML=`
   ${prefHtml('plan')}
   <div class="card">
     <div class="kv"><span>רמה</span><b>${p.t.name}</b></div>
     <div class="kv"><span>ימים בשבוע</span><b>${p.t.days}</b></div>
     <div class="kv"><span>ציוד</span><b>${p.t.load}</b></div>
     <div class="kv"><span>אורך תוכנית</span><b>${p.t.weeks} שבועות</b></div>
   </div>
   ${p.days.map((d,i)=>`
     <div class="card">
       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
         <div><b>${d.title}</b><div class="sub">${d.sub} · ${d.minutes} דק׳</div></div>
         <button class="ghost" style="width:auto;padding:8px 14px;margin:0;font-size:13px" data-day="${i}">התחל</button>
       </div>
       ${d.exercises.map(e=>`<div class="kv"><span>${e.name}</span><b>${e.sets}×${e.reps}</b></div>`).join('')}
     </div>`).join('')}`;
  paintPref('plan');wirePref('plan');
  $$('#view [data-day]').forEach(b=>b.onclick=()=>startWorkout(+b.dataset.day));
}

function renderProgress(){
  const m=MORPH.metrics(S,S.level);
  const p=S.plan||buildPlan();
  const done=(S.sessions||[]).length;
  $('#view').innerHTML=`
   <div class="morphwrap"><canvas id="progCanvas"></canvas>
     <div class="morph-badge" id="progBadge">${(+S.level).toFixed(2)}</div></div>
   <input id="progSlider" class="slider" type="range" min="1" max="4" step="0.05" value="${S.level}">
   <div class="tiers"><span>1</span><span>2</span><span>3</span><span>4</span></div>
   <div class="grid2" style="margin-top:14px">
     <div class="stat"><div class="v">${m.bmi}</div><div class="l">BMI</div></div>
     <div class="stat"><div class="v">${m.bf}%</div><div class="l">שומן מוערך</div></div>
     <div class="stat"><div class="v">${m.target}%</div><div class="l">יעד</div></div>
     <div class="stat"><div class="v">${done}</div><div class="l">אימונים</div></div>
   </div>
   <div class="card">
     <div class="kv"><span>סטייה מהיעד</span><b>${(m.bf-m.target).toFixed(1)} נק׳</b></div>
     <div class="kv"><span>זמן מוערך</span><b>${MORPH.weeks(S.level)} שבועות</b></div>
     <div class="kv"><span>רצף</span><b>${streak()} ימים</b></div>
     <canvas id="histChart" class="chart"></canvas>
   </div>`;
  const drawProg=()=>{
    const can=$('#progCanvas'),ctx=can.getContext('2d');
    const w=Math.round(can.getBoundingClientRect().width*2)||MORPH.W,h=Math.round(w*4/3);
    can.width=w;can.height=h;
    const lv=+S.level;
    const _src=S.photos.side||S.photos.front;
    if(_src){MORPH.loadImg(_src).then(im=>{const a=MORPH.analyzeSide(im);MORPH.drawMorph(ctx,im,lv,{w,h,sex:S.sex,bf:MORPH.metrics(S,1).bf,top:a.ok?a.top:0.10,bottom:a.ok?a.bottom:0.94});});}
    else{
      ctx.fillStyle='#10151e';ctx.fillRect(0,0,w,h);
      ctx.save();ctx.scale(w/300,h/290);
      FIG.draw(ctx,{hx:150,hy:290*(0.66-0.02*(lv-1)),view:'front',spread:16+9*(lv-1),kneeY:232,armOut:22,handDrop:58,lean:2},{});
      ctx.restore();
    }
    $('#progBadge').textContent=lv.toFixed(2);
  };
  $('#progSlider').oninput=e=>{S.level=+e.target.value;drawProg();save();};
  drawProg();drawChart();
}
function drawChart(){
  const c=$('#histChart');if(!c)return;
  const w=c.getBoundingClientRect().width*2,h=240;c.width=w;c.height=h;
  const x=c.getContext('2d');x.clearRect(0,0,w,h);
  const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d);}
  const vals=days.map(d=>(S.sessions||[]).filter(s=>sameDay(s.date,d.getTime())).reduce((a,b)=>a+(b.minutes||0),0));
  const max=Math.max(30,...vals);
  x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=1;
  for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,h*i/4);x.lineTo(w,h*i/4);x.stroke();}
  const bw=w/days.length;
  vals.forEach((v,i)=>{
    const bh=(v/max)*(h-20);
    const g=x.createLinearGradient(0,h-bh,0,h);g.addColorStop(0,'#bb8ce8');g.addColorStop(1,'rgba(187,140,232,.25)');
    x.fillStyle=v?g:'#1b2330';
    x.beginPath();x.roundRect?x.roundRect(i*bw+bw*0.2,h-bh-8,bw*0.6,bh||4,4):x.rect(i*bw+bw*0.2,h-bh-8,bw*0.6,bh||4);x.fill();
  });
}

/* ---------- ייאוש ---------- */
let despair=null;
async function renderDespair(){
  $('#view').innerHTML=`<div class="card soft">טוען את טבלת הייאוש…</div>`;
  try{
    const r=await fetch('api/despair.php',{cache:'no-store'});
    despair=await r.json();
  }catch(e){despair=null;}
  const d=despair||{};
  const days=d.days_remaining??'—', hours=d.today_hours??0, target=d.exit_at||'—', entry=d.entry_at||'—';
  $('#view').innerHTML=`
   <div class="hero">
     <div class="k">טבלת ייאוש · עבודות שירות</div>
     <h2>${d.days_remaining?d.days_remaining+' ימים נותרו':(d.done_days||0)+' ימי עבודה הושלמו'}</h2>
     <div class="sub">${d.site_name||'אתר העבודות'} · יום עבודה 6.5 שעות</div>
     <div class="meta"><span>כניסה <b>${entry}</b></span><span>יציאה <b>${target}</b></span><span>היום <b>${hours} ש׳</b></span></div>
   </div>
   <div class="card">
     <div class="kv"><span>נצברו עד היום</span><b>${d.total_hours??'—'} שעות</b></div>
     <div class="kv"><span>ימים שהושלמו</span><b>${d.done_days??'—'}</b></div>
     <div class="kv"><span>סטטוס עכשיו</span><b style="color:${d.inside?'#3ddc84':'#8b95a7'}">${d.inside?'בתוך האתר':'מחוץ לאתר'}</b></div>
   </div>
   <canvas id="despairChart" class="chart" style="height:140px"></canvas>
   <div class="card soft">המיקום שלך נשלח עכשיו גם לווידג׳ של רשת שימי. אותו שידור שמזהה כניסה לאתר העבודות הוא גם מה שמאפשר לאימון לדעת ש${GX('אתה','את')} בדרך.</div>`;
  drawDespairChart();
}
function drawDespairChart(){
  const c=$('#despairChart');if(!c)return;
  const w=c.getBoundingClientRect().width*2,h=280;c.width=w;c.height=h;
  const x=c.getContext('2d');x.clearRect(0,0,w,h);
  const hist=(despair&&despair.history)||[];
  const arr=hist.length?hist.slice(-14):Array.from({length:14},()=>({hours:0}));
  const max=Math.max(6.5,...arr.map(a=>a.hours||0));
  const bw=w/arr.length;
  arr.forEach((a,i)=>{
    const bh=((a.hours||0)/max)*(h-20);
    x.fillStyle=(a.hours||0)>=6?'rgba(61,220,132,.8)':'rgba(187,140,232,.55)';
    x.beginPath();x.roundRect?x.roundRect(i*bw+bw*0.22,h-bh-8,bw*0.56,bh||3,3):x.rect(i*bw+bw*0.22,h-bh-8,bw*0.56,bh||3);x.fill();
  });
}

/* ---------- הגדרות ---------- */
/* ---------- סליידרים: אורך מול עצימות ---------- */
function prefHtml(sfx){
  const mn=prefMin(), it=prefInt();
  return `<div class="card">
   <div style="font-weight:700;margin-bottom:10px">אורך ועצימות</div>
   <div class="kv"><span>אורך אימון</span><b id="mnLbl_${sfx}">${mn} דק׳</b></div>
   <input id="mn_${sfx}" class="slider" type="range" min="15" max="60" step="1" value="${mn}">
   <div class="kv" style="margin-top:12px"><span>עצימות</span><b id="itLbl_${sfx}">${(+it).toFixed(1).replace('.0','')}/4</b></div>
   <input id="it_${sfx}" class="slider" type="range" min="1" max="4" step="0.5" value="${it}">
   <div class="iffy" id="sum_${sfx}" style="margin-top:10px"></div>
  </div>`;
}
function paintPref(sfx){
  const mn=prefMin(), it=prefInt();
  const cnt=DATA.countFor(mn);
  const e=DATA.estimate(mn,it,cnt);
  const el=k=>document.getElementById(k+'_'+sfx);
  if(el('mnLbl'))el('mnLbl').textContent=mn+' דק׳';
  if(el('itLbl'))el('itLbl').textContent=(+it).toFixed(1).replace('.0','')+'/4';
  if(el('sum'))el('sum').innerHTML=`בפועל כ-<b style="color:#bb8ce8">${e.real} דק׳</b> · ${cnt} תרגילים × ${e.sets} סטים · ${e.reps} חזרות · מנוחה ${e.rest} שנ׳ · ${DATA.loadFor(it)}<br>קיצור הזמן עם עצימות גבוהה = פחות סטים, פחות מנוחה ומשקל כבד יותר. הורדת עצימות מאריכה את הטווח אבל קלה יותר לביצוע.`;
}
function wirePref(sfx){
  const a=document.getElementById('mn_'+sfx), b=document.getElementById('it_'+sfx);
  if(!a||!b)return;
  a.oninput=()=>{S.minutes=+a.value;buildPlan();paintPref(sfx);save();};
  b.oninput=()=>{S.intensity=+b.value;buildPlan();paintPref(sfx);save();};
  a.onchange=()=>{render();};
  b.onchange=()=>{render();};
}

function renderSettings(){
  $('#view').innerHTML=`
   <div class="card">
     <div class="kv"><span>שם</span><b>${S.name}</b></div>
     <div class="kv"><span>גובה / משקל</span><b>${S.height} ס״מ · ${S.weight} ק״ג</b></div>
     <div class="kv"><span>מזהה שידור</span><b>${S.devid}</b></div>
   </div>
   <div class="card">
     <div class="kv"><span>שעת אימון מועדפת</span><b>${S.remindAt}</b></div>
     <div class="kv"><span>תזכורת לפי מיקום</span><b>${S.gymLoc?'מוגדר':'לא מוגדר'}</b></div>
     <div class="kv"><span>קריינית</span><b>${voiceOn?'פעיל':'כבוי'}</b></div>
   </div>
   <button class="btn sec" id="setLoc">קבע את המיקום הנוכחי כמקום האימון</button>
   <button class="btn sec" id="setTime">שנה שעת אימון</button>
   <button class="btn sec" id="toggleVoice">${voiceOn?'כבה קריינית':'הפעל קריינית'}</button>
   <button class="btn sec" id="testVoice">בדיקת קול</button>
   <a class="btn sec" href="anim/" style="text-align:center;text-decoration:none;display:block">כל 14 ההנפשות של נועה</a>
   <a class="btn sec" href="install/" style="text-align:center;text-decoration:none;display:block">התקנה באייפון · הוראות</a>
   <button class="btn sec" id="reOnboard">בנה מחדש את הפרופיל</button>
   <div class="card soft" style="margin-top:16px">שימי פיט · נבנה על ידי שימי של סאן · רשת שימי. כל הנתונים נשמרים במכשיר שלך ובשרת הפרטי.</div>`;
  $('#setLoc').onclick=()=>{
    if(!navigator.geolocation)return toast('אין GPS');
    navigator.geolocation.getCurrentPosition(p=>{
      S.gymLoc={lat:p.coords.latitude,lng:p.coords.longitude};save();toast('המיקום נקבע');renderSettings();
    },()=>toast('לא הצלחתי לקרוא מיקום'),{enableHighAccuracy:true});
  };
  $('#setTime').onclick=()=>{const v=prompt('שעת אימון מועדפת (HH:MM)',S.remindAt);if(v&&/^\d{1,2}:\d{2}$/.test(v)){S.remindAt=v;save();renderSettings();}};
  $('#toggleVoice').onclick=()=>{voiceOn=!voiceOn;S.voice=voiceOn;save();renderSettings();};
  $('#testVoice').onclick=()=>speak('שלום, אני נועה, המדריכה שלך בשימי פיט. נתחיל כשתגיד לי.');
  $('#reOnboard').onclick=()=>{$('#app').classList.add('hide');$('#onboard').classList.remove('hide');setOb(1);};
}

/* ---------- מיקום + תזכורות ---------- */
let watchId=null,sent=0,lastPost=0;
function startLocation(){
  if(!navigator.geolocation||S.locationOn===false)return;
  if(native){try{native.postMessage(JSON.stringify({cmd:'startLocation',devid:S.devid}));}catch(e){}}
  if(watchId!==null)return;
  try{
    watchId=navigator.geolocation.watchPosition(p=>{
      const now=Date.now();
      if(now-lastPost<60000)return;
      lastPost=now;
      const b={token:'shimi-gps-8427-nes-ziona',devid:S.devid,lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy,speed:p.coords.speed||0,ver:'fit-1.0'};
      fetch('/ios/report.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
        .then(r=>r.json()).then(j=>{sent++;$('#liveTxt').textContent=sent+' דיוורים';}).catch(()=>{});
      checkReminder(p.coords);
    },()=>{}, {enableHighAccuracy:true,maximumAge:20000,timeout:25000});
  }catch(e){}
}
function dist(a,b){
  const R=6371000,p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180;
  const dp=p2-p1,dl=(b.lng-a.lng)*Math.PI/180;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
let lastNudge=0;
function checkReminder(c){
  if(!S.gymLoc)return;
  const d=dist({lat:c.latitude,lng:c.longitude},S.gymLoc);
  const hh=new Date().getHours();
  const [rh]=String(S.remindAt||'19:00').split(':').map(Number);
  const near=hh>=rh-1&&hh<=rh+2;
  const done=(S.sessions||[]).some(x=>sameDay(x.date,Date.now()));
  if(d<400&&near&&!done&&Date.now()-lastNudge>3*3600*1000){
    lastNudge=Date.now();
    notifyLocal('שימי פיט · הגעת',`${GX('אתה','את')} 400 מטר ממקום האימון. האימון של היום מחכה — פתח את האפליקציה.`);
    speak('הגעת. האימון של היום מחכה לך.');
  }
}

/* ---------- נגן האימון ---------- */
let PL=null,anim=null;
function startWorkout(dayIdx,startEx){
  const p=S.plan||buildPlan();
  const d=p.days[dayIdx]||p.days[0];
  PL={day:d,idx:startEx||0,set:1,mode:'work',reps:0,t0:Date.now(),elapsed:0,rest:0,restMax:0,doneSets:0,log:[]};
  $('#player').classList.remove('hide');
  loadExercise();
}
function loadExercise(){
  const e=PL.day.exercises[PL.idx];
  if(!e){finishWorkout();return;}
  const def=DATA.getEx(e.ex);
  PL.reps=0;PL.mode='work';
  $('#plName').textContent=e.name;
  $('#plStep').textContent=`תרגיל ${PL.idx+1} מתוך ${PL.day.exercises.length} · ${e.sets} סטים`;
  $('#plCue').textContent=(def.cues&&def.cues[0])||'';
  try{var mm=$('#plMuscle'); if(mm) mm.innerHTML=(typeof muscleCard==='function')?muscleCard(e.ex||e.id):'';}catch(_){}
  $('#plSet').textContent=`${PL.set} / ${e.sets}`;
  $('#plRest').textContent=e.rest+'″';
  $('#plHint').textContent=e.load||'';
  if(typeof setPhoto==='function') setPhoto(e.id);
  $('#repGoal').textContent=e.timeBased?'—':(e.reps||'').split('-').pop();
  $('#ringSub').textContent=e.timeBased?'שניות':'חזרות';
  $('#repPad').classList.toggle('hide',!!e.timeBased);
  $('#plDone').textContent='סיים סט';
  startDemo(def);
  const spoken=`${e.name}. סט ${PL.set} מתוך ${e.sets}. ${e.timeBased?'שלושים שניות':'חזרות'} ${e.timeBased?'':'יעד '+((e.reps||'').split('-').pop())}. ${(def.cues&&def.cues[1])||''}`;
  speak(spoken);
  if(e.timeBased)startTimer(e.seconds||30);
  else{PL.reps=0;updRing(0,1);}
}
function startDemo(def){
  const can=$('#demoCanvas');
  const rect=can.getBoundingClientRect();
  const w=Math.round(rect.width*2)||600,h=Math.round(w*0.95);
  can.width=w;can.height=h;
  const ctx=can.getContext('2d');
  if(anim)cancelAnimationFrame(anim);
  const speed=0.22; // cycles per second
  const t0=performance.now();
  const frames=def.frames;
  const loop=()=>{
    const t=((performance.now()-t0)/1000)*speed;
    const pose=FIG.phasePose(frames,t);
    ctx.save();ctx.scale(w/FIG.W,h/FIG.H);
    FIG.draw(ctx,pose,{arrow:true});
    ctx.restore();
    anim=requestAnimationFrame(loop);
  };
  loop();
  // פס פריימים
  const strip=$('#frameStrip');strip.innerHTML='';
  frames.slice(0,3).forEach((f,k)=>{
    const c=document.createElement('canvas');c.width=FIG.W;c.height=FIG.H;
    const x=c.getContext('2d');FIG.draw(x,f,{ground:false});
    strip.appendChild(c);
    c.onclick=()=>{ctx.save();ctx.scale(w/FIG.W,h/FIG.H);FIG.draw(ctx,f,{arrow:true});ctx.restore();};
  });
}
let timer=null;
function startTimer(sec){
  clearInterval(timer);
  let left=sec,total=sec;
  updRing(0,total);
  speak(left+' שניות');
  timer=setInterval(()=>{
    left--;
    $('#ringMain').textContent=left;
    updRing(total-left,total);
    if(left<=3&&left>0){speak(String(left));haptic('light');}
    if(left<=0){clearInterval(timer);haptic('success');speak('סט הושלם');endSet(true);}
  },1000);
  $('#ringMain').textContent=left;
}
function updRing(done,total){
  const c=$('#ringFg');const C=327;
  c.style.strokeDashoffset=String(C*(1-Math.min(1,done/total)));
}
function bumpRep(){
  const e=PL.day.exercises[PL.idx];
  const goal=+((e.reps||'12').split('-').pop())||12;
  PL.reps++;
  $('#repCount').textContent=PL.reps;
  updRing(PL.reps,goal);
  haptic('light');
  if(PL.reps<=3||PL.reps%5===0)speak(String(PL.reps),1.05);
  if(PL.reps>=goal){haptic('success');speak('סט הושלם');endSet(true);}
}
$$('#repPad button').forEach(b=>b.onclick=()=>{
  if(b.dataset.rep==='1')bumpRep();
  else{PL.reps=Math.max(0,PL.reps-1);$('#repCount').textContent=PL.reps;}
});
function endSet(complete){
  const e=PL.day.exercises[PL.idx];
  PL.doneSets++;
  if(PL.set<e.sets&&complete){
    PL.set++;
    startRest(e.rest);
  } else if(PL.set<e.sets){
    PL.set++;loadExercise();
  } else {
    PL.idx++;
    if(PL.idx>=PL.day.exercises.length){finishWorkout();return;}
    speak('עוברים לתרגיל הבא');
    PL.set=1;loadExercise();
  }
}
function startRest(sec){
  PL.mode='rest';
  $('#plDone').textContent='דלג על מנוחה';
  $('#ringSub').textContent='מנוחה';
  let left=sec,total=sec;
  $('#ringMain').textContent=left;
  updRing(0,total);
  speak('מנוחה '+sec+' שניות');
  clearInterval(timer);
  timer=setInterval(()=>{
    left--;
    $('#ringMain').textContent=left;
    updRing(total-left,total);
    if(left===15||left===10||left===5||left===3)speak(String(left));
    if(left<=0){
      clearInterval(timer);haptic('success');
      $('#plDone').textContent='סיים סט';
      loadExercise();
    }
  },1000);
}
$('#plDone').onclick=()=>{
  if(PL.mode==='rest'){clearInterval(timer);$('#plDone').textContent='סיים סט';loadExercise();return;}
  const e=PL.day.exercises[PL.idx];
  if(!e.timeBased && PL.reps===0){toast('אם סיימת בלי לספור, לחץ שוב');PL.skipConfirm=true;return;}
  endSet(true);
};
$('#plNext').onclick=()=>{
  clearInterval(timer);
  PL.idx++;PL.set=1;
  if(PL.idx>=PL.day.exercises.length){finishWorkout();return;}
  loadExercise();
};
$('#plPrev').onclick=()=>{
  clearInterval(timer);
  PL.idx=Math.max(0,PL.idx-1);PL.set=1;loadExercise();
};
$('#plClose').onclick=()=>{
  clearInterval(timer);if(anim)cancelAnimationFrame(anim);
  $('#player').classList.add('hide');
};
$('#plVoice').onclick=()=>{voiceOn=!voiceOn;S.voice=voiceOn;save();toast(voiceOn?'קריינית פעילה':'קריינית כבויה');};

function finishWorkout(){
  clearInterval(timer);if(anim)cancelAnimationFrame(anim);
  $('#player').classList.add('hide');
  const mins=Math.max(1,Math.round((Date.now()-PL.t0)/60000));
  S.sessions=S.sessions||[];
  S.sessions.push({date:Date.now(),day:PL.day.title,minutes:mins,sets:PL.doneSets,tier:Math.round(S.level)});
  save();
  $('#sumTitle').textContent='אימון הושלם';
  $('#sumGrid').innerHTML=`
    <div class="stat"><div class="v">${mins}</div><div class="l">דקות</div></div>
    <div class="stat"><div class="v">${PL.doneSets}</div><div class="l">סטים</div></div>
    <div class="stat"><div class="v">${PL.day.exercises.length}</div><div class="l">תרגילים</div></div>
    <div class="stat"><div class="v">${streak()}</div><div class="l">רצף</div></div>`;
  $('#summary').classList.remove('hide');
  speak('סיימת את האימון. כל הכבוד, זה עוד צעד לכיוון שהגדרת.');
  render();
}
$('#sumClose').onclick=()=>{$('#summary').classList.add('hide');go('today');};

/* ---------- האתחול ---------- */
window.addEventListener('load',()=>{
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.update();});}).catch(function(){});
    navigator.serviceWorker.register('sw.js?v=5').then(function(r){r.update();}).catch(()=>{});
    var _rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(_rl)return;_rl=true;location.reload();});
  }
  if(S.started){
    $('#onboard').classList.add('hide');$('#app').classList.remove('hide');
    if(!S.plan)buildPlan();
    render();startLocation();
  } else setOb(1);
  setTimeout(()=>{try{speechSynthesis.getVoices();}catch(e){}},300);
});
window.addEventListener('resize',()=>{if(obStep===4)paintGoal();});
})();

/* ===== שימי פיט · תמונת התרגיל האמיתית (שער QA) ===== */
var PHOTO_ON = false;
var _photoHas = false;
function _photoOk(id){ return (window.PHOTO_OK||[]).indexOf(id)>=0; }
function _paintBtn(){
  var b=document.getElementById('plMode'); if(!b) return;
  b.style.borderColor = PHOTO_ON ? '#bb8ce8' : '';
  b.textContent = PHOTO_ON ? '📷' : '🎬';
  b.style.display = _photoHas ? '' : 'none';
}
function setPhoto(id){
  var im = document.getElementById('plPhoto');
  var vid = document.getElementById('plVideo');
  var stage = document.querySelector('.pl-stage');
  if(!im || !stage) return;
  stage.classList.remove('photo');
  stage.classList.remove('video');
  if(vid){ try{ vid.pause(); }catch(e){} }
  if(!_photoOk(id)){ _photoHas=false; PHOTO_ON=false; im.removeAttribute('src'); _paintBtn(); return; }
  _photoHas=true; PHOTO_ON=true;
  im.onload = function(){ if(PHOTO_ON && !stage.classList.contains('video')) stage.classList.add('photo'); };
  im.onerror = function(){ _photoHas=false; _paintBtn(); };
  im.src = 'coach/ex/' + id + '.jpg?v=5';
  _paintBtn();
  if(vid){
    if(vid.getAttribute('data-id') !== id){
      vid.setAttribute('data-id', id);
      vid.src = 'coach/motion/' + id + '.mp4';
      vid.loop = true; vid.muted = true; vid.playsInline = true;
    }
    stage.classList.add('video');
    var pr = vid.play(); if(pr && pr.catch) pr.catch(function(){});
  } else {
    stage.classList.add('photo');
  }
  buildStages(id);
}
(function(){
  var b = document.getElementById('plMode');
  if(!b) return;
  b.onclick = function(){
    if(!_photoHas) return;
    var stage = document.querySelector('.pl-stage');
    var vid = document.getElementById('plVideo');
    if(!stage) return;
    if(stage.classList.contains('video')){
      stage.classList.remove('video'); stage.classList.remove('photo');
      if(vid){ try{ vid.pause(); }catch(e){} }
      PHOTO_ON = false; _paintBtn(); return;
    }
    if(vid){
      stage.classList.add('video'); stage.classList.remove('photo');
      var pr = vid.play(); if(pr && pr.catch) pr.catch(function(){});
      PHOTO_ON = true; _paintBtn(); return;
    }
    PHOTO_ON = !PHOTO_ON;
    stage.classList.toggle('photo', PHOTO_ON);
    _paintBtn();
  };
})();

/* ===== שלבי התרגיל: התחלה, אמצע, סוף ===== */
var STAGE_LBL=['התחלה','אמצע','סוף'];
function buildStages(id){
  var box=document.getElementById('stageStrip'); if(!box) return;
  box.innerHTML='';
  var list=[[id+'_a'],[id+'_b'],[id]];
  list.forEach(function(pair,i){
    var src='coach/ex/'+pair[0]+'.jpg?v=1';
    var im=new Image();
    im.onload=function(){
      im.className = (i===2)?'on':'';
      im.setAttribute('data-src',src);
      var wrap=document.createElement('div');
      wrap.style.cssText='flex:1;width:0';
      wrap.appendChild(im);
      var l=document.createElement('div');l.className='lbl';l.textContent=STAGE_LBL[i];wrap.appendChild(l);
      im.onclick=function(){
        var st=document.querySelector('.pl-stage'); if(!st) return;
        var main=document.getElementById('plPhoto'); if(!main) return;
        main.src=src; PHOTO_ON=true; st.classList.add('photo'); _paintBtn();
        Array.prototype.forEach.call(box.querySelectorAll('img'),function(o){o.classList.remove('on');});
        im.classList.add('on');
      };
      box.appendChild(wrap);
    };
    im.onerror=function(){};
    im.src=src;
  });
}
