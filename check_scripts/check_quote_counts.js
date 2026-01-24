const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Check replacements_unchecked for quote count mismatches
 * Compares single quotes (') and double quotes (") between old and new
 */
function checkQuoteCounts() {
  const replacementsPath = config.data.changes.replacementsUnchecked;
  const outputDir = config.folders.checksDir;
  
  // Read the replacements file
  const content = fs.readFileSync(replacementsPath, 'utf8');
  
  let replacements;
  try {
    replacements = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse replacements file:', e.message);
    process.exit(1);
  }
  
  if (!Array.isArray(replacements) || replacements.length === 0) {
    console.log('No replacements to check');
    return;
  }
  
  const mismatches = [];
  
  replacements.forEach((replacement, index) => {
    const { old, new: newText, line } = replacement;
    
    if (!old || !newText) {
      return; // Skip if either field is missing
    }
    
    // Count single quotes and double quotes
    const oldSingleQuotes = countChar(old, "'");
    const oldDoubleQuotes = countChar(old, '"');
    const newSingleQuotes = countChar(newText, "'");
    const newDoubleQuotes = countChar(newText, '"');
    
    // Check if counts match
    if (oldSingleQuotes !== newSingleQuotes || oldDoubleQuotes !== newDoubleQuotes) {
      mismatches.push({
        line,
        index,
        oldQuotes: { single: oldSingleQuotes, double: oldDoubleQuotes },
        newQuotes: { single: newSingleQuotes, double: newDoubleQuotes },
        old: old.substring(0, 100),
        new: newText.substring(0, 100),
      });
    }
  });
  
  if (mismatches.length === 0) {
    console.log(`✓ All ${replacements.length} replacements have matching quote counts`);
    return;
  }
  
  // Output the mismatches
  console.log(`\n⚠ Found ${mismatches.length} replacements with quote count mismatches:\n`);
  
  mismatches.slice(0, 20).forEach(mismatch => {
    console.log(`Line ${mismatch.line} (index ${mismatch.index}):`);
    console.log(`  Old:  ' = ${mismatch.oldQuotes.single}, " = ${mismatch.oldQuotes.double}`);
    console.log(`  New:  ' = ${mismatch.newQuotes.single}, " = ${mismatch.newQuotes.double}`);
  });
  
  if (mismatches.length > 20) {
    console.log(`\n... and ${mismatches.length - 20} more mismatches`);
  }
  
  // Save detailed report
  const detailedPath = path.join(outputDir, 'replacements_quote_mismatches_detailed.json');
  fs.writeFileSync(detailedPath, JSON.stringify(mismatches, null, 2), 'utf8');
  
  console.log(`\n✓ Detailed report saved to ${detailedPath}`);
  console.log(`✓ Total mismatches: ${mismatches.length}/${replacements.length}`);
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

checkQuoteCounts();
