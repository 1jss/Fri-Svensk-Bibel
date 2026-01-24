const fs = require('fs');
const path = require('path');
const config = require('../config.js');

/**
 * Finds all line numbers in FSB.xml that contain only XML markup (no text content).
 * After removing XML tags and trimming, if the line is empty, it's added to the array.
 */

function findEmptyXmlLines() {
  const fileContent = fs.readFileSync(config.data.bibles.fsbXml, 'utf-8');
  const lines = fileContent.split('\n');
  const emptyLines = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Remove XML tags: matches anything between < and >
    const textContent = line.replace(/<[^>]*>/g, '').trim();
    
    // If after removing XML there's no text content, add to array
    if (textContent === '') {
      emptyLines.push(lineNumber);
    }
  });

  return emptyLines;
}

function main() {
  console.log('Scanning FSB.xml for empty lines...');
  const emptyLines = findEmptyXmlLines();
  
  console.log(`Found ${emptyLines.length} lines with only XML markup.`);
  console.log(`Generating xml_content.js...`);
  
  // Create the JavaScript file with the empty lines array
  const jsContent = `// Auto-generated file containing line numbers with no text content (only XML markup)
// Generated: ${new Date().toISOString()}
// These lines should not display edit statuses in the dashboard

const emptyXmlLines = new Set(${JSON.stringify(emptyLines)});

// Check if a line has no text content
function isEmptyXmlLine(lineNumber) {
  return emptyXmlLines.has(lineNumber);
}
`;

  fs.writeFileSync(config.dashboard.xmlContent, jsContent, 'utf-8');
  
  console.log(`✓ Successfully wrote ${emptyLines.length} empty line numbers to xml_content.js`);
  console.log(`  Output file: ${config.dashboard.xmlContent}`);
  
  // Show first few and last few examples
  if (emptyLines.length > 0) {
    console.log(`\n  First 10 empty lines: ${emptyLines.slice(0, 10).join(', ')}`);
    if (emptyLines.length > 10) {
      console.log(`  Last 10 empty lines: ${emptyLines.slice(-10).join(', ')}`);
    }
  }
}

main();
