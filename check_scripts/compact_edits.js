const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Compact edits by combining adjacent edits with the same status and timestamp
 */
function compactEdits() {
  const editsPath = config.dashboard.edits;
  
  // Read the edits file
  const content = fs.readFileSync(editsPath, 'utf8');
  
  // Extract the array from the file
  const match = content.match(/const edits = \[([\s\S]*)\];/);
  if (!match) {
    console.error('Could not parse edits.js file');
    process.exit(1);
  }
  
  // Parse the JSON array
  const arrayContent = '[' + match[1] + ']';
  let edits;
  try {
    edits = JSON.parse(arrayContent);
  } catch (e) {
    console.error('Failed to parse edits array:', e.message);
    process.exit(1);
  }
  
  if (edits.length === 0) {
    console.log('No edits to compact');
    return;
  }
  
  // Group edits by status and timestamp
  const groups = {};
  
  edits.forEach(edit => {
    const key = `${edit.status}|${edit.timestamp}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(edit);
  });
  
  // Compact within each group
  const compacted = [];
  
  Object.values(groups).forEach(group => {
    // Sort by startLine
    group.sort((a, b) => a.startLine - b.startLine);
    
    // Merge overlapping/adjacent ranges
    let current = { ...group[0] };
    
    for (let i = 1; i < group.length; i++) {
      const next = group[i];
      
      // Check if ranges overlap or are adjacent
      const isOverlappingOrAdjacent = next.startLine <= current.endLine + 1;
      
      if (isOverlappingOrAdjacent) {
        // Merge the ranges
        current.endLine = Math.max(current.endLine, next.endLine);
      } else {
        // Save current and start a new one
        compacted.push(current);
        current = { ...next };
      }
    }
    
    // Don't forget the last range in this group
    compacted.push(current);
  });
  
  // Sort compacted back by original appearance (by status/timestamp groups, then by startLine)
  compacted.sort((a, b) => {
    const keyA = `${a.status}|${a.timestamp}`;
    const keyB = `${b.status}|${b.timestamp}`;
    
    // Maintain the order of groups as they first appeared
    const keyOrder = Object.keys(groups);
    const orderDiff = keyOrder.indexOf(keyA) - keyOrder.indexOf(keyB);
    
    if (orderDiff !== 0) return orderDiff;
    return a.startLine - b.startLine;
  });
  
  // Format the output
  const formattedEdits = compacted.map(edit => {
    return `  {
    "startLine": ${edit.startLine},
    "endLine": ${edit.endLine},
    "status": "${edit.status}",
    "timestamp": "${edit.timestamp}"
  }`;
  }).join(',\n');
  
  const output = `const edits = [\n${formattedEdits}\n];\n`;
  
  // Write the compacted edits back
  fs.writeFileSync(editsPath, output, 'utf8');
  
  console.log(`✓ Compacted edits from ${edits.length} to ${compacted.length} records`);
  console.log(`✓ Saved to ${editsPath}`);
}

compactEdits();
