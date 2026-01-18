const fs = require('fs');
const config = require('../config.js');

const uncheckedPath = config.data.changes.replacementsUnchecked;
const checkedPath = config.data.changes.replacementsChecked;

// Read both files
const unchecked = JSON.parse(fs.readFileSync(uncheckedPath, 'utf-8'));
const checked = JSON.parse(fs.readFileSync(checkedPath, 'utf-8'));

// Create a set of checked items for quick lookup
// Using JSON stringified objects as keys
const checkedSet = new Set(checked.map(item => 
  JSON.stringify({ old: item.old, new: item.new, line: item.line })
));

// Find items in unchecked that are not in checked
const missing = unchecked.filter(item => 
  !checkedSet.has(JSON.stringify({ old: item.old, new: item.new, line: item.line }))
);

// Display results
console.log(`Total items in unchecked: ${unchecked.length}`);
console.log(`Total items in checked: ${checked.length}`);
console.log(`Missing items: ${missing.length}`);
console.log('');

if (missing.length > 0) {
  console.log('Missing replacements:');
  console.log('====================');
  missing.forEach((item, index) => {
    console.log(`\n${index + 1}. Line ${item.line}`);
    console.log(`   Old: ${item.old.substring(0, 80)}${item.old.length > 80 ? '...' : ''}`);
    console.log(`   New: ${item.new.substring(0, 80)}${item.new.length > 80 ? '...' : ''}`);
  });
} else {
  console.log('✓ All unchecked replacements are present in checked!');
}
