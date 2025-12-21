// Debug File Analysis Script
// Analyzes Kiyo Mode debug files to identify failure patterns

const fs = require('fs');
const path = require('path');

// Parse a single debug file
function parseDebugFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const data = {
    filename: path.basename(filePath),
    totalRolls: 0,
    rolls: [],
    predictions: [],
    waveAccuracy: { col2: { hits: 0, total: 0 }, col3: { hits: 0, total: 0 } },
    prefixAccuracy: { main: 0, alt: 0, total: 0 },
    patterns: []
  };
  
  // Extract total rolls
  const totalMatch = content.match(/Total Rolls: (\d+)/);
  if (totalMatch) data.totalRolls = parseInt(totalMatch[1]);
  
  // Extract all rolls
  const rollsMatch = content.match(/📋 ALL ROLLS[\s\S]*?\n\n([\s\S]*?)\n\n/);
  if (rollsMatch) {
    const rollsText = rollsMatch[1];
    const rollMatches = rollsText.match(/\d{3}/g);
    if (rollMatches) data.rolls = rollMatches;
  }
  
  // Parse tracking table
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Idx  Time')) {
      inTable = true;
      continue;
    }
    
    if (inTable && line.trim() === '') {
      break;
    }
    
    if (inTable && line.match(/^\s*\d+\s+/)) {
      const parts = line.split(/\s+/).filter(x => x);
      if (parts.length >= 8) {
        const prediction = {
          idx: parseInt(parts[0]),
          time: parts[1] + ' ' + parts[2],
          actual: parts[3],
          waveC2: parts[4],
          c2Result: parts[5],
          waveC3: parts[6],
          c3Result: parts[7],
          prefix: parts[8] || '-',
          prefixResult: parts[9] || '✗'
        };
        data.predictions.push(prediction);
      }
    }
  }
  
  // Extract pattern analysis
  const patternMatch = content.match(/Roll \| Digit 2 \| Digit 3[\s\S]*?Current Streaks:/);
  if (patternMatch) {
    const patternLines = patternMatch[0].split('\n').filter(l => l.includes('|') && !l.includes('Roll |'));
    data.patterns = patternLines.map(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 5) {
        return {
          roll: parts[0],
          digit2: parts[1],
          digit3: parts[2],
          col2: parts[3],
          col3: parts[4],
          pattern: parts[5]
        };
      }
      return null;
    }).filter(Boolean);
  }
  
  return data;
}

// Analyze failure patterns
function analyzeFailures(allData) {
  const analysis = {
    overallStats: {
      totalPredictions: 0,
      waveC2Hits: 0,
      waveC2Total: 0,
      waveC3Hits: 0,
      waveC3Total: 0,
      prefixHits: 0,
      prefixTotal: 0
    },
    failurePatterns: {
      consecutiveMisses: [],
      wrongFlipPredictions: [],
      prefixFailures: [],
      timeBasedPatterns: []
    },
    insights: []
  };
  
  // Aggregate all predictions
  allData.forEach(fileData => {
    fileData.predictions.forEach(pred => {
      analysis.overallStats.totalPredictions++;
      
      // Wave C2
      if (pred.waveC2 !== '-' && pred.waveC2 !== '[]') {
        analysis.overallStats.waveC2Total++;
        if (pred.c2Result === '✓') analysis.overallStats.waveC2Hits++;
        else {
          analysis.failurePatterns.wrongFlipPredictions.push({
            file: fileData.filename,
            idx: pred.idx,
            time: pred.time,
            actual: pred.actual,
            predicted: pred.waveC2,
            column: 'C2'
          });
        }
      }
      
      // Wave C3
      if (pred.waveC3 !== '-' && pred.waveC3 !== '[]') {
        analysis.overallStats.waveC3Total++;
        if (pred.c3Result === '✓') analysis.overallStats.waveC3Hits++;
        else {
          analysis.failurePatterns.wrongFlipPredictions.push({
            file: fileData.filename,
            idx: pred.idx,
            time: pred.time,
            actual: pred.actual,
            predicted: pred.waveC3,
            column: 'C3'
          });
        }
      }
      
      // Prefix
      if (pred.prefix !== '-') {
        analysis.overallStats.prefixTotal++;
        if (pred.prefixResult === 'M' || pred.prefixResult === 'A') {
          analysis.overallStats.prefixHits++;
        } else {
          analysis.failurePatterns.prefixFailures.push({
            file: fileData.filename,
            idx: pred.idx,
            time: pred.time,
            actual: pred.actual,
            predicted: pred.prefix
          });
        }
      }
    });
  });
  
  // Calculate accuracy percentages
  const waveC2Acc = (analysis.overallStats.waveC2Hits / analysis.overallStats.waveC2Total * 100).toFixed(1);
  const waveC3Acc = (analysis.overallStats.waveC3Hits / analysis.overallStats.waveC3Total * 100).toFixed(1);
  const prefixAcc = (analysis.overallStats.prefixHits / analysis.overallStats.prefixTotal * 100).toFixed(1);
  
  analysis.insights.push(`Wave C2 Accuracy: ${waveC2Acc}% (${analysis.overallStats.waveC2Hits}/${analysis.overallStats.waveC2Total})`);
  analysis.insights.push(`Wave C3 Accuracy: ${waveC3Acc}% (${analysis.overallStats.waveC3Hits}/${analysis.overallStats.waveC3Total})`);
  analysis.insights.push(`Prefix Accuracy: ${prefixAcc}% (${analysis.overallStats.prefixHits}/${analysis.overallStats.prefixTotal})`);
  
  // Identify consecutive miss patterns
  allData.forEach(fileData => {
    let consecutiveMisses = 0;
    let startIdx = null;
    
    fileData.predictions.forEach((pred, i) => {
      const isMiss = pred.c3Result === '✗' && pred.prefixResult === '✗';
      
      if (isMiss) {
        if (consecutiveMisses === 0) startIdx = pred.idx;
        consecutiveMisses++;
      } else {
        if (consecutiveMisses >= 3) {
          analysis.failurePatterns.consecutiveMisses.push({
            file: fileData.filename,
            startIdx,
            endIdx: fileData.predictions[i-1].idx,
            count: consecutiveMisses
          });
        }
        consecutiveMisses = 0;
      }
    });
  });
  
  return analysis;
}

// Detect pattern changes
function detectPatternChanges(fileData) {
  const changes = [];
  const windowSize = 6;
  
  for (let i = windowSize; i < fileData.patterns.length; i++) {
    const prevWindow = fileData.patterns.slice(i - windowSize, i);
    const currWindow = fileData.patterns.slice(i, i + windowSize);
    
    // Count L/H distribution
    const prevLH = { L: 0, H: 0 };
    const currLH = { L: 0, H: 0 };
    
    prevWindow.forEach(p => {
      if (p.col3.includes('Low')) prevLH.L++;
      else prevLH.H++;
    });
    
    currWindow.forEach(p => {
      if (p.col3.includes('Low')) currLH.L++;
      else currLH.H++;
    });
    
    // Detect significant shift
    const prevRatio = prevLH.L / (prevLH.L + prevLH.H);
    const currRatio = currLH.L / (currLH.L + currLH.H);
    
    if (Math.abs(prevRatio - currRatio) > 0.4) {
      changes.push({
        position: i,
        roll: fileData.patterns[i].roll,
        prevDist: `L:${prevLH.L} H:${prevLH.H}`,
        currDist: `L:${currLH.L} H:${currLH.H}`,
        shift: (currRatio - prevRatio).toFixed(2)
      });
    }
  }
  
  return changes;
}

// Main execution
function main() {
  const debugDir = 'd:/Coding/HSR_PatternRecord/debugstxt';
  const files = fs.readdirSync(debugDir)
    .filter(f => f.startsWith('Kiyo-Debug'))
    .sort()
    .map(f => path.join(debugDir, f));
  
  console.log('🔬 Analyzing Debug Files...\n');
  
  const allData = files.map(parseDebugFile);
  
  // Overall analysis
  const analysis = analyzeFailures(allData);
  
  console.log('📊 OVERALL ACCURACY:');
  analysis.insights.forEach(insight => console.log(`  ${insight}`));
  
  console.log('\n❌ FAILURE PATTERNS:');
  console.log(`  Consecutive Miss Streaks: ${analysis.failurePatterns.consecutiveMisses.length}`);
  console.log(`  Wrong Flip Predictions: ${analysis.failurePatterns.wrongFlipPredictions.length}`);
  console.log(`  Prefix Failures: ${analysis.failurePatterns.prefixFailures.length}`);
  
  // Pattern changes
  console.log('\n🔄 PATTERN CHANGES DETECTED:');
  allData.forEach(fileData => {
    const changes = detectPatternChanges(fileData);
    if (changes.length > 0) {
      console.log(`\n  ${fileData.filename}:`);
      changes.forEach(change => {
        console.log(`    Roll ${change.position}: ${change.prevDist} → ${change.currDist} (shift: ${change.shift})`);
      });
    }
  });
  
  // Export detailed report
  const report = {
    timestamp: new Date().toISOString(),
    analysis,
    allData,
    recommendations: generateRecommendations(analysis)
  };
  
  fs.writeFileSync(
    path.join(debugDir, 'analysis_report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Analysis complete! Report saved to analysis_report.json');
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  const waveC2Acc = analysis.overallStats.waveC2Hits / analysis.overallStats.waveC2Total;
  const waveC3Acc = analysis.overallStats.waveC3Hits / analysis.overallStats.waveC3Total;
  const prefixAcc = analysis.overallStats.prefixHits / analysis.overallStats.prefixTotal;
  
  if (waveC2Acc < 0.5) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Column 2 (Outer/Inner) predictions are unreliable',
      solution: 'Disable Column 2 predictions or reduce their weight significantly'
    });
  }
  
  if (waveC3Acc < 0.7) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Column 3 (Low/High) accuracy below target',
      solution: 'Implement adaptive thresholds based on recent accuracy'
    });
  }
  
  if (prefixAcc < 0.3) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'Prefix predictions are catastrophically bad',
      solution: 'Completely redesign prefix prediction algorithm or disable it'
    });
  }
  
  if (analysis.failurePatterns.consecutiveMisses.length > 3) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Multiple consecutive miss streaks detected',
      solution: 'Implement pattern change detection to reset predictions'
    });
  }
  
  return recommendations;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseDebugFile, analyzeFailures, detectPatternChanges };
