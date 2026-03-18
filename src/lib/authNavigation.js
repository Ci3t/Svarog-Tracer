const NEXT_PATH_KEY = 'svarog_zone_auth_next_path_v1';

export function storeAuthNextPath(nextPath) {
  const fallback = '/zone-tracker';

  try {
    const candidate = typeof nextPath === 'string' ? nextPath : fallback;
    const safePath = candidate.startsWith('/') ? candidate : fallback;
    sessionStorage.setItem(NEXT_PATH_KEY, safePath);
  } catch {
    // Ignore storage failures.
  }
}

export function readAuthNextPath() {
  const fallback = '/zone-tracker';
  try {
    const nextPath = sessionStorage.getItem(NEXT_PATH_KEY) || fallback;
    sessionStorage.removeItem(NEXT_PATH_KEY);
    if (!nextPath.startsWith('/')) return fallback;
    return nextPath;
  } catch {
    return fallback;
  }
}
