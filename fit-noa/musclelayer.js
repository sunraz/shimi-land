/* שימי פיט · שכבת כיווץ ושחרור על הדמות
   מצייר על גבי קנבס הדמות הילה זהב באזור השריר העובד, בעוצמה שמתחלפת עם החזרה:
   כיווץ בשיא התנועה, שחרור בחזרה להתחלה. עובד עם FIG.rig ו-EX_MUSCLES. */
(function () {
  var GOLD = [232, 184, 75];
  var SEC = [232, 140, 60];

  function anchor(r, key, side) {
    var hip = r.hip, sh = r.sh, knee = r.knees ? r.knees[0].knee : (r.legs ? r.legs[0].knee : null);
    if (!knee) knee = [hip[0], hip[1] + 60];
    var dir = r.dir || 1;
    var up = r.up || [0, -1];
    var back = [dir * up[1], -dir * up[0]];               /* אחורה (מנוגד לכיוון הפנים) */
    var front = [-back[0], -back[1]];                      /* קדימה */
    var midThigh = [hip[0] * 0.52 + knee[0] * 0.48, hip[1] * 0.52 + knee[1] * 0.48];
    var midTorso = [hip[0] * 0.55 + sh[0] * 0.45, hip[1] * 0.55 + sh[1] * 0.45];
    switch (key) {
      case 'glute_max':
        return { p: [hip[0] + back[0] * 6 - up[0] * 3, hip[1] + back[1] * 6 - up[1] * 3], r: 16, axis: 0.5 };
      case 'glute_med':
        return { p: [hip[0] + back[0] * 5 - up[0] * 9, hip[1] + back[1] * 5 - up[1] * 9], r: 12, axis: 0.3 };
      case 'hamstrings':
        return { p: [midThigh[0] + back[0] * 4, midThigh[1] + back[1] * 4], r: 14, axis: 0.65 };
      case 'quads':
        return { p: [midThigh[0] + front[0] * 4, midThigh[1] + front[1] * 4], r: 14, axis: 0.65 };
      case 'core':
        return { p: [midTorso[0] + front[0] * 5, midTorso[1] + front[1] * 5], r: 13, axis: 0.45 };
      case 'lowback':
        return { p: [hip[0] - up[0] * 10 + back[0] * 3, hip[1] - up[1] * 10 + back[1] * 3], r: 12, axis: 0.4 };
      case 'calves':
        return { p: [knee[0] * 0.35 + (r.legs && r.legs[0].ankle[0]) * 0.65, knee[1] * 0.35 + (r.legs && r.legs[0].ankle[1]) * 0.65], r: 10, axis: 0.7 };
      default:
        return { p: [hip[0], hip[1]], r: 14, axis: 0.5 };
    }
  }

  function glow(ctx, p, rad, k, color) {
    var g = ctx.createRadialGradient(p[0], p[1], rad * 0.15, p[0], p[1], rad);
    g.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (0.62 * k) + ')');
    g.addColorStop(0.55, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (0.26 * k) + ')');
    g.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
    ctx.beginPath();
    ctx.arc(p[0], p[1], rad, 0, 7);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function fibers(ctx, p, rad, k, angle) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(255,235,190,' + (0.5 * k) + ')';
    ctx.lineWidth = 1.1;
    for (var i = -2; i <= 2; i++) {
      var y = i * (rad * 0.30);
      var half = Math.sqrt(Math.max(0, rad * rad * 0.55 - y * y));
      ctx.beginPath();
      ctx.moveTo(-half * 0.8, y);
      ctx.lineTo(half * 0.8, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx, pose, exId, k, opts) {
    opts = opts || {};
    if (!window.FIG || !FIG.rig) return;
    var r;
    try { r = FIG.rig(pose); } catch (e) { return; }
    var ex = (window.EX_MUSCLES || {})[exId] || {};
    var primary = ex.primary || 'glute_max';
    var secondary = ex.secondary || [];
    var a = anchor(r, primary);
    var pulse = 0.55 + 0.45 * Math.sin(performance.now() / 260);
    var kk = Math.max(0, Math.min(1, k * (0.82 + 0.18 * pulse)));
    if (k < 0.06) return { k: 0, primary: primary };

    ctx.save();
    if (opts.scale) { ctx.scale(opts.scale[0], opts.scale[1]); }
    /* מסייעים — הילה חלשה */
    secondary.slice(0, 3).forEach(function (key) {
      var b = anchor(r, key);
      glow(ctx, b.p, b.r * 0.9, kk * 0.42, SEC);
    });
    /* ראשי — הילה, סיבים וטבעת מאמץ */
    glow(ctx, a.p, a.r * (1.05 + 0.18 * kk), kk, GOLD);
    fibers(ctx, a.p, a.r * (1.05 + 0.18 * kk), kk, a.axis);
    ctx.beginPath();
    ctx.arc(a.p[0], a.p[1], a.r * (1.25 + 0.35 * kk), 0, 7);
    ctx.strokeStyle = 'rgba(187,140,232,' + (0.14 + 0.62 * kk) + ')';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return { k: kk, primary: primary };
  }

  /* עוצמת כיווץ מתוך פאזת התנועה: 0 בתחילת החזרה, 1 בשיא */
  function tension(phase) {
    var s = Math.sin(Math.PI * (((phase % 1) + 1) % 1));
    return Math.max(0, Math.min(1, s));
  }

  window.ML = { draw: draw, tension: tension, anchor: anchor };
})();
