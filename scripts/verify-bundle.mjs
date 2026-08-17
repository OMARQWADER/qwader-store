// Quick verification of the built Vercel bundle against Neon.
// Usage: node scripts/verify-bundle.mjs
import { spawn } from 'node:child_process';

const base = process.env['NEON_DATABASE_URL'] || process.env['DATABASE_URL'];
if (!base || !base.includes('neon')) {
  console.error('MISSING NEON DATABASE_URL');
  process.exit(1);
}

// The vercel handler is an ESM bundle exposing a default export handler.
const app = spawn('node', ['--input-type=module'], { env: { ...process.env, NEON_DATABASE_URL: base, DATABASE_URL: base } });

const script = `
import handler from '${process.cwd().replace(/'/g, "\\'")}/api/vercel-handler.js';
process.env.NEON_DATABASE_URL = '${base}';
process.env.DATABASE_URL = '${base}';
import http from 'node:http';
async function call(method, path, body) {
  const reqUrl = new URL('http://127.0.0.1');
  reqUrl.pathname = path;
  const req = {
    method,
    url: reqUrl.pathname,
    headers: { host: '127.0.0.1', 'content-type': 'application/json' },
  };
  const chunks = [];
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    removeHeader(k) { delete this.headers[k.toLowerCase()]; },
    writeHead(code, h) { this.statusCode = code; if (h) Object.entries(h).forEach(([k, v]) => this.setHeader(k, v)); },
    write(chunk) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); },
    end(body) {
      if (body !== undefined) this.write(body);
      this._body = Buffer.concat(chunks).toString();
      this._done = true;
    },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.setHeader('content-type', 'application/json'); this.end(JSON.stringify(data)); return this; },
    send(body) { this.end(body); return this; },
    redirect() { this.statusCode = 302; this.end(); return this; },
  };
  req.on = (ev, fn) => { if (ev === 'end') fn(); return req; };
  req.addListener = req.on;
  await handler(req, res);
  return { status: res.statusCode, body: res._body, headers: res.headers };
}
(async () => {
  const results = [];
  const checks = [
    ['GET', '/api/content', null],
    ['GET', '/api/shipping', null],
    ['POST', '/api/auth/login', { identifier: 'qwader-nonexistent-check', password: 'x' }],
    ['GET', '/', null],
  ];
  for (const [m, p, b] of checks) {
    try {
      const r = await call(m, p, b);
      results.push(m + ' ' + p + ' => ' + r.status + (r.status >= 200 && r.status < 500 ? ' OK' : ' FAIL'));
    } catch (e) {
      results.push(m + ' ' + p + ' => ERROR: ' + (e.message || e).slice(0, 100));
    }
  }
  console.log(results.join('\\n'));
  process.exit(results.every(x => !x.includes('ERROR') && x.endsWith('OK')) ? 0 : 1);
})();
`;

app.stdin.write(script);
app.stdin.end();
app.stdout.on('data', (d) => process.stdout.write(d));
app.stderr.on('data', (d) => process.stderr.write(d));
app.on('exit', (code) => {
  console.log('EXIT', code);
  process.exit(code ?? 1);
});
