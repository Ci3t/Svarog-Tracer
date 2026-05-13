/**
 * Cloudflare Worker Usage Monitor
 * Runs via GitHub Action every 15 minutes.
 *
 * Thresholds:
 *   80,000 requests/day: log warning
 *   90,000 requests/day: switch api-routing.json to Vercel until next UTC reset + 5 min
 *   95,000 requests/day: urgent mode; force Vercel
 *
 * Requires GitHub Secrets:
 *   CLOUDFLARE_API_TOKEN   (Account Analytics Read permission)
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_WORKER_NAME (default: svarog-api)
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTING_PATH = join(__dirname, '..', 'public', 'api-routing.json');

const WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME || 'svarog-api';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

const SOFT_LIMIT = 90000;
const HARD_LIMIT = 95000;
const WARNING_LIMIT = 80000;

function getUtcDateString(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function getNextUtcReset() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5, 0));
  return next.toISOString();
}

function loadRouting() {
  try {
    return JSON.parse(readFileSync(ROUTING_PATH, 'utf-8'));
  } catch {
    return {
      mode: 'cloudflare',
      cloudflareBase: 'https://svarog-api.ranigfx.workers.dev',
      fallbackBase: 'https://svarog-tracer.vercel.app',
      cloudflareDisabledUntilUtc: null,
      reason: '',
      updatedAtUtc: new Date().toISOString(),
    };
  }
}

function saveRouting(data) {
  writeFileSync(ROUTING_PATH, JSON.stringify(data, null, 2) + '\n');
}

async function fetchWorkerRequestsToday() {
  if (!API_TOKEN || !ACCOUNT_ID) {
    console.warn('[Monitor] Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID; skipping API query.');
    return null;
  }

  const today = getUtcDateString();
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${ACCOUNT_ID}" }) {
          workersInvocationsAdaptive(
            limit: 1
            filter: {
              datetime_geq: "${today}T00:00:00Z"
              scriptName: "${WORKER_NAME}"
            }
          ) {
            sum {
              requests
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.error('[Monitor] Cloudflare API error:', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const data = json?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum?.requests;
    return typeof data === 'number' ? data : null;
  } catch (err) {
    console.error('[Monitor] Fetch error:', err.message);
    return null;
  }
}

async function main() {
  const requests = await fetchWorkerRequestsToday();
  const routing = loadRouting();
  const nowIso = new Date().toISOString();

  // Determine desired mode
  let desiredMode = routing.mode;
  let desiredDisabledUntil = routing.cloudflareDisabledUntilUtc;
  let reason = routing.reason;

  if (requests !== null) {
    console.log(`[Monitor] Worker requests today: ${requests}`);

    if (requests >= HARD_LIMIT) {
      console.warn(`[Monitor] HARD LIMIT REACHED (${requests} >= ${HARD_LIMIT}). Forcing Vercel mode.`);
      desiredMode = 'vercel';
      desiredDisabledUntil = getNextUtcReset();
      reason = `Cloudflare Worker daily usage reached ${requests} (hard limit ${HARD_LIMIT})`;
    } else if (requests >= SOFT_LIMIT) {
      console.warn(`[Monitor] SOFT LIMIT REACHED (${requests} >= ${SOFT_LIMIT}). Switching to Vercel mode.`);
      desiredMode = 'vercel';
      desiredDisabledUntil = getNextUtcReset();
      reason = `Cloudflare Worker daily usage reached ${requests} (soft limit ${SOFT_LIMIT})`;
    } else if (requests >= WARNING_LIMIT) {
      console.warn(`[Monitor] WARNING LIMIT (${requests} >= ${WARNING_LIMIT}). Monitor closely.`);
    }
  }

  // If currently disabled, check if we can re-enable
  if (routing.cloudflareDisabledUntilUtc) {
    const disabledUntil = new Date(routing.cloudflareDisabledUntilUtc);
    if (!isNaN(disabledUntil.getTime()) && disabledUntil <= new Date()) {
      console.log('[Monitor] Disable period expired. Restoring Cloudflare mode.');
      desiredMode = 'cloudflare';
      desiredDisabledUntil = null;
      reason = 'Cloudflare Worker quota reset; restored after UTC midnight + 5 min';
    }
  }

  // Only write if changed
  const changed =
    routing.mode !== desiredMode ||
    routing.cloudflareDisabledUntilUtc !== desiredDisabledUntil ||
    routing.reason !== reason;

  if (changed) {
    const updated = {
      ...routing,
      mode: desiredMode,
      cloudflareDisabledUntilUtc: desiredDisabledUntil,
      reason,
      updatedAtUtc: nowIso,
    };
    saveRouting(updated);
    console.log('[Monitor] Updated api-routing.json:', updated);
  } else {
    console.log('[Monitor] No change needed. Current mode:', desiredMode);
  }
}

main().catch((err) => {
  console.error('[Monitor] Unhandled error:', err);
  process.exit(1);
});
