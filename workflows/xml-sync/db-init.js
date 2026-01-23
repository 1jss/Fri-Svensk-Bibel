#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const config = require('../../config.js');

// Configuration
const DB_PATH = config.database.fsb;

// Initialize database and create schema
function initDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

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
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        });
      });
    });
  });
}

// Main execution
async function main() {
  console.log('FSB Database Initialization Script');
  console.log('==================================\n');

  try {
    console.log(`Creating database at: ${DB_PATH}`);

    // Check if database already exists
    const dbExists = fs.existsSync(DB_PATH);
    if (dbExists) {
      console.log('✓ Database file already exists\n');
    }

    // Initialize database and create schema
    const db = await initDatabase(DB_PATH);

    // Verify table was created
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='verses'", (err, rows) => {
      if (err) {
        console.error('Error verifying table:', err);
        process.exit(1);
      }

      if (rows && rows.length > 0) {
        console.log('✓ Verses table created successfully');

        // Get row count
        db.get('SELECT COUNT(*) as count FROM verses', (err, row) => {
          if (err) {
            console.error('Error querying table:', err);
          } else {
            console.log(`✓ Current verse count: ${row.count}\n`);
          }

          db.close((err) => {
            if (err) console.error('Error closing database:', err);
            console.log('✓ Database initialization complete!');
            console.log('\nNext steps:');
            console.log('  1. Run: node import-xml.js');
            console.log('  2. Open PHP interface at: http://localhost:8000/web/next/index.php');
            console.log('  3. Approve verses via web interface');
            console.log('  4. Run: node export-xml.js (to save approved verses to FSB.xml)');
          });
        });
      } else {
        console.error('Error: verses table was not created');
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
