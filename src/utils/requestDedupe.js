const pendingJsonRequests = new Map();

export async function fetchJsonWithDedupe(key, input, init = {}) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) {
    const response = await fetch(input, init);
    const data = await readResponsePayload(response);
    return { response, data };
  }

  const pending = pendingJsonRequests.get(normalizedKey);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(input, init);
    const data = await readResponsePayload(response);
    return { response, data };
  })();

  pendingJsonRequests.set(normalizedKey, request);

  try {
    return await request;
  } finally {
    pendingJsonRequests.delete(normalizedKey);
  }
}

async function readResponsePayload(response) {
  const raw = await response.text().catch(() => '');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}
