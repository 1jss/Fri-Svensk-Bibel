const fs = require('fs');

const content = fs.readFileSync('diff.txt', 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');

const pairs = [];
for (let i = 0; i < lines.length; i += 2) {
  const old = lines[i].trim();
  const new_ = lines[i + 1] ? lines[i + 1].trim() : '';
  pairs.push({ old, new: new_ });
}

fs.writeFileSync('replacements.json', JSON.stringify(pairs, null, 2));
console.log('Replacements written to replacements.json');