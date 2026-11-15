/* שימי פיט · כרטיס "איזה שריר עובד" — מצויר על הדמות, בלי תלות בלבוש
   מציג: שריר ראשי (צבע זהב), מסייעים (כתום עמום), מתי השיא, ואיך. */
(function(){
  var COL = { primary:'rgba(187,140,232,0.95)', secondary:'rgba(232,140,60,0.55)', base:'rgba(255,255,255,0.10)' };

  /* אזורי גוף על סילואטה, קואורדינטות אחוזיות בתוך 100x200 */
  var ONLY_BACK  = ['glute_max','glute_med','lowback','hamstrings','calves'];
  var ONLY_FRONT = ['quads','core','hipflex','tfl'];
  var BOTH       = ['adductors'];
  function visibleIn(view,key){
    if(BOTH.indexOf(key)>=0) return true;
    return view==='back' ? ONLY_BACK.indexOf(key)>=0 : ONLY_FRONT.indexOf(key)>=0;
  }
  var BACK = {
    glute_max:  [[31,88,19,17],[50,88,19,17]],
    glute_med:  [[27,82,14,9],[59,82,14,9]],
    lowback:    [[40,66,20,14]],
    hamstrings: [[31,108,17,38],[52,108,17,38]],
    calves:     [[31,150,17,32],[52,150,17,32]],
    adductors:  [[43,108,6,34],[51,108,6,34]],
    core:       [[38,48,24,32]],
    quads:      [[31,108,17,38],[52,108,17,38]]
  };
  var FRONT = {
    quads:    [[31,102,17,44],[52,102,17,44]],
    core:     [[38,50,24,38]],
    hipflex:  [[36,92,28,10]],
    tfl:      [[26,88,8,14],[66,88,8,14]],
    adductors:[[43,108,6,34],[51,108,6,34]],
    glute_max:[[31,88,19,14],[50,88,19,14]],
    glute_med:[[27,82,14,9],[59,82,14,9]],
    hamstrings:[[31,108,17,38],[52,108,17,38]],
    lowback:  [[40,62,20,14]],
    calves:   [[31,150,17,32],[52,150,17,32]]
  };

  function svgFor(view, ex){
    var map = view==='back' ? BACK : FRONT;
    var out = '<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">';
    out += '<ellipse cx="50" cy="18" rx="11" ry="13" fill="'+COL.base+'"/>';
    out += '<rect x="42" y="30" width="16" height="10" rx="4" fill="'+COL.base+'"/>';
    out += '<rect x="26" y="40" width="48" height="52" rx="14" fill="'+COL.base+'"/>';
    out += '<rect x="30" y="90" width="18" height="100" rx="9" fill="'+COL.base+'"/>';
    out += '<rect x="52" y="90" width="18" height="100" rx="9" fill="'+COL.base+'"/>';
    out += '<rect x="12" y="42" width="12" height="62" rx="6" fill="'+COL.base+'"/>';
    out += '<rect x="76" y="42" width="12" height="62" rx="6" fill="'+COL.base+'"/>';
    function paint(key, color){
      var boxes = map[key]; if(!boxes || !visibleIn(view,key)) return;
      boxes.forEach(function(b){
        if(!b || b.length<4 || !b[2]) return;
        out += '<rect x="'+b[0]+'" y="'+b[1]+'" width="'+b[2]+'" height="'+b[3]+'" rx="7" fill="'+color+'"/>';
      });
    }
    (ex.secondary||[]).forEach(function(k){ paint(k, COL.secondary); });
    paint(ex.primary, COL.primary);
    out += '</svg>';
    return out;
  }

  window.muscleCard = function(exId){
    var ex = (window.EX_MUSCLES||{})[exId];
    if(!ex) return '';
    var M = window.MUSCLES, pm = M[ex.primary];
    var view = pm ? (pm.view==='front'?'front':'back') : 'back';
    var sec = (ex.secondary||[]).map(function(k){return M[k]?M[k].name:k;}).join(' · ');
    return '<div class="muscleCard" style="margin:10px 0;padding:12px;border-radius:16px;background:rgba(255,255,255,.06);direction:rtl">'
      + '<div style="display:flex;gap:12px;align-items:stretch">'
      +   '<div style="display:flex;gap:6px;width:176px;min-width:176px;height:184px">'
      +     '<div style="flex:1;text-align:center;font-size:11px;opacity:.7">חזית'+svgFor('front',ex)+'</div>'
      +     '<div style="flex:1;text-align:center;font-size:11px;opacity:.7">גב'+svgFor('back',ex)+'</div>'
      +   '</div>'
      +   '<div style="flex:1;font-size:14px;line-height:1.5">'
      +     '<div style="font-weight:700;color:#bb8ce8;font-size:16px">עובד: '+(pm?pm.name:'')+'</div>'
      +     '<div style="opacity:.85">מסייעים: '+sec+'</div>'
      +     '<div style="margin-top:6px"><b>איך:</b> '+ex.how+'</div>'
      +   '</div>'
      + '</div>'
      + '<div style="margin-top:8px;font-size:14px"><b>מתי השיא:</b> '+ex.peak+'</div>'
      + '<div style="font-size:14px"><b>איפה להתרכז:</b> '+ex.when+'</div>'
      + '<div style="font-size:13px;opacity:.8;margin-top:4px">'+ex.dose+'</div>'
      + '</div>';
  };
})();
