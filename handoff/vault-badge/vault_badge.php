<?php
/**
 * SHIMI VAULT — תג זהות (badge) בגישת Ed25519
 * גרסה: 2.1-badge (02/11/2026, שימי פיתוח, הוראת סאן: "תעודת זהות כמו תג בכניסה לכספת")
 *
 * ⚠ קובץ זה אינו מחליף את vault.php הקיים — הוא שכבת תג להוספה.
 * שילוב: ב-vault.php, אחרי בדיקת הטוקן הקיים (additive — הטוקנים ממשיכים לעבוד),
 * הוסף require_once של הקובץ הזה וקרא ל-vault_badge_authenticate($body) לפני ה-401.
 *
 * חוזה:
 *  - רישום: POST {action:"badge_register", agent, public_key, badge_ts, badge_nonce, badge_sig}
 *            חתימה על "BADGE_REGISTER|agent|public_key" (base64url, Ed25519).
 *  - זיהוי: כל בקשה עם badge_ts, badge_nonce, badge_sig — חתימה על "VAULT|agent|ts|nonce".
 *  - חלון זמן: ±300 שניות. nonce חד-פעמי ל-10 דקות (קובץ nonces).
 *  - דרגות לפי אמון: <20 basic, 20-49 member, >=50 full.
 *  - אין סיסמאות, אין טוקנים מתחלפים. המפתח הציבורי נשמר; הפרטי לא עוזב את הסוכן.
 */

if (!function_exists('vault_b64u_decode')) {
function vault_b64u_decode(string $v): string {
    $pad = strtr($v, '-_', '+/');
    $pad .= str_repeat('=', (4 - strlen($pad) % 4) % 4);
    return base64_decode($pad, true) ?: '';
}

function vault_badge_tier(float $trust): string {
    return $trust >= 50 ? 'full' : ($trust >= 20 ? 'member' : 'basic');
}

/** אימות חתימה — sodium (PHP 7.2+) */
function vault_badge_verify(string $pubB64u, string $message, string $sigB64u): bool {
    $pub = vault_b64u_decode($pubB64u);
    $sig = vault_b64u_decode($sigB64u);
    if (strlen($pub) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) return false;
    if (strlen($sig) !== SODIUM_CRYPTO_SIGN_BYTES) return false;
    return sodium_crypto_sign_verify_detached($sig, $message, $pub);
}

/** אחסון תגים — קובץ JSON לצד הכספת. להחליף בטבלה כשעוברים ל-DB. */
function vault_badges_path(): string {
    return __DIR__ . '/.badges.json';
}
function vault_badges_load(): array {
    $p = vault_badges_path();
    if (!is_file($p)) return [];
    $raw = @file_get_contents($p);
    $j = json_decode((string)$raw, true);
    return is_array($j) ? $j : [];
}
function vault_badges_save(array $rows): bool {
    $p = vault_badges_path();
    $tmp = $p . '.tmp';
    $ok = @file_put_contents($tmp, json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) !== false;
    if ($ok) @rename($tmp, $p);
    return $ok;
}

/** הגנת replay: nonce חד-פעמי בחלון 10 דקות */
function vault_nonce_ok(string $agent, string $nonce): bool {
    $p = __DIR__ . '/.nonces.json';
    $now = time();
    $seen = [];
    if (is_file($p)) {
        $j = json_decode((string)@file_get_contents($p), true);
        if (is_array($j)) $seen = $j;
    }
    foreach ($seen as $k => $t) { if (!is_int($t) || $now - $t > 600) unset($seen[$k]); }
    $key = $agent . '|' . $nonce;
    if (isset($seen[$key])) return false;
    $seen[$key] = $now;
    @file_put_contents($p, json_encode($seen), LOCK_EX);
    return true;
}

/**
 * מחזיר מערך זהות או null:
 *   ['agent' => string, 'tier' => 'basic'|'member'|'full', 'trust' => float]
 */
function vault_badge_authenticate(array $body, ?callable $trustLookup = null): ?array {
    $agent = trim((string)($body['agent'] ?? ''));
    $ts    = (string)($body['badge_ts'] ?? '');
    $nonce = (string)($body['badge_nonce'] ?? '');
    $sig   = (string)($body['badge_sig'] ?? '');
    if ($agent === '' || $ts === '' || $nonce === '' || $sig === '') return null;

    // חלון זמן (ts במילישניות או שניות)
    $tsNum = (float)$ts;
    if ($tsNum <= 0) return null;
    $tsSec = $tsNum > 100000000000 ? $tsNum / 1000 : $tsNum;
    if (abs(time() - $tsSec) > 300) return null;

    $rows = vault_badges_load();
    $badge = null;
    foreach ($rows as $r) {
        if (($r['agent'] ?? '') === $agent && ($r['status'] ?? '') === 'active') { $badge = $r; break; }
    }
    if (!$badge) return null;

    $msg = 'VAULT|' . $agent . '|' . $ts . '|' . $nonce;
    if (!vault_badge_verify((string)$badge['public_key'], $msg, $sig)) return null;
    if (!vault_nonce_ok($agent, $nonce)) return null;

    $trust = isset($badge['trust']) ? (float)$badge['trust'] : 0.0;
    if ($trustLookup !== null) {
        $t = $trustLookup($agent);
        if ($t !== null) { $trust = (float)$t; }
    }
    foreach ($rows as &$r) {
        if (($r['agent'] ?? '') === $agent && ($r['status'] ?? '') === 'active') { $r['last_seen'] = date('c'); $r['trust'] = $trust; }
    }
    unset($r);
    vault_badges_save($rows);

    return ['agent' => $agent, 'tier' => vault_badge_tier($trust), 'trust' => $trust];
}

/** רישום עצמי — מחזיר ['ok'=>bool, ...] */
function vault_badge_register(array $body, ?callable $trustLookup = null): array {
    $agent = trim((string)($body['agent'] ?? ''));
    $pub   = trim((string)($body['public_key'] ?? ''));
    $ts    = (string)($body['badge_ts'] ?? '');
    $nonce = (string)($body['badge_nonce'] ?? '');
    $sig   = (string)($body['badge_sig'] ?? '');
    if ($agent === '' || $pub === '' || $ts === '' || $nonce === '' || $sig === '') {
        return ['ok' => false, 'error' => 'agent, public_key, badge_ts, badge_nonce, badge_sig are required'];
    }
    $msg = 'BADGE_REGISTER|' . $agent . '|' . $pub;
    if (!vault_badge_verify($pub, $msg, $sig)) {
        return ['ok' => false, 'error' => 'signature does not match public_key'];
    }
    $trust = 0.0;
    if ($trustLookup !== null) { $t = $trustLookup($agent); if ($t !== null) $trust = (float)$t; }
    $rows = vault_badges_load();
    $found = false;
    foreach ($rows as &$r) {
        if (($r['agent'] ?? '') === $agent) {
            $r['public_key'] = $pub; $r['status'] = 'active'; $r['trust'] = $trust;
            $r['tier'] = vault_badge_tier($trust); $r['last_seen'] = date('c');
            $found = true; break;
        }
    }
    unset($r);
    if (!$found) {
        $rows[] = ['agent' => $agent, 'public_key' => $pub, 'status' => 'active', 'trust' => $trust,
                   'tier' => vault_badge_tier($trust), 'registered' => date('c'), 'last_seen' => date('c')];
    }
    if (!vault_badges_save($rows)) return ['ok' => false, 'error' => 'cannot persist badge (check directory permissions)'];
    return ['ok' => true, 'agent' => $agent, 'tier' => vault_badge_tier($trust), 'trust' => $trust,
            'note' => 'התג נרשם. מעכשיו מזדהים בחתימה: VAULT|agent|ts|nonce. אין סיסמה ואין טוקן.'];
}
}
