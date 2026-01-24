const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Compact DIFF_EDITED entries:
 * - Merge adjacent edits regardless of timestamp, using the latest timestamp
 * - Bridge over xml_content lines (empty XML markup lines)
 */
function compactDiffEdited() {
  const editsPath = config.dashboard.edits;
  const xmlContentPath = config.dashboard.xmlContent;
  
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
  let allEdits;
  try {
    allEdits = JSON.parse(arrayContent);
  } catch (e) {
    console.error('Failed to parse edits array:', e.message);
    process.exit(1);
  }
  
  // Load the empty XML lines set
  let emptyXmlLines = new Set();
  try {
    const xmlContent = fs.readFileSync(xmlContentPath, 'utf8');
    const setMatch = xmlContent.match(/const emptyXmlLines = new Set\(\[([\d,\s]+)\]\);/);
    if (setMatch) {
      const numbers = setMatch[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      emptyXmlLines = new Set(numbers);
    }
  } catch (e) {
    console.warn('Could not load xml_content.js, proceeding without bridging');
  }
  
  if (allEdits.length === 0) {
    console.log('No edits to compact');
    return;
  }
  
  // Separate DIFF_EDITED from other edits
  const diffEditedEdits = allEdits.filter(edit => edit.status === 'DIFF_EDITED');
  const otherEdits = allEdits.filter(edit => edit.status !== 'DIFF_EDITED');
  
  if (diffEditedEdits.length === 0) {
    console.log('No DIFF_EDITED entries to compact');
    return;
  }
  
  // Sort DIFF_EDITED by startLine
  diffEditedEdits.sort((a, b) => a.startLine - b.startLine);
  
  // Compact the DIFF_EDITED entries
  const compacted = [];
  let current = { ...diffEditedEdits[0] };
  let latestTimestamp = new Date(current.timestamp);
  
  for (let i = 1; i < diffEditedEdits.length; i++) {
    const next = diffEditedEdits[i];
    const nextTimestamp = new Date(next.timestamp);
    
    // Update to the latest timestamp
    if (nextTimestamp > latestTimestamp) {
      latestTimestamp = nextTimestamp;
    }
    
    // Check if ranges are adjacent or if gap can be bridged by xml_content lines
    const canMerge = isAdjacentOrBridgeable(current.endLine, next.startLine, emptyXmlLines);
    
    if (canMerge) {
      // Merge the ranges
      current.endLine = Math.max(current.endLine, next.endLine);
    } else {
      // Save current with the latest timestamp and start a new one
      current.timestamp = latestTimestamp.toISOString();
      compacted.push(current);
      current = { ...next };
      latestTimestamp = nextTimestamp;
    }
  }
  
  // Don't forget the last entry
  current.timestamp = latestTimestamp.toISOString();
  compacted.push(current);
  
  // Combine compacted DIFF_EDITED with other edits
  const allCompacted = [...otherEdits, ...compacted];
  
  // Sort by timestamp (newest first)
  allCompacted.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Format the output
  const formattedEdits = allCompacted.map(edit => {
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
  
  console.log(`✓ Compacted DIFF_EDITED from ${diffEditedEdits.length} to ${compacted.length} records`);
  console.log(`✓ Total edits: ${allEdits.length} → ${allCompacted.length}`);
  console.log(`✓ Saved to ${editsPath}`);
}

/**
 * Check if two ranges are adjacent or can be bridged by xml_content lines
 * @param {number} currentEnd - End line of current range (inclusive)
 * @param {number} nextStart - Start line of next range (inclusive)
 * @param {Set<number>} emptyXmlLines - Set of line numbers that are empty XML lines
 * @returns {boolean} - True if ranges can be merged
 */
function isAdjacentOrBridgeable(currentEnd, nextStart, emptyXmlLines) {
  if (nextStart <= currentEnd + 1) {
    // Directly adjacent or overlapping
    return true;
  }
  
  // Check if all lines between currentEnd and nextStart are in emptyXmlLines
  for (let line = currentEnd + 1; line < nextStart; line++) {
    if (!emptyXmlLines.has(line)) {
      return false;
    }
  }
  
  // All lines between are empty XML lines, so we can bridge
  return true;
}

compactDiffEdited();
