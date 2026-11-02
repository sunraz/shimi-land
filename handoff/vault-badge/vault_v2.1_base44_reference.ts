// ═══════════════════════════════════════════════════════════════════
// VAULT v2.1 (02/11, הוראת סאן: תג זהות כמו טביעת אצבע — אין סיסמאות, אין טוקנים מתחלפים): badge_register + אימות חתימת Ed25519 (VAULT|agent|ts|nonce) + דרגות אמון basic/member/full מהלוח. (02/11, דרישת סאן: 'שזה יפסיק לקרות'): (1) rotate_token — שחזור עצמי עם כל טוקן חי; (2) זיהוי לפי טוקן גם כשהשם לא תואם; (3) claim_issue force למנהל.
// VAULT v2.0.6 (15/10 לילה, דיווח שימי-של-סאן): withRetry על כתיבות VaultAgent (claim/claim_issue) — mongodb timeout 20s חוזר 3 פעמים עם הפסקה של 3 שניות במקום 500 מיידי.
// VAULT v2.0.5 (15/10, החלטת סאן על טוקנים אישיים): טוקן nbp- = טוקן מפתח — מזהה גם מול הכספת (additive לקוד האישי הקיים)
// VAULT v2.0.4 (13/10 ~13:40): private+sensitive => בעלים בלבד גם למנהלים; put על קיים שומר בעלות (transfer_owner למנהל); סוכן אחר לא מעדכן סוד של אחר
// VAULT v2.0.7 (22/10): קריאות ממוקדות — filter לפי מפתח/hash במקום list מלא (תיקון 'App entity read traffic volume limit exceeded'), מטמון זיהוי 5 דק'. תואם ל-v2.0.6.
// VAULT v2.0.3: כספת פרטית (private ב-get), גרסה בכל תשובה. VAULT v2.0.2: קוד אישי קבוע (מדיניות סאן 12:46).
// VAULT v2.0.1 (13/10, הוראת סאן דרך המבקר הראשי)
// שינוי מהותי מ-v1:
//  1. put פתוח לכל סוכן רשום (אין יותר ADMIN_AGENTS כשער ל-put).
//  2. get פתוח לכל סוכן רשום, על כל הסודות הפעילים.
//  3. טוקן אישי לכל סוכן (SHA-256 ב-VaultAgent). אין טוקן כספת משותף.
//     הרשמה: קוד תביעה חד-פעמי (claim_pending) ← הסוכן מחליף בטוקן אישי (claim).
//     ביטול סוכן אחד לא מפיל את האחרים (revoke פר-סוכן).
//  4. ביקורת מלאה: כל put/get/claim נרשם עם שם הסוכן ושעה. לעולם בלי ערך הסוד.
//  5. ניהול (ביטול טוקן, קודי תביעה, מחיקת סוד, צפייה בביקורת): סאן והמבקר הראשי בלבד.
// v2.0.1: ביצת target — פעולות ניהול מקבלות את שם היעד בשדה target (agent מזהה את הקורא).
//
// ⚠ סיכון ידוע (מתועד ב-vault-README.md, החלטת סאן עדיין לא התקבלה):
//   סוד שסוכן אחד שמר נגיש לכולם ← סוכן אחד שנפרץ חושף את כל הסודות.
//   המלצת המבקר בהמתנה: שדה רגישות + הגבלת get לסודות כספיים.
// ═══════════════════════════════════════════════════════════════════
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// פעולות ניהול בלבד (לא put/get): סאן והמבקר הראשי
const MANAGERS = ['shimi-sun', 'shimi-rashi'];

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function newToken(prefix: string): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return prefix + '-' + [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// v2.0.6: ניסיון חוזר על כתיבות — מגן מ-timeouts חולפים של mongo (דיווח 15/10: 500 mongodb timed out 20000ms)
const withRetry = async <T>(fn: () => Promise<T>, tries = 3, backoffMs = 3000): Promise<T> => {
  let lastErr: any;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; if (i < tries) await new Promise(r => setTimeout(r, backoffMs)); }
  }
  throw lastErr;
};


// v2.0.7: קריאה ממוקדת — קודם filter (נפח קריאה מינימלי), נפילה ל-list מלא אם filter לא נתמך
const q = async (entity: any, flt: Record<string, any>): Promise<any[]> => {
  try { return await entity.filter(flt) as any[]; } catch (_e) { return await entity.list({}) as any[]; }
};
// v2.0.7: מטמון זיהוי (טוקן→סוכן) בזיכרון ה-instance החם — TTL 5 דק'. ערכי סודות לעולם לא במטמון.
const ID_CACHE = new Map<string, { agent: string; row: any; ts: number }>();
// v2.1: הגנת replay לתגים — nonce חד-פעמי בחלון של 10 דק'
const NONCE_SEEN = new Map<string, number>();
const b64uToBytes = (v: string): Uint8Array => {
  const pad = v.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - pad.length % 4) % 4));
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
};
const verifyBadge = async (db: any, agentName: string, ts: string, nonce: string, sig: string): Promise<{ ok: boolean; badge?: any; why?: string }> => {
  try {
    if (!agentName || !ts || !nonce || !sig) return { ok: false, why: 'badge fields missing' };
    const now = Date.now();
    const tsMs = Number(ts);
    if (!tsMs || Math.abs(now - tsMs) > 300000) return { ok: false, why: 'stale timestamp' };
    const nk = agentName + ':' + nonce;
    if (NONCE_SEEN.has(nk)) return { ok: false, why: 'nonce replay' };
    const badges = await q(db.VaultBadge, { agent: agentName });
    const badge = badges.find((b: any) => b.status === 'active');
    if (!badge) return { ok: false, why: 'no badge registered for agent' };
    const key = await crypto.subtle.importKey('raw', b64uToBytes(badge.public_key), { name: 'Ed25519' }, false, ['verify']);
    const msg = new TextEncoder().encode('VAULT|' + agentName + '|' + ts + '|' + nonce);
    const valid = await crypto.subtle.verify('Ed25519', key, b64uToBytes(sig), msg);
    if (!valid) return { ok: false, why: 'badge signature invalid' };
    NONCE_SEEN.set(nk, now);
    if (NONCE_SEEN.size > 5000) { for (const [k, v] of NONCE_SEEN) if (now - v > 600000) NONCE_SEEN.delete(k); }
    return { ok: true, badge };
  } catch (e) {
    return { ok: false, why: 'badge verify error: ' + String(e) };
  }
};
const tierFor = (trust: number): string => (trust >= 50 ? 'full' : trust >= 20 ? 'member' : 'basic');
const ID_TTL_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const body: any = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const url = new URL(req.url);
  const agent = String((req.method === 'GET' ? url.searchParams.get('agent') : body.agent) || '').trim();
  const authHeader = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  // v2.1: תג זהות (badge) — חתימת Ed25519 על הזהות הקיימת של הסוכן. אפס סיסמאות, אפס טוקנים מתחלפים.
  const badgeTs = String(body.badge_ts || '');
  const badgeNonce = String(body.badge_nonce || '');
  const badgeSig = String(body.badge_sig || '');

  const audit = async (op: string, key: string, granted: boolean, note = '', who = '') => {
    try {
      // לעולם לא כותבים ערכי סודות ללוג — רק שם סוכן, פעולה, מפתח, אישור
      await db.VaultAccessLog.create({ agent: who || agent || 'unknown', op, key: (key || '').slice(0, 100), granted, note: String(note || '').slice(0, 200) });
    } catch (_e) { /* ביקורת לא חוסמת פעולה */ }
  };

  // ─── זיהוי סוכן רשום: טוקן אישי (active) בלבד ───
  const identify = async (): Promise<{ agent: string; row: any; tier?: string } | null> => {
    if (!agent) return null;
    const hash = authHeader ? await sha256(authHeader) : '';
    // v2.0.7: מטמון זיהוי חם
    const ck = agent + ':' + hash;
    const cached = ID_CACHE.get(ck);
    if (cached && Date.now() - cached.ts < ID_TTL_MS) return { agent, row: cached.row };
    const rows = hash ? await q(db.VaultAgent, { token_hash: hash }) : [];
    const row = rows.find((r: any) => r.agent === agent && r.token_hash === hash && r.status === 'active');
    if (row) { ID_CACHE.set(ck, { agent, row, ts: Date.now() }); return { agent, row }; }
    // v2.0.8: זיהוי לפי טוקן — אם ה-hash שייך לסוכן פעיל אחד, השם שנשלח לא חובה שיתאים (תיקון כשל שם עברי/כינוי)
    const anyActive = rows.find((r: any) => r.token_hash === hash && r.status === 'active');
    if (anyActive) {
      await audit('identity', '', true, 'identified by token hash (agent name mismatch: ' + agent + ')', anyActive.agent);
      ID_CACHE.set(ck, { agent: anyActive.agent, row: anyActive, ts: Date.now() });
      return { agent: anyActive.agent, row: anyActive };
    }
    // v2.0.5 (החלטת סאן 15/10): טוקן ה-nbp- הוא טוקן המפתח של הסוכן — פותח גם את הכספת (additive)
    if (authHeader && authHeader.startsWith('nbp-')) {
      const nbpRows = await q(db.NetBoardToken, { token_hash: hash });
      const nbp = nbpRows.find((r: any) => r.agent === agent && r.token_hash === hash && r.status === 'active');
      if (nbp) {
        await audit('identity', '', true, 'nbp master-key identity (v2.0.5)', agent);
        ID_CACHE.set(ck, { agent, row: { agent, token_hash: hash, status: 'active', notes: 'nbp master-key identity (v2.0.5)' }, ts: Date.now() });
        return { agent, row: { agent, token_hash: hash, status: 'active', notes: 'nbp master-key identity (v2.0.5)' } };
      }
    }
    // v2.1: תג חתימה — הזהות הקיימת של הסוכן, בלי סיסמה
    const bv = await verifyBadge(db, agent, badgeTs, badgeNonce, badgeSig);
    if (bv.ok && bv.badge) {
      await audit('identity', '', true, 'badge (ed25519) — tier ' + tierFor(Number(bv.badge.trust || 0)), agent);
      db.VaultBadge.update(bv.badge.id, { last_seen: new Date().toISOString() }).catch(() => {});
      return { agent, row: bv.badge, tier: tierFor(Number(bv.badge.trust || 0)) } as any;
    }
    return null;
  };

  try {
    // ─── claim: החלפת קוד תביעה חד-פעמי בטוקן אישי (בלי טוקן) ───
    if (body.action === 'claim') {
      const code = String(body.claim_code || '');
      const hash = await sha256(code);
      const rows = await q(db.VaultAgent, { token_hash: hash });  // v2.0.7: קריאה ממוקדת
      // מדיניות v2.0.2 (הוראת סאן 13/10 12:46): קוד אישי קבוע — אינו חד-פעמי ואינו פג. שימוש חוזר לגיטימי.
      const active = rows.find((r: any) => r.agent === agent && r.token_hash === hash && r.status === 'active');
      if (active) { await audit('claim', '', true, 'permanent code reuse ok', agent); return json({ ok: true, agent, permanent: true, note: 'הקוד האישי הקבוע תקין ואינו פג. השתמש בו ישירות בכותרת Authorization: Bearer + agent.' }); }
      const row = rows.find((r: any) => r.agent === agent && r.token_hash === hash && r.status === 'claim_pending');
      if (!row) { await audit('claim', '', false, 'bad or expired claim code', agent); return json({ ok: false, error: 'invalid claim code for this agent' }, 401); }
      const token = newToken('vat');
      const tokenHash = await sha256(token);
      await withRetry(() => db.VaultAgent.update(row.id, { token_hash: tokenHash, status: 'active', notes: String(row.notes || '') + ' | registered ' + new Date().toISOString() }));
      await audit('claim', '', true, 'agent registered, personal token issued', agent);
      return json({ ok: true, agent, token, note: 'שמור את הטוקן הזה אצלך. הוא לא נשלח שוב לעולם ולא נכתב בשום לוג.' });
    }

    // ─── v2.1: badge_register — רישום עצמי של תג הזהות. הסוכן חותם על הרישום במפתח שלו (הוכחת בעלות).
    if (body.action === 'badge_register') {
      const pub = String(body.public_key || '').trim();
      const ts = String(body.badge_ts || '');
      const nonce = String(body.badge_nonce || '');
      const sig = String(body.badge_sig || '');
      if (!agent || !pub || !ts || !nonce || !sig) return json({ ok: false, error: 'agent, public_key, badge_ts, badge_nonce, badge_sig are required' }, 400);
      try {
        const key = await crypto.subtle.importKey('raw', b64uToBytes(pub), { name: 'Ed25519' }, false, ['verify']);
        const msg = new TextEncoder().encode('BADGE_REGISTER|' + agent + '|' + pub);
        const okSig = await crypto.subtle.verify('Ed25519', key, b64uToBytes(sig), msg);
        if (!okSig) { await audit('badge_register', '', false, 'signature invalid', agent); return json({ ok: false, error: 'signature does not match public_key' }, 401); }
      } catch (e) { return json({ ok: false, error: 'bad key/signature format: ' + String(e) }, 400); }
      // רשום על הלוח? לפי ניקוד האמון שלו נקבעת דרגת הגישה
      let trust = 0;
      try {
        const boardAgents = await q(db.NetBoardAgent, { name: agent });
        const ba = boardAgents.find((x: any) => x.name === agent);
        if (ba) trust = Number(ba.trust || 0);
      } catch (_e) { /* אם הלוח לא זמין — לא חוסמים רישום, אבל הדרגה basic */ }
      const existing = (await q(db.VaultBadge, { agent })) as any[];
      const row = existing.find((b: any) => b.status === 'active');
      const payload = { agent, public_key: pub, status: 'active', trust, tier: tierFor(trust), notes: 'self-registered badge (ed25519) ' + new Date().toISOString() };
      if (row) await withRetry(() => db.VaultBadge.update(row.id, payload));
      else await withRetry(() => db.VaultBadge.create(payload));
      ID_CACHE.clear();
      await audit('badge_register', '', true, 'badge registered, tier ' + tierFor(trust), agent);
      return json({ ok: true, agent, tier: tierFor(trust), trust, note: 'התג נרשם. מעכשיו מזדהים בחתימה: VAULT|agent|ts|nonce (חתימת Ed25519), בשדות badge_ts/badge_nonce/badge_sig. אין סיסמה ואין טוקן.' });
    }

    const who = await identify();
    if (!who) { await audit(String(body.action || 'list'), String(body.key || ''), false, 'no valid personal token'); return json({ ok: false, error: 'not authorized: personal token required (claim your token via action=claim)', version: '2.1' }, 401); }

    // ─── v2.0.8: rotate_token — שחזור עצמי. מי שמחזיק טוקן חי כלשהו (אישי או nbp) מנפיק לעצמו טוקן כספת חדש ───
    if (String(body.action || '') === 'rotate_token') {
      const token = newToken('vat');
      const tokenHash = await sha256(token);
      const mine = await q(db.VaultAgent, { agent: who.agent });
      const activeRow = mine.find((r: any) => r.status === 'active');
      if (activeRow) {
        await withRetry(() => db.VaultAgent.update(activeRow.id, { token_hash: tokenHash, status: 'active', notes: String(activeRow.notes || '') + ' | rotated ' + new Date().toISOString() }));
      } else {
        await withRetry(() => db.VaultAgent.create({ agent: who.agent, token_hash: tokenHash, status: 'active', notes: 'self-rotate by ' + who.agent + ' ' + new Date().toISOString() }));
      }
      ID_CACHE.clear();
      await audit('rotate_token', '', true, 'personal token rotated (value not logged)', who.agent);
      return json({ ok: true, agent: who.agent, token, note: 'טוקן כספת חדש. הקודם בוטל. שמור במקום קבוע; אפשר לסובב שוב בכל עת עם action=rotate_token.' });
    }

    // ─── GET list: שמות ותיאורים בלבד — פתוח לכל סוכן רשום ───
    if (req.method === 'GET') {
      await audit('list', '', true, '', who.agent);
      const entries = await db.VaultEntry.list({}) as any[];
      return json({
        ok: true, vault: 'shimi-network', version: '2.0.7', agent: who.agent,
        howto: 'v2.0.4: private/sensitive = owner only (managers too). put on existing key: owner/manager only, ownership preserved (manager: transfer_owner:true). put: {action:"put", key, value, description, private?, sensitive?} | get: {action:"get", key} | claim: {action:"claim", agent, claim_code} | management (Sun/Rashi): claim_issue/revoke/delete_secret take "target"',
        entries: entries.filter((e: any) => e.status !== 'revoked').map((e: any) => ({ key: e.key, description: e.description, owner: e.owner_agent, sensitive: !!e.sensitive, private: !!e.private, status: e.status, updated: e.updated_date })),
      });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'GET or POST only' }, 405);
    const action = String(body.action || '');

    // ─── put: פתוח לכל סוכן רשום ───
    if (action === 'put') {
      const key = String(body.key || '').trim();
      const value = String(body.value || '');
      const description = String(body.description || '').trim();
      if (!key || !value || !description) return json({ ok: false, error: 'key, value AND description are required' }, 400);
      const entries = await q(db.VaultEntry, { key });  // v2.0.7: קריאה ממוקדת במקום list מלא
      const e = entries.find((x: any) => x.key === key);
      if (e) {
        // v2.0.4: מפתח קיים — רק הבעלים או מנהל מעדכנים; הבעלות נשמרת אלא אם מנהל ביקש transfer_owner:true
        if (e.owner_agent !== who.agent && !MANAGERS.includes(who.agent)) {
          await audit('put', key, false, 'key owned by another agent', '', who.agent);
          return json({ ok: false, error: 'key exists, owned by ' + e.owner_agent + '; only the owner or a manager can update it', version: '2.1' }, 403);
        }
        const newOwner = (!!body.transfer_owner && MANAGERS.includes(who.agent)) ? who.agent : e.owner_agent;
        await db.VaultEntry.update(e.id, { value, description, owner_agent: newOwner, status: 'active', sensitive: !!body.sensitive, private: !!body.private });
      } else {
        await db.VaultEntry.create({ key, value, description, owner_agent: who.agent, status: 'active', sensitive: !!body.sensitive, private: !!body.private });
      }
      await audit('put', key, true, 'value stored (not logged)', '', who.agent);
      return json({ ok: true, key, stored: true, by: who.agent });
    }

    // ─── get: פתוח לכל סוכן רשום, על כל סוד פעיל ───
    if (action === 'get') {
      const key = String(body.key || '').trim();
      if (!key) return json({ ok: false, error: 'key is required' }, 400);
      const entries = await q(db.VaultEntry, { key });  // v2.0.7: קריאה ממוקדת במקום list מלא
      const e = entries.find((x: any) => x.key === key && x.status !== 'revoked');
      if (!e) { await audit('get', key, false, 'not found', '', who.agent); return json({ ok: false, error: 'key not found', version: '2.1' }, 404); }
      // v2.0.4 (החלטה מוכרזת, דרישת המבקר הראשי 13/10): סוד private או sensitive — בעלים בלבד, כולל מנהלים.
      // מנהלים שומרים על פעולות ניהול (revoke / delete_secret / claim_issue / audit) אבל לא קוראים ערכים.
      if ((!!e.private || !!e.sensitive) && e.owner_agent !== who.agent) {
        await audit('get', key, false, 'private/sensitive secret - owner only', '', who.agent);
        return json({ ok: false, error: 'private/sensitive secret: owner only (managers included); management actions revoke/delete_secret remain available', version: '2.1' }, 403);
      }
      // v2.1: דרגת אמון — basic רואה רק סודות בבעלותו
      const tier = (who as any).tier || 'full';
      if (tier === 'basic' && e.owner_agent !== who.agent) {
        await audit('get', key, false, 'tier basic: own secrets only', '', who.agent);
        return json({ ok: false, error: 'tier basic (trust<20): own secrets only. Trust grows with board activity.', version: '2.1' }, 403);
      }
      await audit('get', key, true, 'value delivered (not logged)', '', who.agent);
      return json({ ok: true, key, value: e.value, description: e.description, owner: e.owner_agent, sensitive: !!e.sensitive, updated: e.updated_date });
    }

    // ─── מכאן והלאה: פעולות ניהול — סאן והמבקר הראשי בלבד ───
    const isManager = MANAGERS.includes(who.agent);

    // claim_issue: הנפקת קוד תביעה לסוכן חדש (היעד בשדה target)
    if (action === 'claim_issue') {
      if (!isManager) { await audit('claim_issue', String(body.target || ''), false, 'not manager', '', who.agent); return json({ ok: false, error: 'only ' + MANAGERS.join(', ') + ' can issue claim codes' }, 403); }
      const target = String(body.target || '').trim();
      if (!target) return json({ ok: false, error: 'target is required' }, 400);
      const rows = await db.VaultAgent.list({}) as any[];
      const existing = rows.find((r: any) => r.agent === target && r.status === 'active');
      if (existing && !body.force) return json({ ok: false, error: 'agent already registered (active); pass force:true to issue a recovery claim code', version: '2.1' }, 409);
      const code = newToken('claim');
      const codeHash = await sha256(code);
      const pending = existing && body.force ? existing : rows.find((r: any) => r.agent === target && r.status === 'claim_pending');
      if (pending) await withRetry(() => db.VaultAgent.update(pending.id, { token_hash: codeHash, status: 'claim_pending', notes: 'recovery code issued by ' + who.agent }));
      else await withRetry(() => db.VaultAgent.create({ agent: target, token_hash: codeHash, status: 'claim_pending', notes: 'issued by ' + who.agent }));
      await audit('claim_issue', target, true, 'claim code issued (code not logged)', '', who.agent);
      return json({ ok: true, agent: target, claim_code: code, note: 'מסור את הקוד לסוכן נקודה-לנקודה. הוא חד-פעמי ולא נשמר בלוג.' });
    }

    // revoke: ביטול טוקן של סוכן — לא משפיע על האחרים (היעד בשדה target)
    if (action === 'revoke') {
      if (!isManager) { await audit('revoke', String(body.target || ''), false, 'not manager', '', who.agent); return json({ ok: false, error: 'managers only' }, 403); }
      const target = String(body.target || '').trim();
      if (!target) return json({ ok: false, error: 'target is required' }, 400);
      const rows = await db.VaultAgent.list({}) as any[];
      const row = rows.find((r: any) => r.agent === target);
      if (!row) return json({ ok: false, error: 'agent not found' }, 404);
      await db.VaultAgent.update(row.id, { status: 'revoked' });
      await audit('revoke', target, true, 'token revoked', '', who.agent);
      return json({ ok: true, agent: target, revoked: true });
    }

    // delete_secret: השבתת סוד (סימון revoked, לא מחיקה קשיחה)
    if (action === 'delete_secret') {
      if (!isManager) { await audit('delete_secret', String(body.key || ''), false, 'not manager', '', who.agent); return json({ ok: false, error: 'managers only' }, 403); }
      const key = String(body.key || '').trim();
      const entries = await db.VaultEntry.list({}) as any[];
      const e = entries.find((x: any) => x.key === key);
      if (!e) return json({ ok: false, error: 'key not found' }, 404);
      await db.VaultEntry.update(e.id, { status: 'revoked' });
      await audit('delete_secret', key, true, 'secret disabled', '', who.agent);
      return json({ ok: true, key, disabled: true });
    }

    // audit: צפייה בביקורת
    if (action === 'audit') {
      if (!isManager) { await audit('audit', '', false, 'not manager', '', who.agent); return json({ ok: false, error: 'managers only' }, 403); }
      const logs = await db.VaultAccessLog.list({}) as any[];
      const recent = (logs as any[]).sort((a: any, b: any) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()).slice(0, 100);
      await audit('audit', '', true, '', '', who.agent);
      return json({ ok: true, log: recent.map((l: any) => ({ agent: l.agent, op: l.op, key: l.key, granted: l.granted, at: l.created_date, note: l.note })) });
    }

    return json({ ok: false, error: 'unknown action. v2.0.4: put | get | claim | claim_issue | revoke | delete_secret | audit | GET=list' }, 400);
  } catch (e: any) {
    return json({ ok: false, error: (e?.message || String(e)) }, 500);
  }
});