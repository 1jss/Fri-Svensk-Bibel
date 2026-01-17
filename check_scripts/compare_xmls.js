const fs = require('fs');
const path = require('path');

// Read both files
const file1917 = fs.readFileSync(path.join(__dirname, '1917.xml'), 'utf-8');
const fileFSB = fs.readFileSync(path.join(__dirname, 'FSB.xml'), 'utf-8');

// Split into lines (handle both \r\n and \n)
const lines1917 = file1917.replace(/\r\n/g, '\n').split('\n');
const linesFSB = fileFSB.replace(/\r\n/g, '\n').split('\n');

// Constants
const STATUS = 'DIFF_EDITED';
const timestamp = new Date().toISOString();

// Find differences and group consecutive ones
const diffs = [];
const same = [];
let currentDiffStart = null;
let currentSameStart = null;

const maxLines = Math.max(lines1917.length, linesFSB.length);

for (let i = 0; i < maxLines; i++) {
  const line1917 = (lines1917[i] || '').trim();
  const lineFSB = (linesFSB[i] || '').trim();
  
  const isDifferent = line1917 !== lineFSB;
  
  if (isDifferent) {
    // End same range if we have one
    if (currentSameStart !== null) {
      same.push({
        startLine: currentSameStart,
        endLine: i
      });
      currentSameStart = null;
    }
    // Start a new difference range if we're not already in one
    if (currentDiffStart === null) {
      currentDiffStart = i + 1; // Convert to 1-based indexing
    }
  } else {
    // End the current difference range if we have one
    if (currentDiffStart !== null) {
      diffs.push({
        startLine: currentDiffStart,
        endLine: i,
        status: STATUS,
        timestamp: timestamp
      });
      currentDiffStart = null;
    }
    // Start same range if we're not already in one
    if (currentSameStart === null) {
      currentSameStart = i + 1;
    }
  }
}

// Handle case where file ends with differences
if (currentDiffStart !== null) {
  diffs.push({
    startLine: currentDiffStart,
    endLine: maxLines,
    status: STATUS,
    timestamp: timestamp
  });
}

// Handle case where file ends with same
if (currentSameStart !== null) {
  same.push({
    startLine: currentSameStart,
    endLine: maxLines
  });
}

console.error(`Compared ${maxLines} lines`);
console.error(`File 1917.xml has ${lines1917.length} lines`);
console.error(`File FSB.xml has ${linesFSB.length} lines`);
console.error(`Found ${diffs.length} difference clusters`);
console.error(`Found ${same.length} identical clusters`);
console.error(`\nIdentical line ranges:`, same);

// Write the result to a file
const outputPath = path.join(__dirname, 'diffs.json');
fs.writeFileSync(outputPath, JSON.stringify(diffs, null, 2));
console.error(`\nDiffs written to ${outputPath}`);
