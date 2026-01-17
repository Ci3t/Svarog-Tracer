/**
 * Guides API Endpoint (Vercel Blob)
 * GET: Returns guides data
 * POST: Adds a new video (requires API key)
 */

import { put, head } from '@vercel/blob';

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
    // Try to fetch from Blob
    const response = await fetch(`https://blob.vercel-storage.com/${BLOB_PATH}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('[Guides API] Blob not found, using initial data');
  }
  
  // If Blob doesn't exist, return initial data
  return INITIAL_DATA;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET: Return guides data
  if (req.method === 'GET') {
    try {
      const data = await getGuidesData();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
      return res.status(200).json(data);
    } catch (error) {
      console.error('[Guides API] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch guides' });
    }
  }
  
  // POST: Add a new video
  if (req.method === 'POST') {
    // Verify API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
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
      
      // Upload to Vercel Blob
      const blob = await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json'
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
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
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
      
      await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json'
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
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
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
      
      await put(BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json'
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
  
  return res.status(405).json({ error: 'Method not allowed' });
}
