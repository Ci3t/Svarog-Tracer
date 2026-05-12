import { getTursoClient, isTursoConfigured } from './kiyoClient.js';
import { shouldUseCloudinaryAssets } from '../../utils/cloudinaryPolicy.js';

const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

function buildCloudinaryUrl(publicId, options = {}) {
  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.quality) transforms.push(`q_${options.quality}`);
  if (options.format) transforms.push(`f_${options.format}`);

  const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}${publicId}`;
}

export async function handler(req, res) {
  const method = req.method;
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const subPath = slug ? slug.replace(/^assets\/?/, '').replace(/^\//, '') : '';

  if (!shouldUseCloudinaryAssets()) {
    return res.status(503).json({ error: 'Cloudinary assets disabled' });
  }

  // GET /api/hsr/assets — list all assets or query by folder
  if (method === 'GET' && !subPath) {
    const folder = req.query.folder || '';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = parseInt(req.query.offset || '0', 10);

    if (!isTursoConfigured()) {
      return res.status(503).json({ error: 'Turso not configured' });
    }

    const client = getTursoClient();

    try {
      let sql = 'SELECT asset_key, public_id, secure_url, folder, format, resource_type FROM cloudinary_assets';
      let args = [];

      if (folder) {
        sql += ' WHERE folder = ?';
        args.push(folder);
      }

      sql += ' LIMIT ? OFFSET ?';
      args.push(limit, offset);

      const result = await client.execute({ sql, args });

      return res.status(200).json({
        assets: result.rows,
        count: result.rows.length,
        folder: folder || null,
      });
    } catch (err) {
      console.error('[Assets] DB error:', err.message);
      return res.status(500).json({ error: 'Database error', message: err.message });
    }
  }

  // GET /api/hsr/assets/:assetKey — get specific asset URL with optional transforms
  if (method === 'GET' && subPath) {
    const assetKey = decodeURIComponent(subPath);
    const width = req.query.w || req.query.width;
    const height = req.query.h || req.query.height;
    const crop = req.query.c || req.query.crop;
    const quality = req.query.q || req.query.quality;
    const format = req.query.f || req.query.format;

    if (!isTursoConfigured()) {
      // Fallback: construct URL from asset key if we know the Cloudinary folder structure
      if (assetKey.startsWith('game/hsr/')) {
        const publicId = `svarog-tracer/${assetKey.replace(/\.[^.]+$/, '')}`;
        const url = buildCloudinaryUrl(publicId, { width, height, crop, quality, format });
        return res.status(200).json({ asset_key: assetKey, secure_url: url, fallback: true });
      }
      return res.status(503).json({ error: 'Turso not configured' });
    }

    const client = getTursoClient();

    try {
      const result = await client.execute({
        sql: 'SELECT asset_key, public_id, secure_url, folder, format, resource_type FROM cloudinary_assets WHERE asset_key = ?',
        args: [assetKey],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found', asset_key: assetKey });
      }

      const asset = result.rows[0];

      // Apply on-the-fly transforms if requested
      if (width || height || crop || quality || format) {
        const transformedUrl = buildCloudinaryUrl(asset.public_id, {
          width, height, crop, quality, format,
        });
        return res.status(200).json({ ...asset, secure_url: transformedUrl, transformed: true });
      }

      return res.status(200).json(asset);
    } catch (err) {
      console.error('[Assets] DB error:', err.message);
      return res.status(500).json({ error: 'Database error', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
