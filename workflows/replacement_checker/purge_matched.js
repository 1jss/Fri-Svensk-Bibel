const fs = require('fs');
const config = require('../../config.js');

// Read the files
const replacements = JSON.parse(fs.readFileSync(config.data.changes.replacementsUnchecked, 'utf8'));
const xmlLines = fs.readFileSync(config.data.bibles.fsbXml, 'utf8').split('\n');

// Track removed and kept replacements
const removed = [];
const kept = [];

for (const rep of replacements) {
    // Line numbers in JSON are 1-indexed, but array is 0-indexed
    const lineIndex = rep.line - 1;
    
    if (lineIndex >= 0 && lineIndex < xmlLines.length) {
        const currentLineContent = xmlLines[lineIndex];
        
        // Check if the current content already matches the "new" value
        if (currentLineContent.includes(rep.new)) {
            removed.push(rep);
            console.log(`✓ Line ${rep.line}: Already changed (content matches "new")`);
        } else {
            kept.push(rep);
        }
    } else {
        // Line index out of bounds, keep the replacement
        kept.push(rep);
        console.log(`⚠ Line ${rep.line}: Out of bounds`);
    }
}

// Write the cleaned list back
fs.writeFileSync(config.data.changes.replacementsUnchecked, JSON.stringify(kept, null, 2));

console.log(`\n=== Summary ===`);
console.log(`Removed: ${removed.length} replacements (already changed)`);
console.log(`Kept: ${kept.length} replacements (still need to apply)`);
console.log(`Total: ${replacements.length} replacements`);
