#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('../../config.js');

// Configuration
const XML_FSB_PATH = config.data.bibles.fsbXml;
const DB_PATH = config.database.fsb;
const EDITS_JS_PATH = config.dashboard.edits;

// Get all approved verses from database (status 1 = newly approved)
function getApprovedVerses(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM verses WHERE approved = 1 ORDER BY xml_line_number', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Update status of exported verses from 1 to 2 (single batch query)
function updateExportedStatus(db, approvedVerses) {
  return new Promise((resolve, reject) => {
    if (approvedVerses.length === 0) {
      resolve();
      return;
    }
    
    db.run('UPDATE verses SET approved = 2 WHERE approved = 1', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Update XML file using line numbers
function updateXMLWithVerses(filePath, approvedVerses) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  let updated = 0;
  const updatedLines = [];
  
  // Update lines based on xml_line_number
  approvedVerses.forEach(v => {
    if (v.xml_line_number && v.xml_line_number > 0 && v.xml_line_number <= lines.length) {
      const lineIndex = v.xml_line_number - 1; // Convert 1-based to 0-based
      const line = lines[lineIndex];
      
      // Replace verse text on this line
      const updatedLine = line.replace(
        /<VERS\s+vnumber="(\d+)"[^>]*>([^<]*)<\/VERS>/,
        `<VERS vnumber="${v.vnumber}">${v.text_fsb}</VERS>`
      );
      
      if (updatedLine !== line) {
        lines[lineIndex] = updatedLine;
        updated++;
        updatedLines.push(v.xml_line_number);
      }
    }
  });
  
  return { updatedContent: lines.join('\n'), updatedCount: updated, updatedLines };
}

// Record manual edits to edits.js
function recordEdits(approvedVerses, updatedLines) {
  let edits = [];
  
  // Read existing edits if file exists
  if (fs.existsSync(EDITS_JS_PATH)) {
    const fileContent = fs.readFileSync(EDITS_JS_PATH, 'utf-8');
    // Extract JSON array from "const edits = [...]"
    const match = fileContent.match(/const edits = \[([\s\S]*)\];/);
    if (match) {
      try {
        edits = JSON.parse('[' + match[1] + ']');
      } catch (e) {
        console.warn('Warning: Could not parse existing edits.js, starting fresh');
        edits = [];
      }
    }
  }
  
  const timestamp = new Date().toISOString();
  const updatedLinesSet = new Set(updatedLines);
  
  // Add one entry per line for MANUAL_APPROVED and MANUAL_EDITED
  if (approvedVerses.length > 0) {
    approvedVerses.forEach(v => {
      if (v.xml_line_number && v.xml_line_number > 0) {
        const lineNum = v.xml_line_number;
        
        // Add MANUAL_EDITED if this line was actually changed
        if (updatedLinesSet.has(lineNum)) {
          edits.unshift({
            startLine: lineNum,
            endLine: lineNum,
            status: 'MANUAL_EDITED',
            timestamp: timestamp
          });
        }
        
        // Add MANUAL_APPROVED for every approved line
        edits.unshift({
          startLine: lineNum,
          endLine: lineNum,
          status: 'MANUAL_APPROVED',
          timestamp: timestamp
        });
      }
    });
  }
  
  // Write edits back to file
  const editsContent = 'const edits = ' + JSON.stringify(edits, null, 2) + ';\n';
  fs.writeFileSync(EDITS_JS_PATH, editsContent);
}




// Main execution
async function main() {
  console.log('FSB XML Export Script');
  console.log('====================\n');
  
  try {
    // Check if files exist
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }
    if (!fs.existsSync(XML_FSB_PATH)) {
      throw new Error(`FSB XML file not found: ${XML_FSB_PATH}`);
    }
    
    console.log('✓ Files found');
    console.log(`  Database: ${DB_PATH}`);
    console.log(`  FSB XML:  ${XML_FSB_PATH}\n`);
    
    // Connect to database
    const db = new sqlite3.Database(DB_PATH);
    
    // Get approved verses
    console.log('Fetching approved verses from database...');
    const approvedVerses = await getApprovedVerses(db);
    console.log(`✓ Found ${approvedVerses.length} approved verses\n`);
    
    if (approvedVerses.length === 0) {
      console.log('No approved verses to export. Exiting.');
      db.close();
      return;
    }
    
    // Update XML with approved verses
    console.log('Updating verses in XML...');
    const { updatedContent, updatedCount, updatedLines } = updateXMLWithVerses(XML_FSB_PATH, approvedVerses);
    console.log(`✓ Updated ${updatedCount} verses in XML\n`);
    
    // Write updated XML to file
    console.log('Writing updated XML to file...');
    fs.writeFileSync(XML_FSB_PATH, updatedContent);
    console.log(`✓ Updated FSB.xml written\n`);
    
    // Update status of exported verses from 1 to 2
    console.log('Updating verse status in database...');
    await updateExportedStatus(db, approvedVerses);
    console.log(`✓ Updated status for ${approvedVerses.length} verses (1 → 2)\n`);
    
    // Record edits to edits.js
    console.log('Recording edits...');
    recordEdits(approvedVerses, updatedLines);
    console.log(`✓ Recorded ${approvedVerses.length} manual approvals (${updatedCount} changed)\n`);
    
    // Close database
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      console.log('✓ Export complete!');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
