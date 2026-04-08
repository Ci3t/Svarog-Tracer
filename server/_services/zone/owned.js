import {
  handleApiError,
  readOwnedCharacterIds,
  readRequestBody,
  requireAuthenticatedUser,
  upsertOwnedCharacterIds,
} from './shared.js';

export async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);

    if (req.method === 'GET') {
      const ownedCharIds = await readOwnedCharacterIds(user.id);
      return res.status(200).json({
        success: true,
        user_id: user.id,
        owned_char_ids: ownedCharIds,
      });
    }

    const body = readRequestBody(req);
    const ownedCharIds = Array.isArray(body.owned_char_ids) ? body.owned_char_ids : [];
    const updated = await upsertOwnedCharacterIds(user.id, ownedCharIds);

    return res.status(200).json({
      success: true,
      ...updated,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
