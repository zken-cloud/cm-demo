# LoginBox — intentionally vulnerable React + SQLite demo

A deliberately insecure mini app for demoing **CodeMender** (`cm find` → `cm find verify` →
`cm fix`). It packs **two vulnerabilities for each OWASP Top 10 (2021) category** into a
tiny, zero-dependency backend.

> ⚠️ **Insecure on purpose.** Never deploy this. It exists to be found, exploited, and fixed.

## Stack (zero npm dependencies)

```
vuln-react-sqlite/
├── server/
│   ├── api.js        ← all vulnerable endpoints (the cm scan target)
│   └── db.js         ← in-memory SQLite, seeded with admin/alice/bob
├── client/index.html ← React 18 login UI via CDN (no build step)
├── rollback.sh       ← restore the vulnerable baseline after cm fix
└── package.json      ← metadata only, no dependencies
```

- **Backend:** pure `node:http` + built-in `node:sqlite` + `node:crypto` /
  `node:child_process` (Node ≥ 22.5). No `npm install`.
- **Frontend:** React via unpkg CDN. Note: cm only scans `.js`/`.ts`, so the React
  `.html`/JSX UI is ignored and every tracked vulnerability lives in `server/*.js`.

## Run it

```bash
node server/api.js     # http://localhost:4000   (or: npm start)
```

## The 20 vulnerabilities (2 per OWASP Top 10 2021)

| OWASP | # | Where | Issue | Quick exploit |
|---|---|---|---|---|
| **A01** Broken Access Control | 1 | `GET /api/account?id=` | IDOR — any user's row incl. password/SSN | `?id=1` |
| | 2 | `POST /api/admin/delete` | missing function-level authz (role from client) | `{"owner":"alice"}` |
| **A02** Cryptographic Failures | 1 | `db.js` / `/api/account` | plaintext passwords stored & returned | — |
| | 2 | `weakToken` / `/api/encrypt` | MD5 token + AES-ECB with hardcoded key | — |
| **A03** Injection | 1 | `POST /api/login` | SQL injection → auth bypass | `{"username":"admin' --","password":"x"}` |
| | 2 | `GET /api/dns?host=` | OS command injection | `?host=localhost;id` |
| **A04** Insecure Design | 1 | `POST /api/order` | trusts client-supplied price | `{"item":"car","price":1}` |
| | 2 | `GET /api/reset?user=` | predictable 6-digit reset token | — |
| **A05** Security Misconfiguration | 1 | error handler | stack traces leaked to client | trigger any 500 |
| | 2 | response headers | reflective CORS + credentials | `Origin:` echoed |
| **A06** Vulnerable/Outdated Components | 1 | `GET /api/decode?b64=` | deprecated/unsafe `new Buffer()` + AES-ECB | — |
| | 2 | `GET /api/validate?email=` | ReDoS (catastrophic regex) | `?email=aaaaaaaaaaaaaaaaaaaaaaaa!` |
| **A07** Identification & Auth Failures | 1 | `GET /api/whoami` | forgeable unsigned `x-auth: base64(user:role)` | `x-auth: $(echo -n bob:admin|base64)` |
| | 2 | `GET /api/login?u=&p=` | credentials in URL, no lockout | — |
| **A08** Software & Data Integrity | 1 | `POST /api/calc` | `eval()` of user input → RCE | `{"expr":"process.env"}` |
| | 2 | `POST /api/profile` | prototype pollution via unsafe merge | `{"__proto__":{"x":1}}` |
| **A09** Logging & Monitoring Failures | 1 | `login()` | logs credentials in cleartext | — |
| | 2 | `GET /api/risky?json=` | errors silently swallowed, never recorded | — |
| **A10** SSRF | 1 | `GET /api/proxy?url=` | fetches arbitrary server-side URL | `?url=http://169.254.169.254/` |
| | 2 | `POST /api/avatar` | fetches user-supplied URL, no allowlist | `{"url":"http://localhost:4000/api/account?id=1"}` |

## Demo with CodeMender

```bash
node server/api.js                 # start the app (verify's exploit needs it live)

# scan the DIRECTORY, with a context hint (see notes) -> reports ~16 findings
cm find vuln-react-sqlite/server -c "security demo; review each endpoint for OWASP Top 10"
cm find verify <finding-id>        # build & run a PoC exploit -> VERIFIED
cm fix <finding-id>                # generate, validate & apply a patch
./vuln-react-sqlite/rollback.sh    # undo the fix, back to vulnerable baseline
```

**Two things make `find` reliable here:**

1. **Scan the directory, not a single file.** Pointing cm at `server/api.js` makes that file
   the only sandbox root, so the agent gets blocked exploring and may report nothing. Scan
   `server` (the directory).
2. **Pass a `-c` context hint.** The quick SCAN classifier is conservative — a bare
   `cm find server` may return *"No vulnerabilities found"*, while
   `cm find server -c "review each endpoint for OWASP Top 10"` reliably surfaces ~16 of the
   20 (measured: **107 s**, 3 CRITICAL / 7 HIGH / 4 MEDIUM / 2 LOW).

### Rolling back after a fix

The intended demo flow is: create a `cm-demo` branch, commit the `cm fix` result there,
push it, and open a PR. To tear that down and start over:

```bash
./rollback.sh            # or: ./rollback.sh <branch>
```

`rollback.sh` does exactly three things:
1. **Checks out `main`.**
2. **Deletes the `cm-demo` branch locally** (`git branch -D`).
3. **Deletes the `cm-demo` branch on GitHub** (`git push origin --delete`).

Both deletes are skipped gracefully if the branch isn't there, so the script is safe to
re-run.

### A note on runtime

Each vulnerability is tiny and self-contained to keep CodeMender fast, but only **`find`**
is sub-minute-ish. `verify` and `fix` are multi-step agent sessions (20–40+ tool calls,
each gated by a server long-poll) and take **several minutes per finding** regardless of how
small the code is — that cost is server-side reasoning, not codebase size. With 20 findings,
run `verify`/`fix` on the one or two you want to showcase (the SQL injection auth bypass is
the cleanest), not all of them.
