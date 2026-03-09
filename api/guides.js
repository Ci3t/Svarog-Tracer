/**
 * Guides API Endpoint (Vercel Blob)
 * GET: Returns guides data
 * POST: Adds a new video (requires API key)
 */

import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'guides.json';
const INITIAL_DATA = {
  creators: [
    {
      id: "bbp",
      name: "BigBoiPinoy",
      shortName: "BBP",
      channelUrl: "https://www.youtube.com/@BigBoiPnoy",
      description: "OG Relic Manipulation Guide Creator",
      color: "amber",
      videos: [
        { id: "QrqPENtcFus", title: "Relic Manipulation Changed?", description: "Latest update on how relic manipulation works after patches", featured: true },
        { id: "swghREiYFPo", title: "Relic Manipulation Weight Method", description: "Relic Manipulation Weight Method Tips", featured: false },
        { id: "G0j3imbKw7M", title: "How to Manipulate Relics", description: "Original comprehensive guide on relic manipulation (8 months ago)", featured: false }
      ]
    },
    {
      id: "ciet",
      name: "Ciet",
      shortName: "Ciet",
      channelUrl: "https://www.youtube.com/@iiciet",
      description: "Svarog Tracer Creator & Developer",
      color: "purple",
      videos: [
        { id: "nUUx7ur-yUY", title: "Ultimate Guide: How to Use Svarog Tracer", description: "Complete walkthrough of the Svarog Tracer site and all its features", featured: true }
      ]
    }
  ]
};

async function getGuidesData() {
  try {
    // Use Vercel Blob SDK to list and get the blob
    const { blobs } = await list({ prefix: BLOB_PATH });
    
    if (blobs.length > 0) {
      // Fetch the blob content with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(blobs[0].url, { 
          signal: controller.signal,
          cache: 'no-store' 
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          console.log('[Guides API] Loaded data from Blob');
          return data;
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.warn('[Guides API] Blob fetch failed, returning initial data:', e.message);
      }
    }
    
    console.log('[Guides API] Initializing with default data');
    try {
      await put(BLOB_PATH, JSON.stringify(INITIAL_DATA, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
    } catch (e) {
      console.warn('[Guides API] Could not save to Blob (likely dev mode):', e.message);
    }
    
    return INITIAL_DATA;
  } catch (error) {
    console.error('[Guides API] Critical Blob error:', error);
    return INITIAL_DATA;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPass = process.env.HSR_ADMIN_PASS || process.env.ADMIN_API_KEY || "";
  const normalizedPass = String(rawPass).replace(/['"]/g, "").trim();
  const apiKey = (req.headers['x-api-key'] || "").trim();

  // Logging for debugging
  if (req.method !== 'GET') {
    console.log(`[Guides API] ${req.method} request received`);
    console.log(`[Guides API] Header Key: "${apiKey}"`);
    console.log(`[Guides API] Target Key: "${normalizedPass}"`);
    console.log(`[Guides API] Body:`, JSON.stringify(req.body));
  }
  
  // GET: Return guides data
  if (req.method === 'GET') {
    try {
      // GET requests only return data
      let data = await getGuidesData();
      
      // Validation: Ensure data.creators is not empty
      if (!data || !data.creators || data.creators.length === 0) {
        console.warn('[Guides API] Fetched data was empty, using INITIAL_DATA fallback');
        data = INITIAL_DATA;
      }

      console.log(`[Guides API] Returning data for ${data.creators?.length || 0} creators`);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(200).json(data);
    } catch (error) {
      console.error('[Guides API] GET error:', error);
      return res.status(200).json(INITIAL_DATA); // Force success with default data
    }
  }
  
  // POST: Add a new video OR Verify Admin
  if (req.method === 'POST') {
    // 1. Verify Admin (Secure JSON body)
    if (req.body?.verify !== undefined) {
      const providedPass = (req.body.verify || "").trim();
      const isValid = providedPass === normalizedPass;
      console.log(`[Guides API] POST Verification: ${isValid ? 'SUCCESS' : 'FAILURE'}`);
      return res.status(200).json({ valid: isValid });
    }

    // 2. Add Video (Requires apiKey)
    if (!apiKey || apiKey !== normalizedPass) {
      console.error('[Guides API] POST Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const { creatorId, video } = req.body;
      
      if (!creatorId || !video || !video.id || !video.title) {
        return res.status(400).json({ error: 'Missing required fields: creatorId, video.id, video.title' });
      }
      
      // Get current data
      const data = await getGuidesData();
      
      // Find creator
      const creator = data.creators.find(c => c.id === creatorId);
      if (!creator) {
        return res.status(404).json({ error: `Creator '${creatorId}' not found` });
      }
      
      // Add video (with defaults)
      const newVideo = {
        id: video.id,
        title: video.title,
        description: video.description || '',
        featured: video.featured || false
      };
      
      creator.videos.push(newVideo);
      
      // Upload to Vercel Blob (overwrite)
      const blob = await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      
      console.log('[Guides API] Video added successfully:', newVideo.title);
      
      return res.status(200).json({
        success: true,
        message: `Video "${newVideo.title}" added to ${creator.name}`,
        blobUrl: blob.url
      });
    } catch (error) {
      console.error('[Guides API] POST error:', error);
      return res.status(500).json({ error: 'Failed to add video', message: error.message });
    }
  }
  
  // DELETE: Remove a video
  if (req.method === 'DELETE') {
    if (!apiKey || apiKey !== normalizedPass) {
      console.error('[Guides API] DELETE Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const { creatorId, videoId } = req.body;
      
      if (!creatorId || !videoId) {
        return res.status(400).json({ error: 'Missing required fields: creatorId, videoId' });
      }
      
      const data = await getGuidesData();
      const creator = data.creators.find(c => c.id === creatorId);
      
      if (!creator) {
        return res.status(404).json({ error: `Creator '${creatorId}' not found` });
      }
      
      const videoIndex = creator.videos.findIndex(v => v.id === videoId);
      if (videoIndex === -1) {
        return res.status(404).json({ error: `Video '${videoId}' not found` });
      }
      
      const deletedVideo = creator.videos.splice(videoIndex, 1)[0];
      
      // Update Blob (overwrite)
      await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      
      console.log('[Guides API] Video deleted:', deletedVideo.title);
      
      return res.status(200).json({
        success: true,
        message: `Video "${deletedVideo.title}" deleted from ${creator.name}`
      });
    } catch (error) {
      console.error('[Guides API] DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete video', message: error.message });
    }
  }
  
  // PATCH: Update a video
  if (req.method === 'PATCH') {
    if (!apiKey || apiKey !== normalizedPass) {
      console.error('[Guides API] PATCH Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const { creatorId, videoId, updates } = req.body;
      
      if (!creatorId || !videoId || !updates) {
        return res.status(400).json({ error: 'Missing required fields: creatorId, videoId, updates' });
      }
      
      const data = await getGuidesData();
      const creator = data.creators.find(c => c.id === creatorId);
      
      if (!creator) {
        return res.status(404).json({ error: `Creator '${creatorId}' not found` });
      }
      
      const video = creator.videos.find(v => v.id === videoId);
      if (!video) {
        return res.status(404).json({ error: `Video '${videoId}' not found` });
      }
      
      // Apply updates
      if (updates.title !== undefined) video.title = updates.title;
      if (updates.description !== undefined) video.description = updates.description;
      if (updates.featured !== undefined) video.featured = updates.featured;
      if (updates.id !== undefined) video.id = updates.id; // Allow fixing the ID
      
      // Update Blob (overwrite)
      await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      
      console.log('[Guides API] Video updated:', video.title);
      
      return res.status(200).json({
        success: true,
        message: `Video "${video.title}" updated in ${creator.name}`,
        video: video
      });
    } catch (error) {
      console.error('[Guides API] PATCH error:', error);
      return res.status(500).json({ error: 'Failed to update video', message: error.message });
    }
  }
  
  // PUT: Reorder videos for a creator
  if (req.method === 'PUT') {
    if (!apiKey || apiKey !== normalizedPass) {
      console.error('[Guides API] PUT Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const { creatorId, videos } = req.body;
      
      if (!creatorId || !videos || !Array.isArray(videos)) {
        return res.status(400).json({ error: 'Missing required fields: creatorId, videos (array)' });
      }
      
      const data = await getGuidesData();
      const creator = data.creators.find(c => c.id === creatorId);
      
      if (!creator) {
        return res.status(404).json({ error: `Creator '${creatorId}' not found` });
      }
      
      // Update the videos array (reorder)
      creator.videos = videos;
      
      // Update Blob (overwrite)
      await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      
      console.log('[Guides API] Videos reordered for:', creator.name);
      
      return res.status(200).json({
        success: true,
        message: `Videos reordered for ${creator.name}`
      });
    } catch (error) {
      console.error('[Guides API] PUT error:', error);
      return res.status(500).json({ error: 'Failed to reorder videos', message: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
