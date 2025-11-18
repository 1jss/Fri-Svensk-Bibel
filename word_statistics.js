const fs = require('fs');

const xml = fs.readFileSync('FSB.xml', 'utf8');

const text = xml.replace(/<[^>]*>/g, ' ');

const words = text.split(/\s+/).filter(w => w.length > 0);

const countMap = new Map();

for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-zåäö]/g, '');
    if (lower && lower.length > 1) {
        countMap.set(lower, (countMap.get(lower) || 0) + 1);
    }
}

const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).map(([word, count]) => ({ word, count }));

fs.writeFileSync('word_stats.json', JSON.stringify(sorted, null, 2));