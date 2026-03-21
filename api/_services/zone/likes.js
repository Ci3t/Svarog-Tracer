import {
  HttpError,
  ZONE_LIKES_TABLE,
  buildTablePath,
  handleApiError,
  readRequestBody,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

function isMissingLikesTable(error) {
  const raw = typeof error?.details === 'string'
    ? error.details
    : `${error?.details?.message || ''} ${error?.details?.details || ''} ${error?.details?.hint || ''}`;
  const normalized = String(raw || '').toLowerCase();
  return normalized.includes('zone_likes') || normalized.includes('does not exist') || normalized.includes('42p01');
}

function normalizeEpochId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, 'epoch_id is required.');
  }
  return parsed;
}

function normalizeZoneKey(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new HttpError(400, 'xor_slot_key is required.');
  }
  return normalized;
}

export async function handler(req, res) {
  try {
    const { user } = await requireAuthenticatedUser(req);

    if (req.method === 'GET') {
      const epochId = normalizeEpochId(req.query?.epoch_id);
      try {
        const rows = await supabaseAdminRequest(
          buildTablePath(ZONE_LIKES_TABLE, {
            select: 'xor_slot_key,user_id',
            filters: {
              epoch_id: `eq.${epochId}`,
              limit: '5000',
            },
          })
        );

        const likeMap = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          const key = String(row?.xor_slot_key || '').trim();
          if (!key) continue;
          if (!likeMap[key]) {
            likeMap[key] = { like_count: 0, viewer_liked: false };
          }
          likeMap[key].like_count += 1;
          if (String(row?.user_id || '') === String(user.id || '')) {
            likeMap[key].viewer_liked = true;
          }
        }

        return res.status(200).json({ success: true, likes: likeMap });
      } catch (error) {
        if (isMissingLikesTable(error)) {
          return res.status(200).json({ success: true, likes: {}, warning: 'zone_likes_table_missing' });
        }
        throw error;
      }
    }

    if (req.method === 'POST') {
      const body = readRequestBody(req);
      const epochId = normalizeEpochId(body.epoch_id);
      const zoneKey = normalizeZoneKey(body.xor_slot_key);
      const liked = Boolean(body.liked);

      try {
        const existingRows = await supabaseAdminRequest(
          buildTablePath(ZONE_LIKES_TABLE, {
            select: 'id',
            filters: {
              epoch_id: `eq.${epochId}`,
              xor_slot_key: `eq.${zoneKey}`,
              user_id: `eq.${user.id}`,
              limit: '1',
            },
          })
        );

        const existingId = Array.isArray(existingRows) && existingRows[0]?.id ? existingRows[0].id : null;

        if (liked && !existingId) {
          await supabaseAdminRequest(ZONE_LIKES_TABLE, {
            method: 'POST',
            body: {
              epoch_id: epochId,
              xor_slot_key: zoneKey,
              user_id: user.id,
            },
          });
        } else if (!liked && existingId) {
          await supabaseAdminRequest(
            buildTablePath(ZONE_LIKES_TABLE, {
              select: false,
              filters: {
                id: `eq.${existingId}`,
              },
            }),
            {
              method: 'DELETE',
              prefer: 'return=minimal',
            }
          );
        }

        const allRows = await supabaseAdminRequest(
          buildTablePath(ZONE_LIKES_TABLE, {
            select: 'user_id',
            filters: {
              epoch_id: `eq.${epochId}`,
              xor_slot_key: `eq.${zoneKey}`,
              limit: '5000',
            },
          })
        );

        const likeCount = Array.isArray(allRows) ? allRows.length : 0;
        const viewerLiked = (Array.isArray(allRows) ? allRows : []).some((row) => String(row?.user_id || '') === String(user.id || ''));

        return res.status(200).json({
          success: true,
          xor_slot_key: zoneKey,
          epoch_id: epochId,
          like_count: likeCount,
          viewer_liked: viewerLiked,
        });
      } catch (error) {
        if (isMissingLikesTable(error)) {
          return res.status(200).json({
            success: true,
            xor_slot_key: zoneKey,
            epoch_id: epochId,
            like_count: 0,
            viewer_liked: false,
            warning: 'zone_likes_table_missing',
          });
        }
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
