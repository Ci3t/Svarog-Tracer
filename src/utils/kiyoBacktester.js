// Kiyo Backtest Utility
// Parses Kiyo debug export format

/**
 * Parse Kiyo debug export format
 * @param {string} text - Raw Kiyo debug export text
 * @returns {Object} Parsed data with rolls and predictions
 */
export function parseKiyoDebugExport(text) {
  const lines = text.split('\n');
  const rolls = [];
  const trackingData = [];
  
  // Find the tracking table section
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect table start (look for the separator line with dashes)
    if (line.startsWith('────') || line.startsWith('─'.repeat(10))) {
      inTable = true;
      continue;
    }
    
    // Parse table rows
    if (inTable && line.match(/^\d+\s+/)) {
      // Split by 2+ spaces to separate padded columns, while keeping single spaces within columns (like Time or Suggest)
      const parts = line.split(/\s{2,}/); 
      
      if (parts.length >= 4) {
        const rollNum = parseInt(parts[0]);
        const time = parts[1];
        const actual = parts[2];
        
        // Map columns based on the refined export format:
        // # (0), Time (1), Actual (2), Wave-C2 (3), ✓ (4), C2-Suggest (5), 
        // Wave-C3 (6), ✓ (7), C3-Suggest (8), 2str-M (9), ✓ (10), 2str-A (11), ✓ (12), 3str-M (13), ✓ (14), 3str-A (15), ✓ (16)
        
        const waveC2Raw = parts[3] || '-';
        const c2HitRaw = parts[4] || '-';
        const c2Suggest = parts[5] || '-';
        
        const waveC3Raw = parts[6] || '-';
        const c3HitRaw = parts[7] || '-';
        const c3Suggest = parts[8] || '-';
        
        const p2m = parts[9] || '-';
        const h2m = parts[10] || '-';
        const p2a = parts[11] || '-';
        const h2a = parts[12] || '-';
        
        const p3m = parts[13] || '-';
        const h3m = parts[14] || '-';
        const p3a = parts[15] || '-';
        const h3a = parts[16] || '-';
        
        trackingData.push({
          rollNum,
          time,
          actual,
          waveC2: waveC2Raw === '-' ? null : waveC2Raw.replace(/[\[\]]/g, '').split(',').map(d => d.trim()),
          c2Hit: c2HitRaw === '✓',
          c2Miss: c2HitRaw === '✗',
          c2Suggest: c2Suggest === '-' ? null : c2Suggest,
          
          waveC3: waveC3Raw === '-' ? null : waveC3Raw.replace(/[\[\]]/g, '').split(',').map(d => d.trim()),
          c3Hit: c3HitRaw === '✓',
          c3Miss: c3HitRaw === '✗',
          c3Suggest: c3Suggest === '-' ? null : c3Suggest,
          
          p2m: p2m === '-' ? null : p2m,
          h2m: h2m === '✓',
          p2a: p2a === '-' ? null : p2a,
          h2a: h2a === '✓',
          
          p3m: p3m === '-' ? null : p3m,
          h3m: h3m === '✓',
          p3a: p3a === '-' ? null : p3a,
          h3a: h3a === '✓',
        });
        
        rolls.push(actual);
      }
    }
    
    // Stop at end of table
    if (inTable && (line.includes('ACCURACY SUMMARY') || line.includes('📈 ACCURACY SUMMARY'))) {
      break;
    }
  }
  
  // Parse accuracy summary
  let col2Accuracy = null;
  let col3Accuracy = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Column 2:')) {
      const match = line.match(/(\d+)\s*\/\s*(\d+)\s*\(([0-9.]+)%\)/);
      if (match) {
        col2Accuracy = {
          hits: parseInt(match[1]),
          total: parseInt(match[2]),
          pct: parseFloat(match[3]),
        };
      }
    }
    if (line.startsWith('Column 3:')) {
      const match = line.match(/(\d+)\s*\/\s*(\d+)\s*\(([0-9.]+)%\)/);
      if (match) {
        col3Accuracy = {
          hits: parseInt(match[1]),
          total: parseInt(match[2]),
          pct: parseFloat(match[3]),
        };
      }
    }
  }
  
  return {
    rolls,
    trackingData,
    col2Accuracy,
    col3Accuracy,
    totalRolls: rolls.length,
  };
}

/**
 * Run Kiyo backtest - display historical predictions
 * @param {string} kiyoDebugText - Kiyo debug export text
 * @returns {Object} Backtest results
 */
export function runKiyoBacktest(kiyoDebugText) {
  // Parse the export
  const parsed = parseKiyoDebugExport(kiyoDebugText);
  
  if (parsed.rolls.length < 1) {
    return {
      error: 'No rolls found in Kiyo debug export',
      parsed,
    };
  }
  
  // Format results for display
  const results = parsed.trackingData.map((data) => {
    return {
      rollNum: data.rollNum,
      time: data.time,
      actual: data.actual,
      
      waveC2: data.waveC2,
      c2Hit: data.c2Hit,
      c2Miss: data.c2Miss,
      c2Suggest: data.c2Suggest,
      
      waveC3: data.waveC3,
      c3Hit: data.c3Hit,
      c3Miss: data.c3Miss,
      c3Suggest: data.c3Suggest,
      
      p2m: data.p2m,
      h2m: data.h2m,
      p2a: data.p2a,
      h2a: data.h2a,
      
      p3m: data.p3m,
      h3m: data.h3m,
      p3a: data.p3a,
      h3a: data.h3a,
    };
  });
  
  // Calculate statistics
  const col2Predictions = results.filter(r => r.waveC2 !== null);
  const col3Predictions = results.filter(r => r.waveC3 !== null);
  const p2strPredictions = results.filter(r => r.pred2str !== null);
  const p3strPredictions = results.filter(r => r.pred3str !== null);
  
  return {
    rolls: parsed.rolls,
    results,
    summary: {
      totalRolls: parsed.totalRolls,
      col2: {
        predictions: col2Predictions.length,
        hits: results.filter(r => r.c2Hit).length,
        misses: results.filter(r => r.c2Miss).length,
        accuracy: parsed.col2Accuracy?.pct || 0,
      },
      col3: {
        predictions: col3Predictions.length,
        hits: results.filter(r => r.c3Hit).length,
        misses: results.filter(r => r.c3Miss).length,
        accuracy: parsed.col3Accuracy?.pct || 0,
      },
      p2m: {
        predictions: results.filter(r => r.p2m !== null).length,
        hits: results.filter(r => r.h2m).length,
        accuracy: results.filter(r => r.p2m !== null).length ? (results.filter(r => r.h2m).length / results.filter(r => r.p2m !== null).length * 100).toFixed(1) : 0,
      },
      p2a: {
        predictions: results.filter(r => r.p2a !== null).length,
        hits: results.filter(r => r.h2a).length,
        accuracy: results.filter(r => r.p2a !== null).length ? (results.filter(r => r.h2a).length / results.filter(r => r.p2a !== null).length * 100).toFixed(1) : 0,
      },
      p3m: {
        predictions: results.filter(r => r.p3m !== null).length,
        hits: results.filter(r => r.h3m).length,
        accuracy: results.filter(r => r.p3m !== null).length ? (results.filter(r => r.h3m).length / results.filter(r => r.p3m !== null).length * 100).toFixed(1) : 0,
      },
      p3a: {
        predictions: results.filter(r => r.p3a !== null).length,
        hits: results.filter(r => r.h3a).length,
        accuracy: results.filter(r => r.p3a !== null).length ? (results.filter(r => r.h3a).length / results.filter(r => r.p3a !== null).length * 100).toFixed(1) : 0,
      }
    },
  };
}
