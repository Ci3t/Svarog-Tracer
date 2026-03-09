import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto'; // Built-in Node.js crypto

const BLOB_PREFIX = 'hsr-cavern-clears-';
const INITIAL_DATA = [];

// Global In-Memory Cache for Lambda instances to bypass Vercel Blob eventual consistency
let lambdaDataCache = null;
let lambdaCacheTime = 0;

// Helper to get fresh data from Blob
export async function getCavernData() {
  // If the lambda just wrote data within the last minute, use it instantly
  if (lambdaDataCache && (Date.now() - lambdaCacheTime < 60000)) {
    return { data: lambdaDataCache, allBlobs: [] };
  }

  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    let legacyBlobs = [];
    
    // Check for the legacy exact-name blob if no new blobs exist
    if (blobs.length === 0) {
      const legacyObj = await list({ prefix: 'hsr-cavern-clears.json' });
      legacyBlobs = legacyObj.blobs;
    }
    
    const allBlobs = [...blobs, ...legacyBlobs];

    if (allBlobs.length > 0) {
      // Sort blobs by uploadedAt descending to get the latest
      allBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const latestUrl = allBlobs[0].url;
      const response = await fetch(`${latestUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        return { data: await response.json(), allBlobs };
      }
    }
    
    return { data: INITIAL_DATA, allBlobs: [] };
  } catch (error) {
    console.error('[Cavern API] Blob error:', error);
    return { data: INITIAL_DATA, allBlobs: [] };
  }
}

// Helper to write completely new blobs to bypass Cache
export async function saveCavernData(newData, allBlobs) {
  lambdaDataCache = newData;
  lambdaCacheTime = Date.now();

  const newName = `hsr-cavern-clears-${Date.now()}.json`;
  await put(newName, JSON.stringify(newData, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  });

  const oldUrls = allBlobs.map(b => b.url);
  if (oldUrls.length > 0) {
    await del(oldUrls);
  }
}

const normalizeChars = (arr) => { 
  if (!arr) return ''; 
  const toArr = Array.isArray(arr) ? arr : String(arr).split(','); 
  return toArr.map(val => String(val).trim().toLowerCase()).sort().join(','); 
};

const normalizeTime = (t) => t ? String(t).trim().replace(/^0/, '') : '';
export const normalizeKey = (val) => (val || '').toString().trim().replace(/['"]/g, '');

export async function handler(req, res) {
  // Method Not Allowed check
  if (!['GET', 'POST', 'DELETE', 'OPTIONS'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // GET: Return all cavern clear times
  if (req.method === 'GET') {
    try {
      const { data } = await getCavernData();
      res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate'); // Lower cache for deletions
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch cavern data' });
    }
  }
  
  // POST: Add a new cavern clear report OR Toggle Like
  if (req.method === 'POST') {
    try {
      const { action, userId, relicId, clearTime, characters, discordUser, note, substats, mainStat } = req.body;
      
      const { data, allBlobs } = await getCavernData();

      // --- HANDLE LIKE ACTION ---
      if (action === 'like') {
        const { likeAction } = req.body;
        
        if (!userId || !relicId || !clearTime || !characters) {
          return res.status(400).json({ error: 'Missing identity for like action.' });
        }

        const charsSorted = normalizeChars(characters);
        const subsSorted = (substats && substats.length > 0) ? normalizeChars(substats) : 'none';
        const targetTime = normalizeTime(clearTime);
        const targetId = String(relicId).trim();

        const entry = data.find(e => {
          const eSubstats = e.substats || (e.reports && e.reports[0] && e.reports[0].substats) || [];
          const eSubsSorted = eSubstats.length > 0 ? normalizeChars(eSubstats) : 'none';
          
          return String(e.relicId).trim() === targetId && 
                 normalizeTime(e.clearTime) === targetTime &&
                 normalizeChars(e.characters) === charsSorted &&
                 eSubsSorted === subsSorted;
        });

        if (!entry) return res.status(404).json({ error: 'Record not found to like.' });

        if (!entry.likes) entry.likes = [];
        const userIdx = entry.likes.indexOf(userId);
        
        if (likeAction === 'remove') {
          if (userIdx !== -1) entry.likes.splice(userIdx, 1);
        } else {
          // add or default
          if (userIdx === -1) entry.likes.push(userId);
        }

        await saveCavernData(data, allBlobs);

        return res.status(200).json({ success: true, likes: entry.likes });
      }

      // --- CONTINUE WITH NORMAL REPORT ---
      // Validation
      if (!relicId || !clearTime || !characters || characters.length !== 4) {
        return res.status(400).json({ error: 'Incomplete payload.' });
      }
      if (!discordUser || discordUser.trim().length < 2) {
        return res.status(400).json({ error: 'Discord ID required.' });
      }
      if (!/^\d{1,2}:\d{2}$/.test(clearTime)) {
        return res.status(400).json({ error: 'Format must be MM:SS.' });
      }
      if (note && note.length > 40) {
        return res.status(400).json({ error: 'Note exceeds 40 characters.' });
      }
      if (!substats || !Array.isArray(substats) || substats.length === 0 || substats.length > 4) {
        return res.status(400).json({ error: 'At least 1 substat is required (max 4).' });
      }
      if (mainStat && typeof mainStat !== 'string') {
        return res.status(400).json({ error: 'Invalid main stat format.' });
      }

      const reportId = crypto.randomUUID();
      const secretKey = crypto.randomUUID(); 
      
      const charactersSorted = normalizeChars(characters);
      const substatsSorted = normalizeChars(substats);
      const targetTime = normalizeTime(clearTime);
      const targetId = String(relicId).trim();

      const existingEntry = data.find(entry => {
        const eSubstats = entry.substats || (entry.reports && entry.reports[0] && entry.reports[0].substats) || [];
        return String(entry.relicId).trim() === targetId && 
               normalizeTime(entry.clearTime) === targetTime &&
               normalizeChars(entry.characters) === charactersSorted &&
               normalizeChars(eSubstats) === substatsSorted;
      });
      
      const reportObj = {
        id: reportId,
        key: secretKey,
        reporter: discordUser.trim(),
        timestamp: new Date().toISOString(),
        note: note ? note.trim() : undefined,
        substats: substats,
        mainStat: mainStat || undefined
      };


      if (existingEntry) {
        existingEntry.verifiedCount = (existingEntry.verifiedCount || 1) + 1;
        existingEntry.lastReported = new Date().toISOString();
        if (!existingEntry.reports) existingEntry.reports = [];
        existingEntry.reports.push(reportObj);
        
        if (!existingEntry.reporters) existingEntry.reporters = [];
        if (!existingEntry.reporters.includes(discordUser.trim())) {
          existingEntry.reporters.push(discordUser.trim());
        }
      } else {
        data.push({
          relicId,
          clearTime,
          characters,
          substats,
          reporters: [discordUser.trim()],
          reports: [reportObj],
          verifiedCount: 1,
          likes: [], // NEW: Initialize likes
          firstReported: new Date().toISOString(),
          lastReported: new Date().toISOString()
        });
      }
      await saveCavernData(data, allBlobs);
      
      return res.status(200).json({
        success: true,
        reportId,
        secretKey,
        message: 'Report archived successfully.'
      });
    } catch (error) {
      console.error('[Cavern API] POST error:', error);
      return res.status(500).json({ error: 'Failed to record session.' });
    }
  }
  
  // DELETE: Handle Individual deletion, Legacy deletion, and Admin Wipe
  if (req.method === 'DELETE') {
    const { reportId, relicId, clearTime, characters, key } = req.query;
    const apiKey = req.headers['x-api-key'];

    const { data, allBlobs } = await getCavernData();

    // Verification Logic:
    const targetAdmin = normalizeKey(process.env.HSR_ADMIN_PASS || process.env.HSR_ADMIN_PAS);
    const targetSuper = normalizeKey(process.env.ADMIN_API_KEY);
    
    const receivedKey = normalizeKey(key);
    const receivedApiKey = normalizeKey(apiKey);

    const isAdmin = (targetAdmin !== '') && (receivedKey === targetAdmin || receivedApiKey === targetAdmin);
    const isSuperAdmin = (targetSuper !== '') && (receivedApiKey === targetSuper);

    // Diagnostic variables for DELETE scoping
    let targetRelicId = null;
    let targetTime = null;
    let charsSorted = null;
    let substatsSorted = null;
    let mismatches = [];

    // 1. FULL WIPE (Admin or SuperAdmin)
    if (!reportId && !relicId) {
      if (!isAdmin && !isSuperAdmin) {
        return res.status(401).json({ error: 'Unauthorized: Admin access required for full purge.' });
      }
      
      // Update Blob safely by rotating filename
      await saveCavernData([], allBlobs);
      
      return res.status(200).json({ success: true, message: 'Archive completely purged.' });
    }

    let found = false;

    // 2. SINGLE REPORT DELETION (by reportId)
    if (reportId) {
      for (let i = 0; i < data.length; i++) {
        const entry = data[i];
        if (!entry.reports) continue;

        const reportIndex = entry.reports.findIndex(r => r.id === reportId);
        if (reportIndex !== -1) {
          const report = entry.reports[reportIndex];
          
          if (report.key !== key && !isAdmin && !isSuperAdmin) {
            return res.status(401).json({ error: 'Invalid key for this report.' });
          }

          entry.reports.splice(reportIndex, 1);
          entry.verifiedCount = entry.reports.length;
          entry.reporters = [...new Set(entry.reports.map(r => r.reporter))];

          if (entry.reports.length === 0) {
            data.splice(i, 1);
          }
          
          found = true;
          break;
        }
      }
    } 
    // 3. ENTIRE VARIANT DELETION (Legacy Support, Admin Only)
    else if (relicId && clearTime && characters) {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Admin access required to expunge a full variant.' });
      }

      targetRelicId = String(relicId || '').trim().toLowerCase();
      targetTime = normalizeTime(clearTime);
      charsSorted = normalizeChars(characters);

      substatsSorted = req.query.substats && req.query.substats !== 'undefined' 
        ? normalizeChars(req.query.substats)
        : 'none';
      
      let entryIndex = data.findIndex((e, idx) => {
        const rowRelicId = String(e.relicId || '').trim().toLowerCase();
        const rowTime = normalizeTime(e.clearTime);
        const rowCharsSorted = normalizeChars(e.characters);

        const relicMatch = rowRelicId === targetRelicId;
        const timeMatch = rowTime === targetTime;
        const charsMatch = rowCharsSorted === charsSorted;
        
        const matchBase = relicMatch && timeMatch && charsMatch;
        
        if (!matchBase) {
          if (relicMatch || timeMatch) {
             mismatches.push({ index: idx, relicMatch, timeMatch, charsMatch, rowRelicId, rowTime, rowCharsSorted });
          }
          return false;
        }
        
        const eSubstats = e.substats || (e.reports && e.reports[0] && e.reports[0].substats) || [];
        const eSubsSorted = eSubstats.length > 0 ? normalizeChars(eSubstats) : 'none';
        
        const subsMatch = (substatsSorted === 'none' || eSubsSorted === substatsSorted);
        
        if (!subsMatch) {
           mismatches.push({ index: idx, matchBase: true, subsMatch, eSubsSorted, substatsSorted });
           return false;
        }
        
        return true;
      });

      // SECONDARY MATCH (Admin Only Failsafe): If no exact match, try matching base only if exactly 1 exists
      if (entryIndex === -1 && isAdmin) {
        const fuzzyMatches = data.filter(e => 
          String(e.relicId || '').trim().toLowerCase() === targetRelicId && 
          normalizeTime(e.clearTime) === targetTime && 
          normalizeChars(e.characters) === charsSorted
        );
        if (fuzzyMatches.length === 1) {
          entryIndex = data.indexOf(fuzzyMatches[0]);
        }
      }

      if (entryIndex !== -1) {
        data.splice(entryIndex, 1);
        found = true;
      }
    }

    if (!found) {
      return res.status(404).json({ 
        error: 'Record not found.',
        debug: {
          provided: { relicId, clearTime, characters, substats: req.query.substats, key: key ? 'PRESENT' : 'MISSING' },
          targets: { targetRelicId, targetTime, charsSorted, substatsSorted },
          mismatches: mismatches.slice(0, 5),
          isAdmin
        }
      });
    }

    // Update Blob safely by rotating filename
    await saveCavernData(data, allBlobs);

    return res.status(200).json({ success: true, message: 'Archive record expunged.' });
  }
  
  return res.status(405).json({ error: 'Method Not Allowed' });
}
