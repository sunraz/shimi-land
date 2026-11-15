/* שימי פיט · ספר התרגילים והתוכניות — מיקוד ישבן */
(function(){
const S=(o)=>Object.assign({view:'side',hx:150,hy:150,lean:3,thighF:4,shinF:-4,armF:10,elbF:-8,prop:'',facing:1},o);

const EX=[
{
 id:'hip_thrust', name:'היפ תראסט', sub:'ישבן · כוח מקסימלי', view:'side',
 frames:[
  S({hy:226,lean:58,thighF:-115,shinF:115,armF:150,elbF:-40,prop:'bench+mat',benchX:186,benchY:190,arrow:[150,238,150,205]}),
  S({hy:192,lean:76,thighF:-100,shinF:100,armF:150,elbF:-40,prop:'bench+mat',benchX:186,benchY:190,arrow:[150,212,150,185]})
 ],
 cues:['שכמות על הספסל, כפות רגליים ברוחב אגן.','דחוף את העקבים לרצפה והרם אגן עד קו ישר עם השכמות.','עצור שנייה בחלק העליון, כווץ ישבן, ורד באיטיות.'],
 tips:'הסנטר צמוד לחזה. אם מגיעים רק לגובה חלקי, קרב את הרגליים.'
},
{
 id:'glute_bridge', name:'גשר ישבן', sub:'ישבן · שליטה', view:'side',
 frames:[
  S({hy:244,lean:58,thighF:-112,shinF:112,armF:150,elbF:-35,prop:'mat',arrow:[150,252,150,218]}),
  S({hy:208,lean:74,thighF:-98,shinF:98,armF:150,elbF:-35,prop:'mat',arrow:[150,226,150,196]})
 ],
 cues:['שכיבה על הגב, ברכיים bent, עקבים קרוב לישבן.','לחץ אגן כלפי מעלה עד קו ישר בין ברך לאגן לכתף.','רד לאט, בלי לשחרר לגמרי את המתח.'],
 tips:'לא לקשת את הגב התחתון — התנועה מגיעה מהישבן.'
},
{
 id:'rdl', name:'דדליפט רומני', sub:'המסטרינג + ישבן', view:'side',
 frames:[
  S({hx:150,hy:150,lean:6,thighF:3,shinF:-3,armF:6,elbF:-4,prop:'dumbbell',dx1:168,dy1:200,arrow:[176,160,176,215]}),
  S({hx:140,hy:162,lean:86,thighF:5,shinF:-5,armF:2,elbF:-2,prop:'dumbbell',dx1:196,dy1:212,arrow:[204,170,204,225]})
 ],
 cues:['עמידה באגן צר, משקולות לפני הירך.','דחוף אגן אחורה, גב ישר, המשקולות מחליקות לאורך הרגל.','עצור כשאתה מרגיש מתיחה בהמסטרינג, וחזור כלפי מעלה על ידי סגירת הישבן.'],
 tips:'הברכיים רכות, לא נעולות. הגב לא מתעגל בשום שלב.'
},
{
 id:'bulgarian', name:'סקוואט בולגרי', sub:'ישבן · צד אחד', view:'side',
 frames:[
  S({hx:146,hy:166,lean:10,thighF:8,shinF:-8,thighB:-138,shinB:118,armF:150,elbF:-20,prop:'bench',benchX:206,benchY:214,arrow:[150,182,150,214]}),
  S({hx:146,hy:205,lean:16,thighF:26,shinF:-42,thighB:-146,shinB:128,armF:150,elbF:-20,prop:'bench',benchX:206,benchY:214,arrow:[150,220,150,248]})
 ],
 cues:['רגל אחורית על הספסל, קדמית במרחק צעד גדול.','רד אנכית עד שהברך הקדמית כמעט נוגעת ברצפה.','עלה דרך העקב של הרגל הקדמית, בלי לדחוף מהרגל האחורית.'],
 tips:'המשקל על הרגל הקדמית בלבד. אחז בעמוד או בכיסא לאיזון.'
},
{
 id:'kickback', name:'בעיטת ישבן', sub:'ישבן על ארבע', view:'side',
 frames:[
  S({hy:204,lean:96,thighF:-12,shinF:-78,armF:0,elbF:0,prop:'mat',arrow:[104,214,84,190]}),
  S({hy:204,lean:96,thighF:-122,shinF:-26,armF:0,elbF:0,prop:'mat',arrow:[104,206,80,170]})
 ],
 cues:['על ארבע, ידיים מתחת לכתפיים וברכיים מתחת לאגן.','הרם רגל כפופה אחורה ולמעלה עד גובה האגן, בלי לסובב אותו.','כווץ ישבן בחלק העליון, וחזור באיטיות.'],
 tips:'הגב נשאר שטוח. התנועה מהישבן, לא מהגב התחתון.'
},
{
 id:'donkey_kick', name:'בעיטת חמור', sub:'ישבן עליון', view:'side',
 frames:[
  S({hy:204,lean:96,thighF:-8,shinF:-88,armF:0,elbF:0,prop:'mat',arrow:[100,220,96,186]}),
  S({hy:204,lean:96,thighF:-96,shinF:-100,armF:0,elbF:0,prop:'mat',arrow:[100,214,98,176]})
 ],
 cues:['על ארבע, ברך כפופה 90 מעלות.','דחוף את כף הרגל לתקרה, בלי לפתוח את הברך.','עצור בפסגה וכווץ, ואז רד באיטיות.'],
 tips:'האגן לא מסתובב — דמיין כוס מים על הגב התחתון.'
},
{
 id:'step_up', name:'עליית מדרגה', sub:'ישבן + רגליים', view:'side',
 frames:[
  S({hx:140,hy:206,lean:14,thighF:34,shinF:-44,armF:20,elbF:-10,prop:'step',arrow:[150,220,150,186]}),
  S({hx:150,hy:152,lean:6,thighF:6,shinF:-6,armF:16,elbF:-8,prop:'step',arrow:[152,168,152,140]})
 ],
 cues:['רגל אחת על מדרגה בגובה הברך.','עלה דרך העקב של הרגל שעל המדרגה, בלי לדחוף מהרגל שעל הרצפה.','רד לאט, אותה רגל מובילה.'],
 tips:'הברך לא נופלת פנימה. הוסף משקולות כשקל.'
},
{
 id:'lunge', name:'לאנג׳ הולך', sub:'ישבן + איזון', view:'side',
 frames:[
  S({hx:150,hy:160,lean:8,thighF:6,shinF:-6,thighB:-6,shinB:4,armF:20,elbF:-14,prop:'dumbbell',dx1:170,dy1:210,arrow:[150,176,150,206]}),
  S({hx:150,hy:196,lean:12,thighF:30,shinF:-34,thighB:-40,shinB:44,armF:20,elbF:-14,prop:'dumbbell',dx1:170,dy1:214,arrow:[150,212,150,240]})
 ],
 cues:['צעד גדול קדימה, משקולות בצדדים.','רד עד שברך אחורית כמעט נוגעת ברצפה.','דחוף מהעקב הקדמי, וצעד עם הרגל השנייה.'],
 tips:'גו זקוף, מבט קדימה. הצעד ארוך מספיק כדי שהברך לא תעבור את בהונות.'
},
{
 id:'good_morning', name:'גוד מורנינג', sub:'שרשרת אחורית', view:'side',
 frames:[
  S({hx:150,hy:150,lean:6,thighF:3,shinF:-3,armF:170,elbF:-160,prop:'bar',arrow:[196,150,214,196]}),
  S({hx:146,hy:158,lean:78,thighF:6,shinF:-6,armF:170,elbF:-160,prop:'bar',arrow:[196,160,214,206]})
 ],
 cues:['מוט על השכמות, ברכיים רכות.','דחוף אגן אחורה והטה גו עד כמעט מקביל לרצפה.','חזור על ידי מתיחת הישבן והמסטרינג.'],
 tips:'משקל קל בהתחלה. הגב נשאר ניטרלי לאורך כל התנועה.'
},
{
 id:'sumo_squat', name:'סקוואט סומו', sub:'ישבן · פנימי + חיצוני', view:'front',
 frames:[
  {view:'front',hx:150,hy:150,lean:4,spread:34,kneeY:202,armOut:26,handDrop:52,prop:'dumbbell',dx1:132,dy1:220,arrow:[150,166,150,196]},
  {view:'front',hx:150,hy:188,lean:12,spread:46,kneeY:238,armOut:24,handDrop:46,prop:'dumbbell',dx1:132,dy1:250,arrow:[150,200,150,242]}
 ],
 cues:['עמידה רחבה, בהונות החוצה 30 מעלות.','רד אנכית עם משקולת בין הרגליים.','דחוף את הרצפה החוצה ועלה דרך העקבים.'],
 tips:'הברכיים עוקבות אחרי כיוון הבהונות, לא נופלות פנימה.'
},
{
 id:'abduction', name:'הרחקת ירכיים', sub:'ישבן אמצעי', view:'front',
 frames:[
  {view:'front',hx:150,hy:150,lean:2,spread:17,kneeY:200,armOut:30,handDrop:12,prop:'band',bx1:126,by1:214,bx2:174,by2:214,arrow:[178,206,206,206]},
  {view:'front',hx:150,hy:152,lean:2,spread:40,kneeY:198,armOut:30,handDrop:12,prop:'band',bx1:110,by1:214,bx2:190,by2:214,arrow:[190,206,214,206]}
 ],
 cues:['גומייה מעל הברכיים, חצי כריעה קלה.','הרחק את הברך החוצה נגד הגומייה, בלי להטות אגן.','חזור לאט, המתח נשאר כל הזמן.'],
 tips:'הטונוס בישבן האמצעי הוא מה שנותן את הקו הצדדי.'
},
{
 id:'lateral_walk', name:'הליכה צדית', sub:'ישבן אמצעי · סיבולת', view:'front',
 frames:[
  {view:'front',hx:150,hy:158,lean:6,spread:22,kneeY:206,armOut:18,handDrop:26,prop:'band',bx1:128,by1:212,bx2:172,by2:212,arrow:[190,190,214,190]},
  {view:'front',hx:158,hy:158,lean:6,spread:34,kneeY:206,armOut:18,handDrop:26,prop:'band',bx1:120,by1:212,bx2:180,by2:212,arrow:[196,190,220,190]}
 ],
 cues:['גומייה מעל הברכיים, חצי כריעה.','צעד צד אחד, ואז גרור את השני בלי לאבד מתח.','3 צעדים לכל צד ואז חזרה.'],
 tips:'הגומייה מתוחה כל הזמן. אגן יציב, בלי נדנוד.'
},
{
 id:'squat_pulse', name:'סקוואט פולס', sub:'שריפה · סיום', view:'front',
 frames:[
  {view:'front',hx:150,hy:176,lean:10,spread:30,kneeY:222,armOut:24,handDrop:30,arrow:[150,188,150,204]},
  {view:'front',hx:150,hy:188,lean:12,spread:32,kneeY:234,armOut:24,handDrop:30,arrow:[150,200,150,222]}
 ],
 cues:['רד לרבע סקוואט.','נדנד 3 ס״מ למעלה ולמטה בקצב מהיר.','שמור את הישבן דרוך כל הזמן.'],
 tips:'זה תרגיל סיום — הוא אמור לשרוף. 20-30 שניות.'
},
{
 id:'single_rdl', name:'דדליפט רומני על רגל אחת', sub:'איזון + המסטרינג', view:'side',
 frames:[
  S({hx:150,hy:150,lean:5,thighF:4,shinF:-4,thighB:-4,shinB:8,armF:8,elbF:-6,prop:'dumbbell',dx1:170,dy1:206,arrow:[196,170,214,214]}),
  S({hx:150,hy:152,lean:70,thighF:4,shinF:-4,thighB:-70,shinB:60,armF:4,elbF:-4,prop:'dumbbell',dx1:196,dy1:210,arrow:[214,180,236,206]})
 ],
 cues:['עמידה על רגל אחת, ברך רכה.','הטה גו קדימה והרגל השנייה מתיישרת אחורה לאותו קו.','חזור למעלה על ידי סגירת הישבן של הרגל העומדת.'],
 tips:'האגן נשאר מאוזן — לא להסתובב. אחז במשהו בהתחלה.'
}
];

// ---------- תוכניות ----------
const TIER={
 1:{name:'יסודות',days:5,sets:2,reps:'14-16',rest:45,load:'משקל גוף + גומייה',weeks:'8-10',minutes:28,intensity:0.55},
 2:{name:'טונוס',days:4,sets:3,reps:'12-14',rest:55,load:'גומייה + משקולות קלות',weeks:'8-12',minutes:36,intensity:0.7},
 3:{name:'חידוד',days:4,sets:4,reps:'8-12',rest:70,load:'משקולות בינוניות',weeks:'10-14',minutes:45,intensity:0.85},
 4:{name:'מקצועי',days:3,sets:4,reps:'6-8',rest:90,load:'מוט / משקולות כבדות',weeks:'12-16',minutes:52,intensity:1.0}
};
const DAYS={
 A:{t:'ישבן · כוח',s:'היפ תראסט ודחיפות',ex:['hip_thrust','rdl','bulgarian','kickback']},
 B:{t:'ישבן אמצעי',s:'צד וחיצוני',ex:['abduction','lateral_walk','sumo_squat','single_rdl']},
 C:{t:'שרשרת אחורית',s:'המסטרינג וישבן תחתון',ex:['rdl','good_morning','glute_bridge','donkey_kick']},
 D:{t:'רגל אחת',s:'עבודה חד-צדדית',ex:['bulgarian','step_up','single_rdl','lunge']},
 E:{t:'שאיבה ומטבולי',s:'נפח ושריפה',ex:['glute_bridge','sumo_squat','abduction','squat_pulse']}
};
const SPLIT={
 1:['A','B','C','E','A'],
 2:['A','B','C','E'],
 3:['A','C','B','D'],
 4:['A','D','C']
};

// ---------- מודל אורך ועצימות ----------
const TIER_MIN={1:18,2:24,3:30,4:50};
const ALT=['squat_pulse','lateral_walk','kickback','donkey_kick','step_up','lunge','abduction'];
function repMid(i){return Math.round(21-3.4*i);}          // 1→18 · 2→14 · 3→11 · 4→7
function repsRange(i){const m=repMid(i);return (m-1)+'-'+(m+2);}
function restSec(i){return Math.round(28+16*i);}          // 1→44 · 2→60 · 3→76 · 4→92
function workSec(i){return repMid(i)*3+10;}
function loadFor(i){
 if(i<=1.25)return 'משקל גוף + גומייה';
 if(i<=2.25)return 'גומייה + משקולות קלות';
 if(i<=3.25)return 'משקולות בינוניות';
 return 'מוט / משקולות כבדות';
}
function countFor(minutes){return minutes>=44?5:(minutes<=18?3:4);}
function estimate(minutes,inten,exCount){
 const n=exCount||countFor(minutes);
 const per=workSec(inten)+restSec(inten);
 const raw=Math.max(2,Math.round((minutes*60-300)/per));
 const perEx=Math.max(2,Math.min(6,Math.round(raw/n)));
 const real=Math.round((300+n*perEx*per)/60);
 return {sets:perEx,real:real,rest:restSec(inten),reps:repsRange(inten),repsN:repMid(inten),inten:inten,per:per,count:n};
}

function plan(tier,sex,opts){
 opts=opts||{};
 const t=TIER[tier]||TIER[2];
 const minutes=+(opts.minutes||TIER_MIN[tier]||30);
 const inten=+(opts.intensity||tier);
 const keys=SPLIT[tier]||SPLIT[2];
 const cnt=countFor(minutes);
 const est=estimate(minutes,inten,cnt);
 const days=keys.map((k,i)=>{
   const d=DAYS[k];
   let ex=d.ex.slice();
   if(sex==='f') ex=[ex[0],ex[1],ex[2],ex[3]].filter(Boolean);
   else ex=[ex[0],ex[2],ex[1],ex[3]].filter(Boolean);
   ex=ex.filter(Boolean);
   if(cnt>ex.length){const extra=ALT.filter(a=>ex.indexOf(a)<0); ex=ex.concat(extra.slice(0,cnt-ex.length));}
   if(cnt<ex.length) ex=ex.slice(0,cnt);
   const list=ex.map((e,idx)=>{
     const def=EX.find(x=>x.id===e)||EX[0];
     const isTime=(e==='squat_pulse');
     return {
       ex:e, name:def.name, sub:def.sub,
       sets: est.sets,
       reps: isTime? '30 שנ׳' : est.reps,
       rest: est.rest + (idx===0?10:0),
       load: loadFor(inten),
       timeBased: isTime,
       seconds: isTime?30:0
     };
   });
   return {key:k,title:d.t,sub:d.s,exercises:list,minutes:est.real};
 });
 return {tier:tier,t:t,days:days,minutes:est.real,intensity:inten,estimate:est};
}

// ---------- תזונה ----------
function nutrition(p,tier){
 const w=p.weight||75,h=p.height||175,age=p.age||30,sex=p.sex==='f'?0:1;
 const bmr = 10*w + 6.25*h - 5*age + (sex? 5 : -161);
 const act = tier===1?1.45: tier===2?1.5: tier===3?1.55:1.6;
 const tdee = Math.round(bmr*act);
 const deficit = tier===1?0.10: tier===2?0.13: tier===3?0.16:0.18;
 const kcal = Math.round(tdee*(1-deficit));
 const protein = Math.round(w*(tier>=3?2.0:1.8));
 const fat = Math.round(w*0.8);
 const carbs = Math.max(60,Math.round((kcal - protein*4 - fat*9)/4));
 return {bmr:Math.round(bmr),tdee,kcal,protein,fat,carbs};
}

window.DATA={EX,TIER,DAYS,SPLIT,plan,nutrition,getEx:(id)=>EX.find(e=>e.id===id),
 TIER_MIN,estimate,countFor,loadFor,restSec,repMid,repsRange};
})();
