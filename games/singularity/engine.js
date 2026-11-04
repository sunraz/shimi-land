/* SINGULARITY — deterministic simulation core.
   Same seed + same input trace  =>  same score. Always. (Used by the game AND the verifier.) */
(function (root) {
  'use strict';
  const WORLD = 1.0;               // play field is a circle radius 1.0
  const DT = 1 / 120;              // fixed timestep, must never vary
  const G = 2.0;                   // gravitational constant
  const EPS = 0.0009;              // softening, keeps forces finite at r->0
  const MAX_BODIES = 900;
  const DRAG = 7.5;             // energy loss near the core (the disk)

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function createState(seedStr) {
    const rnd = mulberry32(hashSeed(seedStr));
    return {
      seedStr, rnd, tick: 0,
      well: { x: 0, y: 0 },
      wellTarget: { x: 0, y: 0 },
      mass: 1.0,
      density: 0,          // 0..1, collapse at 1
      venting: 0,          // frames of vent cooldown
      resonance: 0,        // score multiplier from venting
      bodies: [],
      particles: [],
      score: 0,
      captured: 0,
      constellations: 0,
      alive: true,
      spawnAcc: 0,
      nextSpawn: 0.26,
      events: [],          // for audio/visual feedback: {t, kind, x, y, v}
      trace: []            // packed input, filled by game loop
    };
  }

  function spawnBody(s) {
    if (s.bodies.length >= MAX_BODIES) return;
    const r = s.rnd;
    const ang = r() * Math.PI * 2;
    const R = WORLD * 1.14;
    const x = Math.cos(ang) * R, y = Math.sin(ang) * R;
    // tangential velocity is what makes an orbit an orbit instead of a plunge.
    const tang = 0.52 + r() * 0.34;
    const inward = 0.30 + r() * 0.26;
    const tx = -Math.sin(ang), ty = Math.cos(ang);       // tangent
    const ix = -Math.cos(ang), iy = -Math.sin(ang);      // inward
    const spin = r() < 0.5 ? 1 : -1;
    const kind = r() < 0.12 ? 'giant' : (r() < 0.44 ? 'shard' : 'dust');
    const size = kind === 'giant' ? 1.7 : kind === 'shard' ? 1.0 : 0.72;
    s.bodies.push({
      x, y,
      vx: tx * tang * spin + ix * inward,
      vy: ty * tang * spin + iy * inward,
      r: 0.008 * size, m: size, kind,
      captured: false, sweep: 0, lastAng: Math.atan2(y, x), spins: 0,
      trail: [], life: 0, hue: r()
    });
  }


  /* Quantize an input frame to the exact grid stored in the trace.
     The simulation must receive the SAME numbers the trace records, otherwise
     a replay can drift away from the live run. */
  function quantizeInput(inp) {
    const qx = Math.round((clamp(inp.x, -1, 1) + 1) * 127.5) / 127.5 - 1;
    const qy = Math.round((clamp(inp.y, -1, 1) + 1) * 127.5) / 127.5 - 1;
    return { x: qx, y: qy, vent: !!inp.vent };
  }

  /* advance one fixed step. input = {x,y,vent} already quantized. */
  function step(s, input) {
    if (!s.alive) return s;
    s.tick++;

    // quantize the player's field position to a stable grid (determinism)
    s.wellTarget.x = Math.round(clamp(input.x, -0.95, 0.95) * 256) / 256;
    s.wellTarget.y = Math.round(clamp(input.y, -0.95, 0.95) * 256) / 256;
    s.well.x += (s.wellTarget.x - s.well.x) * 0.22;
    s.well.y += (s.wellTarget.y - s.well.y) * 0.22;

    if (input.vent && s.venting <= 0 && s.density > 0.14) {
      // vent: convert density to resonance, push everything outward
      const power = Math.min(1, s.density);
      s.density = Math.max(0, s.density - 0.34);
      s.resonance = Math.min(3.0, s.resonance + 0.55 + power * 0.8);
      s.venting = 48;
      for (const b of s.bodies) {
        const dx = b.x - s.well.x, dy = b.y - s.well.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const push = (0.9 + power * 1.6) / (1 + d * 2.2);
        b.vx += dx / d * push; b.vy += dy / d * push;
      }
      s.score += Math.round(28 * s.captured * (1 + power));
      s.events.push({ t: s.tick, kind: 'vent', x: s.well.x, y: s.well.y, v: power });
    }
    if (s.venting > 0) s.venting--;
    s.resonance *= 0.9975;

    // spawn cadence tightens as the run heats up
    s.spawnAcc += DT;
    const interval = Math.max(0.140, s.nextSpawn - s.tick * 0.0000018);
    if (s.spawnAcc >= interval) { s.spawnAcc = 0; spawnBody(s); }

    const M = s.mass * (1 + s.density * 1.4);
    for (let i = s.bodies.length - 1; i >= 0; i--) {
      const b = s.bodies[i];
      const dx = s.well.x - b.x, dy = s.well.y - b.y;
      const d2 = dx * dx + dy * dy + EPS;
      const d = Math.sqrt(d2);
      const a = G * M / d2;
      b.vx += (dx / d) * a * DT;
      b.vy += (dy / d) * a * DT;
      // accretion drag: matter loses energy near the core, exactly like a real disk.
      // without this nothing can ever be captured - it just slingshots away.
      const drag = DRAG * 1 / (1 + (d / 0.16) * (d / 0.16));
      const dv = 1 - drag * DT;
      b.vx *= dv; b.vy *= dv;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      b.life += DT;

      // capture = it is genuinely orbiting us: it has swept real angle while bound.
      const angNow = Math.atan2(b.y - s.well.y, b.x - s.well.x);
      let dA = angNow - b.lastAng;
      if (dA > Math.PI) dA -= Math.PI * 2; else if (dA < -Math.PI) dA += Math.PI * 2;
      b.lastAng = angNow;
      if (d < 0.42) b.sweep += Math.abs(dA); else b.sweep = Math.max(0, b.sweep - DT * 0.4);
      const speed = Math.hypot(b.vx, b.vy);
      if (!b.captured && b.sweep > 1.60 && d < 0.22 && speed < 3.2) {
        b.spins = b.sweep;
        b.captured = true;
        s.captured++;
        s.density = Math.min(1.15, s.density + 0.036 * b.m);
        const gain = Math.round(10 * b.m * (1 + s.resonance));
        s.score += gain;
        s.events.push({ t: s.tick, kind: 'capture', x: b.x, y: b.y, v: b.m, gain });
        // constellation: every 8 captured bodies
        if (s.captured % 8 === 0) {
          s.constellations++;
          s.score += 120 * s.constellations;
          s.resonance = Math.min(3.0, s.resonance + 0.4);
          s.events.push({ t: s.tick, kind: 'constellation', x: s.well.x, y: s.well.y, v: s.constellations });
        }
      }

      // escaped the universe: gone, no penalty but no points
      if (d > WORLD * 2.4) { s.bodies.splice(i, 1); continue; }
      // fell into the core: absorbed (counts as mass, small score)
      if (d < b.r * 0.9) {
        s.density = Math.min(1.15, s.density + 0.006 * b.m);
        s.score += Math.round(3 * b.m);
        s.events.push({ t: s.tick, kind: 'absorb', x: b.x, y: b.y, v: b.m });
        s.bodies.splice(i, 1); continue;
      }
    }

    s.mass = 1 + s.captured * 0.06;
    if (s.density >= 1.0) {
      s.alive = false;
      s.events.push({ t: s.tick, kind: 'collapse', x: s.well.x, y: s.well.y, v: 1 });
    }
    if (s.events.length > 64) s.events.splice(0, s.events.length - 64);
    return s;
  }

  /* ---- input trace: compact, deterministic, replayable ---- */
  function packTrace(frames) {
    // each frame: x,y quantized to 8-bit over [-1,1], plus a vent flag bit
    const bytes = new Uint8Array(frames.length * 2);
    let flags = [];
    for (let i = 0; i < frames.length; i++) {
      bytes[i * 2] = Math.round((clamp(frames[i].x, -1, 1) + 1) * 127.5);
      bytes[i * 2 + 1] = Math.round((clamp(frames[i].y, -1, 1) + 1) * 127.5);
      if (frames[i].vent) flags.push(i);
    }
    return { xy: b64(bytes), flags, n: frames.length };
  }
  function unpackTrace(t) {
    const bytes = unb64(t.xy);
    const out = [];
    const flagSet = new Set(t.flags || []);
    for (let i = 0; i < t.n; i++) {
      out.push({
        x: bytes[i * 2] / 127.5 - 1,
        y: bytes[i * 2 + 1] / 127.5 - 1,
        vent: flagSet.has(i)
      });
    }
    return out;
  }
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return (typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'));
  }
  function unb64(str) {
    const s = (typeof atob !== 'undefined' ? atob(str) : Buffer.from(str, 'base64').toString('binary'));
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }

  /* replay a whole run from seed + trace: returns the score the physics actually produces */
  function replay(seedStr, trace) {
    const s = createState(seedStr);
    const frames = unpackTrace(trace);
    for (let i = 0; i < frames.length && s.alive; i++) step(s, frames[i]);
    return { score: s.score, captured: s.captured, constellations: s.constellations, alive: s.alive, ticks: s.tick };
  }

  function digest(seedStr, trace, score) {
    const payload = seedStr + '|' + trace.xy + '|' + (trace.flags || []).join(',') + '|' + score;
    let h = 2166136261 >>> 0;
    for (let i = 0; i < payload.length; i++) { h ^= payload.charCodeAt(i); h = Math.imul(h, 16777619); }
    let h2 = 5381 >>> 0;
    for (let i = payload.length - 1; i >= 0; i--) { h2 = ((h2 * 33) ^ payload.charCodeAt(i)) >>> 0; }
    return (h >>> 0).toString(36).padStart(7, '0') + (h2 >>> 0).toString(36).padStart(7, '0');
  }

  const api = { WORLD, DT, createState, step, replay, packTrace, unpackTrace, digest, hashSeed, mulberry32, quantizeInput };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SINGULARITY = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
