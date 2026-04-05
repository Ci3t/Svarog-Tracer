import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
} from './_services/zone/shared.js';
import {
  getMarketplaceSnapshot,
  purchaseMarketplaceItem,
  updateMarketplaceEquip,
} from './_services/profile/marketplace.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await requireAuthenticatedUser(req);
    const user = auth.user;

    if (req.method === 'GET') {
      const snapshot = await getMarketplaceSnapshot(user);
      return res.status(200).json({
        success: true,
        ...snapshot,
      });
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const body = req.body && typeof req.body === 'object'
      ? req.body
      : typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : {};

    const action = String(body?.action || '').trim().toLowerCase();
    if (action === 'purchase') {
      const snapshot = await purchaseMarketplaceItem(user, body?.itemKey);
      return res.status(200).json({
        success: true,
        ...snapshot,
      });
    }

    if (action === 'equip' || action === 'clear') {
      const updatedUser = await updateMarketplaceEquip(user, {
        action,
        itemKey: body?.itemKey,
        slot: body?.slot,
      });
      const snapshot = await getMarketplaceSnapshot(updatedUser);
      return res.status(200).json({
        success: true,
        user: updatedUser,
        ...snapshot,
      });
    }

    throw new HttpError(400, 'Invalid marketplace action.');
  } catch (error) {
    return handleApiError(res, error);
  }
}
