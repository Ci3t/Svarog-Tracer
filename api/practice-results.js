import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAdminRequest,
} from './_services/zone/shared.js';

const env = globalThis.process?.env || {};
const PRACTICE_RESULTS_TABLE = env.SUPABASE_PRACTICE_RESULTS_TABLE || 'practice_results';

function isMissingTableError(error) {
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('42p01') || (raw.includes('relation') && raw.includes('does not exist'));
}

function isUniqueViolationError(error) {
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return Number(error?.status) === 409 || raw.includes('23505') || raw.includes('duplicate') || raw.includes('unique');
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const auth = await requireAuthenticatedUser(req);
    const user = auth.user;
    const body = readBody(req);

    const mode = String(body?.mode || '').trim().toLowerCase();
    const sessionKey = String(body?.sessionKey || '').trim();
    if (!mode || !sessionKey) {
      throw new HttpError(400, 'Mode and session key are required.');
    }

    const payload = {
      user_id: user.id,
      mode: mode.slice(0, 48),
      session_key: sessionKey.slice(0, 160),
      score: Number.isFinite(Number(body?.score)) ? Number(body.score) : 0,
      success: Boolean(body?.success),
      source_mode: String(body?.sourceMode || '').trim().slice(0, 48) || null,
      rows_count: Math.max(0, Number(body?.rowsCount || 0) || 0),
      detail: body?.detail && typeof body.detail === 'object' ? body.detail : {},
    };

    try {
      const inserted = await supabaseAdminRequest(PRACTICE_RESULTS_TABLE, {
        method: 'POST',
        body: payload,
      });
      const row = Array.isArray(inserted) ? inserted[0] || null : inserted || null;
      return res.status(200).json({ success: true, row, duplicate: false });
    } catch (error) {
      if (isUniqueViolationError(error)) {
        return res.status(200).json({ success: true, duplicate: true });
      }
      if (isMissingTableError(error)) {
        throw new HttpError(503, 'Practice results table is not ready yet.');
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(res, error);
  }
}
