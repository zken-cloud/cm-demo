const http = require('node:http');
const { db } = require('./db');

const PORT = process.env.PORT || 4000;

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function body(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
}

function login(req, res, b) {
  const { username = '', password = '' } = b;
  const q = "SELECT id, username, role FROM users WHERE username = ? AND password = ?";
  const user = db.prepare(q).get(username, password);
  if (user) return send(res, 200, { ok: true, user });
  send(res, 401, { ok: false, message: 'Invalid username or password.' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    const p = url.pathname, m = req.method;
    if (m === 'POST' && p === '/api/login') return login(req, res, await body(req));
    send(res, 404, { ok: false, message: 'Not found' });
  } catch (err) {
    send(res, 500, err.stack);
  }
});

server.listen(PORT, () => console.log(`LoginBox API on http://localhost:${PORT}`));
