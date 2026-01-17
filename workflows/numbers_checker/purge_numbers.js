const fs = require('fs');
const config = require('../../config.js');

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

// Read the replacements file
const replacementsPath = config.data.changes.numberReplacements;
let replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));

console.log(`Starting with ${replacements.length} replacements`);
if (dryRun) console.log('Running in DRY RUN mode\n');

// Helper function to extract all numbers from text
function extractNumbers(text) {
    const matches = text.match(/\d+/g);
    return matches ? matches.map(Number) : [];
}

// Helper function to count words
function countWords(text) {
    return text.trim().split(/\s+/).length;
}

// Filter the replacements
const filtered = replacements.filter((rep) => {
    const newNumbers = extractNumbers(rep.new);
    const oldWordCount = countWords(rep.old);
    const newWordCount = countWords(rep.new);

    // Reason for filtering (if applicable)
    let filterReason = null;

    // Check condition 1: All numbers in new are below 10
    if (newNumbers.length > 0 && newNumbers.every(num => num < 10)) {
        filterReason = 'all numbers below 10';
    }

    // Check condition 2: No numbers in new
    if (newNumbers.length === 0) {
        filterReason = filterReason || 'no numbers in new';
    }

    // Check condition 3: More words in new than old
    if (newWordCount > oldWordCount) {
        filterReason = filterReason || 'more words in new than old';
    }

    if (filterReason) {
        if (dryRun) {
            console.log(`❌ REMOVE (${filterReason})`);
            console.log(`   Old: "${rep.old}"`);
            console.log(`   New: "${rep.new}"`);
            console.log(`   Numbers: ${newNumbers.join(', ') || 'none'} | Words: old=${oldWordCount}, new=${newWordCount}\n`);
        }
        return false; // Filter this out
    }

    return true; // Keep this replacement
});

console.log(`\nFiltered down to ${filtered.length} replacements`);
console.log(`Removed ${replacements.length - filtered.length} entries\n`);

if (!dryRun) {
    fs.writeFileSync(replacementsPath, JSON.stringify(filtered, null, 2));
    console.log('✓ Replacements file updated successfully.');
} else {
    console.log('DRY RUN complete - no changes made.');
}