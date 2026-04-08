import staticGuides from '../src/data/guides.json' with { type: 'json' };
import {
  HttpError,
  buildTablePath,
  handleApiError,
  isZoneAdminUser,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from '../server/_services/zone/shared.js';

const GUIDES_TABLE = process.env.SUPABASE_GUIDES_TABLE || 'guides_library';
const GUIDES_DOC_ID = process.env.SUPABASE_GUIDES_DOC_ID || 'main';

function safeGuidesPayload(value) {
  const creators = Array.isArray(value?.creators) ? value.creators : [];
  return { creators };
}

async function getGuidesDocument() {
  const rows = await supabaseAdminRequest(
    buildTablePath(GUIDES_TABLE, {
      select: 'id,creators,updated_at,updated_by',
      filters: {
        id: `eq.${GUIDES_DOC_ID}`,
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function getStaticCreators() {
  return safeGuidesPayload(staticGuides).creators;
}

function shouldHydrateFromStatic(doc) {
  return !doc?.id || !Array.isArray(doc.creators) || doc.creators.length === 0;
}

async function upsertGuidesDocument(creators, updatedBy) {
  const payload = {
    id: GUIDES_DOC_ID,
    creators,
    updated_by: updatedBy || null,
    updated_at: new Date().toISOString(),
  };

  const existing = await getGuidesDocument().catch((error) => {
    throw error;
  });

  if (existing?.id) {
    await supabaseAdminRequest(`${GUIDES_TABLE}?id=eq.${encodeURIComponent(GUIDES_DOC_ID)}`, {
      method: 'PATCH',
      body: {
        creators: payload.creators,
        updated_by: payload.updated_by,
        updated_at: payload.updated_at,
      },
    });
  } else {
    await supabaseAdminRequest(GUIDES_TABLE, {
      method: 'POST',
      body: payload,
    });
  }

  return {
    id: GUIDES_DOC_ID,
    creators,
    updated_at: payload.updated_at,
    updated_by: payload.updated_by,
  };
}

function normalizeVideo(video) {
  if (!video || typeof video !== 'object') {
    throw new HttpError(400, 'Video payload is required.');
  }

  const id = String(video.id || '').trim();
  const title = String(video.title || '').trim();
  const description = String(video.description || '').trim();

  if (!id) throw new HttpError(400, 'Video ID is required.');
  if (!title) throw new HttpError(400, 'Video title is required.');
  if (!description) throw new HttpError(400, 'Video description is required.');

  return {
    id,
    title,
    description,
    featured: Boolean(video.featured),
  };
}

function normalizeCreatorId(value) {
  const creatorId = String(value || '').trim();
  if (!creatorId) throw new HttpError(400, 'creatorId is required.');
  return creatorId;
}

async function requireGuidesAdmin(req) {
  const { user } = await requireAuthenticatedUser(req);
  if (!isZoneAdminUser(user)) {
    throw new HttpError(403, 'Admin access required.');
  }
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      try {
        let doc = await getGuidesDocument();
        if (shouldHydrateFromStatic(doc)) {
          doc = await upsertGuidesDocument(getStaticCreators(), doc?.updated_by || null);
        }

        if (doc?.id) {
          return res.status(200).json({
            ...safeGuidesPayload({ creators: doc.creators }),
            source: 'supabase',
            updated_at: doc.updated_at || null,
            updated_by: doc.updated_by || null,
          });
        }
      } catch (error) {
        console.warn('[Guides API] Supabase fetch failed, using static fallback:', error?.message || error);
      }

      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        ...safeGuidesPayload(staticGuides),
        source: 'static',
        message: 'Guides are using the bundled fallback data until Supabase guides storage is available.',
      });
    }

    const adminUser = await requireGuidesAdmin(req);
    const fetchedDoc = await getGuidesDocument().catch(() => null);
    const existingDoc = shouldHydrateFromStatic(fetchedDoc) ? {
      id: GUIDES_DOC_ID,
      creators: getStaticCreators(),
    } : fetchedDoc;
    const creators = Array.isArray(existingDoc.creators) ? [...existingDoc.creators] : [];

    if (req.method === 'POST') {
      const creatorId = normalizeCreatorId(req.body?.creatorId);
      const creatorIndex = creators.findIndex((creator) => String(creator?.id || '') === creatorId);
      if (creatorIndex === -1) {
        throw new HttpError(404, 'Creator not found.');
      }

      const nextVideo = normalizeVideo(req.body?.video);
      const existingVideos = Array.isArray(creators[creatorIndex].videos) ? creators[creatorIndex].videos : [];
      if (existingVideos.some((video) => String(video?.id || '') === nextVideo.id)) {
        throw new HttpError(409, 'A video with this YouTube ID already exists for this creator.');
      }

      creators[creatorIndex] = {
        ...creators[creatorIndex],
        videos: [...existingVideos, nextVideo],
      };

      const saved = await upsertGuidesDocument(creators, adminUser.id);
      return res.status(200).json({ success: true, ...safeGuidesPayload(saved) });
    }

    if (req.method === 'PATCH') {
      const creatorId = normalizeCreatorId(req.body?.creatorId);
      const videoId = String(req.body?.videoId || '').trim();
      if (!videoId) throw new HttpError(400, 'videoId is required.');

      const creatorIndex = creators.findIndex((creator) => String(creator?.id || '') === creatorId);
      if (creatorIndex === -1) {
        throw new HttpError(404, 'Creator not found.');
      }

      const currentVideos = Array.isArray(creators[creatorIndex].videos) ? creators[creatorIndex].videos : [];
      const videoIndex = currentVideos.findIndex((video) => String(video?.id || '') === videoId);
      if (videoIndex === -1) {
        throw new HttpError(404, 'Video not found.');
      }

      const nextVideo = normalizeVideo({
        ...currentVideos[videoIndex],
        ...(req.body?.updates || {}),
      });

      creators[creatorIndex] = {
        ...creators[creatorIndex],
        videos: currentVideos.map((video, index) => (index === videoIndex ? nextVideo : video)),
      };

      const saved = await upsertGuidesDocument(creators, adminUser.id);
      return res.status(200).json({ success: true, ...safeGuidesPayload(saved) });
    }

    if (req.method === 'PUT') {
      const creatorId = normalizeCreatorId(req.body?.creatorId);
      const creatorIndex = creators.findIndex((creator) => String(creator?.id || '') === creatorId);
      if (creatorIndex === -1) {
        throw new HttpError(404, 'Creator not found.');
      }

      const nextVideos = Array.isArray(req.body?.videos) ? req.body.videos.map(normalizeVideo) : null;
      if (!nextVideos) {
        throw new HttpError(400, 'videos array is required.');
      }

      creators[creatorIndex] = {
        ...creators[creatorIndex],
        videos: nextVideos,
      };

      const saved = await upsertGuidesDocument(creators, adminUser.id);
      return res.status(200).json({ success: true, ...safeGuidesPayload(saved) });
    }

    if (req.method === 'DELETE') {
      const creatorId = normalizeCreatorId(req.body?.creatorId);
      const videoId = String(req.body?.videoId || '').trim();
      if (!videoId) throw new HttpError(400, 'videoId is required.');

      const creatorIndex = creators.findIndex((creator) => String(creator?.id || '') === creatorId);
      if (creatorIndex === -1) {
        throw new HttpError(404, 'Creator not found.');
      }

      const currentVideos = Array.isArray(creators[creatorIndex].videos) ? creators[creatorIndex].videos : [];
      creators[creatorIndex] = {
        ...creators[creatorIndex],
        videos: currentVideos.filter((video) => String(video?.id || '') !== videoId),
      };

      const saved = await upsertGuidesDocument(creators, adminUser.id);
      return res.status(200).json({ success: true, ...safeGuidesPayload(saved) });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
