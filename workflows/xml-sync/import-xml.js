#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('../../config.js');

// Configuration
const XML_1917_PATH = config.data.bibles.xml1917;
const XML_FSB_PATH = config.data.bibles.fsbXml;
const DB_PATH = config.database.fsb;

// Parse XML file line by line and extract verses with line numbers and 1917 text
function parseXMLWithReference(fsbFilePath, file1917Path) {
  const fsbContent = fs.readFileSync(fsbFilePath, 'utf-8');
  const fsbLines = fsbContent.split('\n');
  
  const file1917Content = fs.readFileSync(file1917Path, 'utf-8');
  const file1917Lines = file1917Content.split('\n');
  
  const verses = [];
  let currentBookNumber = null;
  let currentChapter = null;
  let lineNumber = 0;
  
  for (const line of fsbLines) {
    lineNumber++;
    
    // Track current book
    if (line.includes('<BIBLEBOOK')) {
      const bnumberMatch = line.match(/bnumber="(\d+)"/);
      if (bnumberMatch) {
        currentBookNumber = parseInt(bnumberMatch[1]);
      }
    }
    
    // Track current chapter
    if (line.includes('<CHAPTER')) {
      const cnumberMatch = line.match(/cnumber="(\d+)"/);
      if (cnumberMatch) {
        currentChapter = parseInt(cnumberMatch[1]);
      }
    }
    
    // Extract verses from FSB
    if (line.includes('<VERS')) {
      const vnumberMatch = line.match(/vnumber="(\d+)"/);
      const verseMatch = line.match(/<VERS[^>]*>([^<]*)<\/VERS>/);
      
      if (vnumberMatch && verseMatch) {
        const verseNumber = parseInt(vnumberMatch[1]);
        const fsbText = verseMatch[1].trim();
        
        // Get corresponding 1917 text from the same line number
        let text1917 = '';
        if (lineNumber > 0 && lineNumber <= file1917Lines.length) {
          const line1917 = file1917Lines[lineNumber - 1];
          const verse1917Match = line1917.match(/<VERS[^>]*>([^<]*)<\/VERS>/);
          if (verse1917Match) {
            text1917 = verse1917Match[1].trim();
          }
        }
        
        verses.push({
          bookNumber: currentBookNumber,
          chapter: currentChapter,
          verseNumber: verseNumber,
          text1917: text1917,
          textFsb: fsbText,
          xmlLineNumber: lineNumber
        });
      }
    }
  }
  
  return verses;
}

// Initialize database
function initDatabase(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS verses (
          id INTEGER PRIMARY KEY,
          bnumber INTEGER NOT NULL,
          cnumber INTEGER NOT NULL,
          vnumber INTEGER NOT NULL,
          xml_line_number INTEGER,
          text_1917 TEXT NOT NULL,
          text_fsb TEXT NOT NULL,
          approved INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(bnumber, cnumber, vnumber)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Insert or update verses in database
function insertVerses(db, verses) {
  return new Promise((resolve, reject) => {
    // First, get all approved verses (approved = 1 or 2) to skip them
    db.all('SELECT bnumber, cnumber, vnumber FROM verses WHERE approved IN (1, 2)', (err, approvedVerses) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create a set for quick lookup of approved verses to skip
      const skipVerses = new Set(approvedVerses.map(v => `${v.bnumber}:${v.cnumber}:${v.vnumber}`));
      
      // Filter out verses that are already approved (1 or 2)
      const versesToImport = verses.filter(v => {
        const key = `${v.bookNumber}:${v.chapter}:${v.verseNumber}`;
        return !skipVerses.has(key);
      });
      
      const stmt = db.prepare(`
        INSERT INTO verses (bnumber, cnumber, vnumber, xml_line_number, text_1917, text_fsb, approved)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(bnumber, cnumber, vnumber) DO UPDATE SET
          text_1917 = excluded.text_1917,
          text_fsb = CASE 
            WHEN excluded.text_fsb != text_fsb THEN excluded.text_fsb
            ELSE text_fsb
          END,
          approved = CASE 
            WHEN excluded.text_fsb != text_fsb THEN 0
            ELSE approved
          END,
          xml_line_number = excluded.xml_line_number,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      let processed = 0;
      
      versesToImport.forEach(v => {
        stmt.run(
          v.bookNumber,
          v.chapter,
          v.verseNumber,
          v.xmlLineNumber,
          v.text1917,
          v.textFsb,
          (err) => {
            if (err) {
              console.error(`Error inserting verse ${v.chapter}:${v.verseNumber}:`, err);
            }
            processed++;
            
            if (processed === versesToImport.length) {
              stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          }
        );
      });
      
      // Handle case where there are no verses to import
      if (versesToImport.length === 0) {
        resolve();
      }
    });
  });
}

// Main execution
async function main() {
  console.log('FSB XML Import Script');
  console.log('====================\n');
  
  try {
    // Check if files exist
    if (!fs.existsSync(XML_1917_PATH)) {
      throw new Error(`1917 XML file not found: ${XML_1917_PATH}`);
    }
    if (!fs.existsSync(XML_FSB_PATH)) {
      throw new Error(`FSB XML file not found: ${XML_FSB_PATH}`);
    }
    
    console.log('✓ XML files found');
    console.log(`  1917: ${XML_1917_PATH}`);
    console.log(`  FSB:  ${XML_FSB_PATH}\n`);
    
    // Parse XML files (FSB with 1917 reference)
    console.log('Parsing XML files...');
    const verses = parseXMLWithReference(XML_FSB_PATH, XML_1917_PATH);
    
    console.log(`✓ Parsed FSB XML: ${verses.length} verses\n`);
    
    // Initialize database
    console.log(`Initializing database: ${DB_PATH}`);
    const db = new sqlite3.Database(DB_PATH);
    
    await initDatabase(db);
    console.log('✓ Database schema initialized\n');
    
    // Insert verses
    console.log('Inserting verses into database...');
    const importedCount = await insertVerses(db, verses);
    console.log(`✓ Verses processed (approved 1 or 2 skipped)\n`);
    
    // Verify counts
    db.get('SELECT COUNT(*) as count FROM verses', (err, row) => {
      if (err) {
        console.error('Error querying database:', err);
      } else {
        console.log(`✓ Database now contains ${row.count} verses`);
      }
      
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        console.log('\n✓ Import complete!');
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
