#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('../../config.js');

// Configuration
const XML_FSB_PATH = config.data.bibles.fsbXml;
const DB_PATH = config.database.fsb;

// Get all approved verses from database
function getApprovedVerses(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM verses WHERE approved > 0 ORDER BY xml_line_number', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Update XML file using line numbers
function updateXMLWithVerses(filePath, approvedVerses) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  let updated = 0;
  
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
      }
    }
  });
  
  return { updatedContent: lines.join('\n'), updatedCount: updated };
}

// Backup existing XML file
function backupXML(filePath) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const backupPath = `${filePath}.backup.${timestamp}`;
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  
  return null;
}

// Backup existing XML file
function backupXML(filePath) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const backupPath = `${filePath}.backup.${timestamp}`;
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  
  return null;
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
    const { updatedContent, updatedCount } = updateXMLWithVerses(XML_FSB_PATH, approvedVerses);
    console.log(`✓ Updated ${updatedCount} verses in XML\n`);
    
    // Backup original XML
    console.log('Creating backup...');
    const backupPath = backupXML(XML_FSB_PATH);
    if (backupPath) {
      console.log(`✓ Backup created: ${backupPath}\n`);
    }
    
    // Write updated XML to file
    console.log('Writing updated XML to file...');
    fs.writeFileSync(XML_FSB_PATH, updatedContent);
    console.log(`✓ Updated FSB.xml written\n`);
    
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
