const fs = require('fs');
const path = require('path');
const config = require('../config.js');

const analysisDir = config.folders.analysisDir;
const wordStatsPath = path.join(analysisDir, 'word_stats.json');

const wordStats = JSON.parse(fs.readFileSync(wordStatsPath, 'utf8'));

const singleUseWords = wordStats
    .filter(item => item.count === 1)
    .map(item => item.word);

console.log(singleUseWords.join('\n'));
