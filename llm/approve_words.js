#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'noun_gender_training_data.json');
const APPROVED_FILE = path.join(__dirname, 'approved.json');
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');

// Load existing approved and blacklisted entries as Map for easy lookup
function loadList(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const map = new Map();
      data.forEach(entry => {
        map.set(getEntryKey(entry), entry);
      });
      return map;
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return new Map();
}

// Save list to file in same format as source (array of objects)
function saveList(filePath, map) {
  try {
    const entries = Array.from(map.values());
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
  }
}

// Create a unique identifier for each entry
function getEntryKey(entry) {
  return `${entry.gender}:${entry.noun}`;
}

async function main() {
  try {
    // Load data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const approved = loadList(APPROVED_FILE);
    const blacklist = loadList(BLACKLIST_FILE);

    // Filter out already handled entries
    const unhandled = data.filter(entry => {
      const key = getEntryKey(entry);
      return !approved.has(key) && !blacklist.has(key);
    });

    if (unhandled.length === 0) {
      console.log('All entries have been processed!');
      console.log(`Approved: ${approved.size}, Blacklisted: ${blacklist.size}`);
      process.exit(0);
    }

    console.log(`\nProcessing ${unhandled.length} unhandled entries...`);
    console.log(`Already approved: ${approved.size}, Blacklisted: ${blacklist.size}\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let currentIndex = 0;

    const processEntry = () => {
      if (currentIndex >= unhandled.length) {
        console.log('\n✓ All entries processed!');
        console.log(`Total approved: ${approved.size}, Total blacklisted: ${blacklist.size}`);
        rl.close();
        process.exit(0);
      }

      const entry = unhandled[currentIndex];
      const key = getEntryKey(entry);

      console.log(`\n[${currentIndex + 1}/${unhandled.length}] ${entry.gender} ${entry.noun} (count: ${entry.count})`);
      rl.question('Approve (a) or Blacklist (b)? ', (answer) => {
        answer = answer.toLowerCase().trim();

       if (answer === 'a') {
          approved.set(key, entry);
          console.log('✓ Approved');
        } else if (answer === 'b') {
          blacklist.set(key, entry);
          console.log('✗ Blacklisted');
        } else {
          console.log('Invalid input. Please enter "a" or "b".');
          processEntry();
          return;
        }

        // Save immediately
        saveList(APPROVED_FILE, approved);
        saveList(BLACKLIST_FILE, blacklist);

        currentIndex++;
        processEntry();
      });
    };

    processEntry();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
