const WORKER_BASE = process.env.SVAROG_WORKER_BASE || 'https://svarog-api.ranigfx.workers.dev';
const ALLOWED_ORIGINS = [
  'https://ci3t.github.io',
  'http://localhost:5173',
];

const CHECKS = [
  { name: 'health', path: '/health', origin: ALLOWED_ORIGINS[0], expectOk: true },
  { name: 'banners hsr github origin', path: '/api/banners?game=hsr', origin: ALLOWED_ORIGINS[0], expectOk: true },
  { name: 'banners hsr local origin', path: '/api/banners?game=hsr', origin: ALLOWED_ORIGINS[1], expectOk: true },
  { name: 'hsr stats', path: '/api/hsr/stats?id=2119', origin: ALLOWED_ORIGINS[0], expectOk: true },
  { name: 'patch timers', path: '/api/patch-timers?game=hsr', origin: ALLOWED_ORIGINS[0], expectOk: true },
  { name: 'quota guard no origin', path: '/api/banners?game=hsr', origin: '', expectStatus: 403 },
];

function compact(value, max = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function check({ name, path, origin, expectOk, expectStatus }) {
  const url = `${WORKER_BASE}${path}`;
  const headers = origin ? { Origin: origin } : {};
  const started = Date.now();
  const response = await fetch(url, { headers });
  const elapsed = Date.now() - started;
  const body = await response.text();
  const statusMatches = expectStatus ? response.status === expectStatus : true;
  const okMatches = expectOk ? response.ok : true;
  const passed = statusMatches && okMatches;

  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status} in ${elapsed}ms`);
  if (!passed) {
    console.log(`  URL: ${url}`);
    console.log(`  Origin: ${origin || '(none)'}`);
    console.log(`  Body: ${compact(body)}`);
  }

  return passed;
}

let passed = 0;
for (const item of CHECKS) {
  try {
    if (await check(item)) passed += 1;
  } catch (error) {
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

const total = CHECKS.length;
if (passed !== total) {
  console.log(`\n${passed}/${total} checks passed.`);
  process.exit(1);
}

console.log(`\n${passed}/${total} checks passed. Worker API looks reachable.`);
