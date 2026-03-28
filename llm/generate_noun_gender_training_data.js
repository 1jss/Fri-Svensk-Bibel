const fs = require('fs');
const path = require('path');
const config = require('../config.js');

const fsbXmlPath = config.data.bibles.fsbXml;
const outputPath = path.join(__dirname, 'noun_gender_training_data.json');

function main() {
    generateTrainingData();
}

function generateTrainingData() {
    console.log('Reading FSB.xml...');
    const xml = fs.readFileSync(fsbXmlPath, 'utf8');

    // Strip XML tags
    const text = xml.replace(/<[^>]*>/g, ' ');

    // Extract noun-gender pairs using regex patterns
    // Pattern: (en|ett) followed by a single lowercase word (case-insensitive article matching)
    const nounGenderMap = new Map();

    // Match patterns like "en bok" or "ett hus" (case-insensitive for article)
    const pattern = /\b(en|ett)\s+([a-zåäö]+)\b/gi;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        const article = match[1].toLowerCase();
        const noun = match[2].toLowerCase();

        // Skip nouns that start with uppercase in the original match
        // Check if the noun character at index 0 was uppercase before lowercasing
        if (match[2][0] !== match[2][0].toLowerCase()) {
            continue; // Skip proper nouns (original uppercase)
        }

        // Create a unique key combining gender and noun
        const key = `${article}:${noun}`;

        if (nounGenderMap.has(key)) {
            nounGenderMap.set(key, nounGenderMap.get(key) + 1);
        } else {
            nounGenderMap.set(key, 1);
        }
    }

    // Process and filter the data
    const trainingData = processNounData(nounGenderMap);

    // Sort by count descending for better readability
    trainingData.sort((a, b) => b.count - a.count);

    // Save to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(trainingData, null, 2));

    console.log(`Training data generated successfully!`);
    console.log(`Total unique noun-gender pairs: ${trainingData.length}`);
    console.log(`Output saved to: ${outputPath}`);

    // Show some statistics
    const enCount = trainingData.filter(item => item.gender === 'en').length;
    const ettCount = trainingData.filter(item => item.gender === 'ett').length;
    console.log(`En nouns: ${enCount}`);
    console.log(`Ett nouns: ${ettCount}`);
}

function processNounData(nounGenderMap) {
    const trainingData = [];

    for (const [key, count] of nounGenderMap.entries()) {
        // Filter: only include nouns with count >= 2
        if (count >= 2) {
            const [gender, noun] = key.split(':');
            trainingData.push({
                gender: gender,
                noun: noun,
                count: count
            });
        }
    }

    return trainingData;
}

main();
