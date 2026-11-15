/* באנר התקנה עדין שנפתח עם האפליקציה — אנדרואיד: התקנה אמיתית, אייפון: מעבר להוראות */
(function(){
  var KEY = 'noa_install_hint_v1';
  function standalone(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true ||
           location.search.indexOf('webclip=1') >= 0;
  }
  function snoozed(){
    try{ var t = parseInt(localStorage.getItem(KEY)||'0',10); return t && (Date.now()-t) < 7*864e5; }catch(e){ return false; }
  }
  function snooze(){ try{ localStorage.setItem(KEY, String(Date.now())); }catch(e){} }
  if (standalone() || snoozed()) return;

  var deferred = null;
  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function(){ var b=document.getElementById('noaInstallBar'); if(b) b.remove(); snooze(); });

  function build(){
    if (document.getElementById('noaInstallBar')) return;
    var bar = document.createElement('div');
    bar.id = 'noaInstallBar';
    bar.style.cssText = 'position:fixed;left:10px;right:10px;bottom:12px;z-index:99999;'+
      'background:linear-gradient(180deg,#2a1b3d,#1b1226);border:1px solid #7a4fb0;border-radius:16px;'+
      'padding:12px 14px;display:flex;gap:10px;align-items:center;'+
      'box-shadow:0 12px 30px rgba(0,0,0,.45);font-family:-apple-system,"SF Hebrew","Heebo",system-ui,sans-serif;direction:rtl';
    bar.innerHTML =
      '<div style="flex:1;color:#f2ecfa;font-size:13.5px;line-height:1.45">'+
        '<b style="color:#d9b8ff;font-size:14px">התקן את שימי פיט · נועה</b><br>'+
        'אייקון במסך הבית, מסך מלא, בלי דפדפן'+
      '</div>'+
      '<button id="noaInstallGo" style="background:linear-gradient(180deg,#b98cf0,#8a5cd6);color:#1a0f2b;border:0;'+
        'border-radius:12px;padding:11px 16px;font-weight:800;font-size:14px;font-family:inherit">התקן</button>'+
      '<button id="noaInstallX" aria-label="סגור" style="background:transparent;border:0;color:#9d8fb5;font-size:20px;'+
        'padding:4px 6px;cursor:pointer">×</button>';
    document.body.appendChild(bar);
    bar.querySelector('#noaInstallX').onclick = function(){ snooze(); bar.remove(); };
    bar.querySelector('#noaInstallGo').onclick = function(){
      if (deferred) { deferred.prompt(); deferred = null; bar.remove(); return; }
      snooze(); location.href = 'install/';
    };
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(build, 2500);
  else window.addEventListener('load', function(){ setTimeout(build, 2500); });
})();
