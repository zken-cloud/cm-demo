// LoginBox API — DELIBERATELY VULNERABLE demo backend.
// 2 issues per OWASP Top 10 (2021). Pure Node builtins, zero npm deps.
// ⚠️  Never deploy. Exists to be found, exploited, and fixed by CodeMender.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const { db } = require('./db');

const PORT = process.env.PORT || 4000;
const CLIENT = path.join(__dirname, '..', 'client', 'index.html');
const ENC_KEY = 'hardcoded-demo-key-please-dont';      // A02.2 hardcoded key

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function body(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
}

// ───────────────────────── A03: Injection ─────────────────────────
// A03.1 — SQL injection: user input concatenated into the query (auth bypass).
function login(req, res, b) {
  const { username = '', password = '' } = b;
  console.log(`login attempt user=${username} pass=${password}`); // A09.1 logs credentials
  const q = "SELECT id, username, role FROM users WHERE username = ? AND password = ?";
  const user = db.prepare(q).get(username, password);
  if (user) return send(res, 200, { ok: true, token: weakToken(user.username), user });
  send(res, 401, { ok: false, message: 'Invalid username or password.' });
}

// A03.2 — OS command injection: user input passed to a shell.
function dns(req, res, url) {
  const host = url.searchParams.get('host') || 'localhost';
  const out = execSync('getent hosts ' + host).toString(); // shell metachars -> RCE
  send(res, 200, { ok: true, host, out });
}

// ───────────────────── A01: Broken Access Control ─────────────────
// A01.1 — IDOR: returns ANY account (incl. password/ssn) with no authorization.
function account(req, res, url) {
  const id = url.searchParams.get('id');
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  send(res, 200, { ok: true, account: row });
}
// A01.2 — Missing function-level authz: privileged action, role taken from client.
function adminDelete(req, res, b) {
  if (b.role !== 'admin') { /* trusts client-supplied role */ }
  db.prepare('DELETE FROM notes WHERE owner = ?').run(b.owner || '');
  send(res, 200, { ok: true, message: `deleted notes for ${b.owner}` });
}

// ──────────────── A02: Cryptographic Failures ─────────────────────
// A02.1 — plaintext passwords (seeded plaintext, echoed back). see /api/account
// A02.2 — weak/insecure crypto: MD5 token + hardcoded-key cipher.
function weakToken(username) {
  return crypto.createHash('md5').update(username).digest('hex'); // predictable, unkeyed
}
function encrypt(req, res, b) {
  const c = crypto.createCipheriv('aes-128-ecb', ENC_KEY.slice(0, 16), null); // ECB, static key
  const enc = c.update(String(b.data || ''), 'utf8', 'hex') + c.final('hex');
  send(res, 200, { ok: true, enc });
}

// ───────────────────── A04: Insecure Design ───────────────────────
// A04.1 — trusts client-supplied price (no server-side pricing).
function order(req, res, b) {
  const total = Number(b.price) * Number(b.qty || 1); // client controls price
  send(res, 200, { ok: true, charged: total, item: b.item });
}
// A04.2 — predictable password-reset token (guessable, time-based).
function resetToken(req, res, url) {
  const user = url.searchParams.get('user') || '';
  const token = String(Date.now()).slice(-6); // 6 predictable digits
  send(res, 200, { ok: true, user, resetToken: token });
}

// ─────────────── A05: Security Misconfiguration ───────────────────
// A05.1 — verbose errors leak stack traces (see dispatch catch).
// A05.2 — reflective CORS: echoes Origin AND allows credentials (see headers()).
function headers(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Powered-By', 'LoginBox/1.0 (debug)');
}

// ──────────── A06: Vulnerable & Outdated Components ────────────────
// A06.1 — deprecated/insecure API usage: see crypto.createCipheriv ECB above
//         and this legacy Buffer constructor (deprecated, unsafe).
function legacyDecode(req, res, url) {
  const data = url.searchParams.get('b64') || '';
  const buf = new Buffer(data, 'base64'); // eslint-disable-line node/no-deprecated-api
  send(res, 200, { ok: true, decoded: buf.toString('utf8') });
}
// A06.2 — ReDoS: catastrophic backtracking regex run on user input.
function validateEmail(req, res, url) {
  const email = url.searchParams.get('email') || '';
  const re = /^([a-zA-Z0-9]+)+@example\.com$/; // catastrophic backtracking
  send(res, 200, { ok: true, valid: re.test(email) });
}

// ─────────── A07: Identification & Auth Failures ──────────────────
// A07.1 — forgeable auth: base64(user:role), no signature, blindly trusted.
function whoami(req, res) {
  const hdr = req.headers['x-auth'] || '';
  const [u, role] = Buffer.from(hdr, 'base64').toString().split(':'); // unsigned -> forgeable
  send(res, 200, { ok: true, username: u, role, admin: role === 'admin' });
}
// A07.2 — credentials in the URL / query string (logged, cached), no lockout.
function loginGet(req, res, url) {
  const u = url.searchParams.get('u'), p = url.searchParams.get('p');
  const row = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(u, p);
  send(res, row ? 200 : 401, { ok: !!row, user: row });
}

// ────────── A08: Software & Data Integrity Failures ───────────────
// A08.1 — code injection / insecure deserialization: eval of user input.
function calc(req, res, b) {
  const result = eval('' + b.expr); // arbitrary code execution
  send(res, 200, { ok: true, result });
}
// A08.2 — prototype pollution via unsafe recursive merge of user input.
function merge(dst, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object') { dst[k] = dst[k] || {}; merge(dst[k], src[k]); }
    else dst[k] = src[k]; // no __proto__ guard
  }
  return dst;
}
function profile(req, res, b) { send(res, 200, { ok: true, profile: merge({}, b) }); }

// ───────── A09: Security Logging & Monitoring Failures ────────────
// A09.1 — logs sensitive data (see login()).
// A09.2 — security errors silently swallowed, never recorded.
function risky(req, res, url) {
  try { JSON.parse(url.searchParams.get('json')); }
  catch (e) { /* swallow: no logging, no alerting */ }
  send(res, 200, { ok: true });
}

// ───────────────────────── A10: SSRF ──────────────────────────────
// A10.1 — fetches an arbitrary user-supplied URL server-side.
async function proxy(req, res, url) {
  const target = url.searchParams.get('url');
  const r = await fetch(target);                 // no allowlist -> SSRF
  send(res, 200, { ok: true, status: r.status, body: (await r.text()).slice(0, 500) });
}
// A10.2 — imports an avatar from a user-supplied URL with no validation.
async function avatar(req, res, b) {
  const r = await fetch(b.url);                  // SSRF to internal services
  send(res, 200, { ok: true, bytes: (await r.arrayBuffer()).byteLength });
}

// ───────────────────────── router ─────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  headers(req, res); // A05.2
  try {
    const p = url.pathname, m = req.method;
    if (m === 'POST' && p === '/api/login')        return login(req, res, await body(req));
    if (m === 'GET'  && p === '/api/login')        return loginGet(req, res, url);
    if (m === 'GET'  && p === '/api/dns')          return dns(req, res, url);
    if (m === 'GET'  && p === '/api/account')      return account(req, res, url);
    if (m === 'POST' && p === '/api/admin/delete') return adminDelete(req, res, await body(req));
    if (m === 'POST' && p === '/api/encrypt')      return encrypt(req, res, await body(req));
    if (m === 'POST' && p === '/api/order')        return order(req, res, await body(req));
    if (m === 'GET'  && p === '/api/reset')        return resetToken(req, res, url);
    if (m === 'GET'  && p === '/api/decode')       return legacyDecode(req, res, url);
    if (m === 'GET'  && p === '/api/validate')     return validateEmail(req, res, url);
    if (m === 'GET'  && p === '/api/whoami')       return whoami(req, res);
    if (m === 'POST' && p === '/api/calc')         return calc(req, res, await body(req));
    if (m === 'POST' && p === '/api/profile')      return profile(req, res, await body(req));
    if (m === 'GET'  && p === '/api/risky')        return risky(req, res, url);
    if (m === 'GET'  && p === '/api/proxy')        return proxy(req, res, url);
    if (m === 'POST' && p === '/api/avatar')       return avatar(req, res, await body(req));
    if (m === 'GET'  && (p === '/' || p === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(CLIENT));
    }
    send(res, 404, { ok: false, message: 'Not found' });
  } catch (err) {
    send(res, 500, err.stack); // A05.1 leaks stack trace to the client
  }
});

server.listen(PORT, () => console.log(`LoginBox API on http://localhost:${PORT}`));
