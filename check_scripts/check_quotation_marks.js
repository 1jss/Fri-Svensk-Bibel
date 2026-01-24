const fs = require('fs');
const readline = require('readline');
const path = require('path');
const config = require('../config');

/**
 * Compare quotation marks between 1917 and FSB
 * 1917 uses » for outer quotes, FSB uses "
 * Both use ' for inner quotes
 * Checks that the counts match for each line
 */
async function compareQuotationMarks() {
  const path1917 = config.data.bibles.xml1917;
  const pathFSB = config.data.bibles.fsbXml;
  const outputDir = config.folders.checksDir;
  
  const mismatches = [];
  let lineNumber = 0;
  
  // Create read streams
  const stream1917 = fs.createReadStream(path1917, 'utf8');
  const streamFSB = fs.createReadStream(pathFSB, 'utf8');
  
  // Create readline interfaces
  const reader1917 = readline.createInterface({
    input: stream1917,
    crlfDelay: Infinity
  });
  
  const readerFSB = readline.createInterface({
    input: streamFSB,
    crlfDelay: Infinity
  });
  
  // Read both files line by line
  const lines1917 = [];
  const linesFSB = [];
  
  for await (const line of reader1917) {
    lines1917.push(line);
  }
  
  for await (const line of readerFSB) {
    linesFSB.push(line);
  }
  
  // Compare line by line
  const maxLines = Math.max(lines1917.length, linesFSB.length);
  
  for (let i = 0; i < maxLines; i++) {
    lineNumber = i + 1;
    
    const line1917 = lines1917[i] || '';
    const lineFSB = linesFSB[i] || '';
    
    // Count quotation marks
    const count1917Outer = countChar(line1917, '»');
    const count1917Inner = countChar(line1917, "'");
    
    const countFSBOuter = countChar(lineFSB, '"');
    const countFSBInner = countChar(lineFSB, "'");
    
    // Check if counts match
    // 1917 outer (») should equal FSB outer (")
    // Both should have same inner quotes (')
    if (count1917Outer !== countFSBOuter || count1917Inner !== countFSBInner) {
      mismatches.push({
        line: lineNumber,
        1917: { outer: count1917Outer, inner: count1917Inner },
        FSB: { outer: countFSBOuter, inner: countFSBInner },
        line1917Text: line1917.substring(0, 100),
        lineFSBText: lineFSB.substring(0, 100),
      });
    }
  }
  
  if (mismatches.length === 0) {
    console.log(`✓ All ${lines1917.length} lines have matching quotation mark counts`);
    return;
  }
  
  // Output the mismatches
  console.log(`\n⚠ Found ${mismatches.length} lines with quotation mark mismatches:\n`);
  
  mismatches.slice(0, 20).forEach(mismatch => {
    console.log(`Line ${mismatch.line}:`);
    console.log(`  1917: » = ${mismatch[1917].outer}, ' = ${mismatch[1917].inner}`);
    console.log(`  FSB:  " = ${mismatch.FSB.outer}, ' = ${mismatch.FSB.inner}`);
  });
  
  if (mismatches.length > 20) {
    console.log(`\n... and ${mismatches.length - 20} more mismatches`);
  }
  
  // Save mismatch line numbers to a file
  const outputPath = path.join(outputDir, 'quote_mark_mismatches.txt');
  const lineNumbers = mismatches.map(m => m.line).join('\n');
  
  fs.writeFileSync(outputPath, lineNumbers + '\n', 'utf8');
  
  // Also save detailed report
  const reportPath = path.join(outputDir, 'quote_mark_mismatches_detailed.json');
  fs.writeFileSync(reportPath, JSON.stringify(mismatches, null, 2), 'utf8');
  
  console.log(`\n✓ Mismatch line numbers saved to ${outputPath}`);
  console.log(`✓ Detailed report saved to ${reportPath}`);
  console.log(`✓ Total mismatches: ${mismatches.length}/${lines1917.length}`);
}

/**
 * Count occurrences of a character in a string
 * @param {string} str - The string to search
 * @param {string} char - The character to count
 * @returns {number} - The count
 */
function countChar(str, char) {
  return (str.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

compareQuotationMarks().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
