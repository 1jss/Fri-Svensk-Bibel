const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('../config.js');

const analysisDir = config.folders.analysisDir;
const fsbXmlPath = config.data.bibles.fsbXml;
const wordStatsPath = path.join(analysisDir, 'word_stats.json');
const wordStatsOldPath = path.join(analysisDir, 'word_stats_old.json');
const reportPath = path.join(analysisDir, 'word_analysis_report.txt');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function main() {
    if (fs.existsSync(wordStatsPath)) {
        rl.question('Do you want to start a new comparison or continue comparing? (new/continue): ', (answer) => {
            if (answer.toLowerCase().startsWith('n')) {
                fs.writeFileSync(wordStatsOldPath, fs.readFileSync(wordStatsPath));
            }
            generateAndAnalyze();
            rl.close();
        });
    } else {
        generateAndAnalyze();
    }
}

function generateAndAnalyze() {
    const xml = fs.readFileSync(fsbXmlPath, 'utf8');

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

    // Load old stats from word_stats_old.json if exists
    let oldStats = null;
    if (fs.existsSync(wordStatsOldPath)) {
        oldStats = JSON.parse(fs.readFileSync(wordStatsOldPath, 'utf8'));
    }

    fs.writeFileSync(wordStatsPath, JSON.stringify(sorted, null, 2));

    // Now perform analysis
    analyzeWordStatistics(sorted, oldStats);
}

function analyzeWordStatistics(wordStats, oldStats) {
    let log = '=== Word Statistics Analysis ===\n\n';
    
    // Basic statistics
    const totalWords = wordStats.length;
    const totalOccurrences = wordStats.reduce((sum, item) => sum + item.count, 0);
    
    log += `Total unique words: ${totalWords.toLocaleString()}\n`;
    log += `Total word occurrences: ${totalOccurrences.toLocaleString()}\n`;
    log += `Average occurrences per word: ${(totalOccurrences / totalWords).toFixed(2)}\n`;
    
    // Diff with old stats
    if (oldStats) {
        const oldWordsSet = new Set(oldStats.map(item => item.word));
        const newWordsSet = new Set(wordStats.map(item => item.word));
        const newWords = wordStats.filter(item => !oldWordsSet.has(item.word));
        const removedWords = oldStats.filter(item => !newWordsSet.has(item.word));
        log += `\nNew unique words since last run: ${newWords.length.toLocaleString()}\n`;
        if (newWords.length > 0) {
            log += 'All new words:\n';
            newWords.forEach((item, index) => {
                log += `  ${index + 1}. "${item.word}" (${item.count} times)\n`;
            });
        }
        log += `\nRemoved unique words since last run: ${removedWords.length.toLocaleString()}\n`;
        if (removedWords.length > 0) {
            log += 'All removed words:\n';
            removedWords.forEach((item, index) => {
                log += `  ${index + 1}. "${item.word}" (${item.count} times)\n`;
            });
        }
    }
    
    // Find single-use words (hapax legomena)
    const singleUseWords = wordStats.filter(item => item.count === 1);
    log += `\nSingle-use words (hapax legomena): ${singleUseWords.length.toLocaleString()} (${((singleUseWords.length / totalWords) * 100).toFixed(2)}% of unique words)\n`;
    
    // Find words used 2-5 times
    const rareWords = wordStats.filter(item => item.count >= 2 && item.count <= 5);
    log += `Words used 2-5 times: ${rareWords.length.toLocaleString()} (${((rareWords.length / totalWords) * 100).toFixed(2)}% of unique words)\n`;
    
    // Find common words (top 100)
    const topN = 100;
    const topWords = wordStats.slice(0, topN);
    const topWordsOccurrences = topWords.reduce((sum, item) => sum + item.count, 0);
    
    log += `\nTop ${topN} words cover: ${topWordsOccurrences.toLocaleString()} occurrences\n`;
    log += `That's ${((topWordsOccurrences / totalOccurrences) * 100).toFixed(2)}% of all word occurrences\n`;
    
    // Find words used 100+ times
    const frequentWords = wordStats.filter(item => item.count >= 100);
    log += `\nWords used 100+ times: ${frequentWords.length.toLocaleString()}\n`;
    
    // Find words used 10+ times
    const moderatelyUsedWords = wordStats.filter(item => item.count >= 10);
    log += `Words used 10+ times: ${moderatelyUsedWords.length.toLocaleString()}\n`;
    
    // Calculate coverage metrics
    log += '\n=== Coverage Analysis ===\n';
    
    const coveragePercentages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99];
    for (const percentage of coveragePercentages) {
        const targetOccurrences = totalOccurrences * (percentage / 100);
        let cumulative = 0;
        let wordsNeeded = 0;
        
        for (const item of wordStats) {
            cumulative += item.count;
            wordsNeeded++;
            if (cumulative >= targetOccurrences) {
                log += `${percentage}% coverage: ${wordsNeeded.toLocaleString()} most common words\n`;
                break;
            }
        }
    }
    
    // Frequency distribution analysis
    log += '\n=== Frequency Distribution ===\n';
    const frequencyBuckets = [
        { range: '1 time', min: 1, max: 1 },
        { range: '2-5 times', min: 2, max: 5 },
        { range: '6-10 times', min: 6, max: 10 },
        { range: '11-50 times', min: 11, max: 50 },
        { range: '51-100 times', min: 51, max: 100 },
        { range: '101-500 times', min: 101, max: 500 },
        { range: '501-1000 times', min: 501, max: 1000 },
        { range: '1000+ times', min: 1001, max: Infinity }
    ];
    
    frequencyBuckets.forEach(bucket => {
        const count = wordStats.filter(item => item.count >= bucket.min && item.count <= bucket.max).length;
        const percentage = ((count / totalWords) * 100).toFixed(2);
        log += `${bucket.range}: ${count.toLocaleString()} words (${percentage}%)\n`;
    });
    
    // Word length analysis
    log += '\n=== Word Length Analysis ===\n';
    const lengthBuckets = [
        { range: '1-3 letters', min: 1, max: 3 },
        { range: '4-6 letters', min: 4, max: 6 },
        { range: '7-9 letters', min: 7, max: 9 },
        { range: '10-12 letters', min: 10, max: 12 },
        { range: '13+ letters', min: 13, max: Infinity }
    ];
    
    lengthBuckets.forEach(bucket => {
        const wordsInBucket = wordStats.filter(item => item.word.length >= bucket.min && item.word.length <= bucket.max);
        const count = wordsInBucket.length;
        const percentage = ((count / totalWords) * 100).toFixed(2);
        const avgFrequency = wordsInBucket.length > 0 ? (wordsInBucket.reduce((sum, item) => sum + item.count, 0) / wordsInBucket.length).toFixed(2) : '0';
        log += `${bucket.range}: ${count.toLocaleString()} words (${percentage}%), avg frequency: ${avgFrequency}\n`;
    });

    console.log(log);
    
    // Save the report
    saveReports(log);
}

function saveReports(log) {
    // Save the log output to a text file
    fs.writeFileSync(reportPath, log);
}

main();