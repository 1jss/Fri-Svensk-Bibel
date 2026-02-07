#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const config = require('../config.js');

// Configuration
const XML_1917_PATH = config.data.bibles.xml1917;
const XML_FSB_PATH = config.data.bibles.fsbXml;

// Extract vnumber from a line
function extractVnumber(line) {
  const match = line.match(/vnumber="(\d+)"/);
  return match ? parseInt(match[1]) : null;
}

// Check if line contains a VERS tag
function hasVersTag(line) {
  return /<VERS[^>]*>/.test(line);
}

// Main execution
function main() {
  console.log('XML Sync Checker');
  console.log('================\n');
  
  try {
    // Check if files exist
    if (!fs.existsSync(XML_1917_PATH)) {
      throw new Error(`1917 XML file not found: ${XML_1917_PATH}`);
    }
    if (!fs.existsSync(XML_FSB_PATH)) {
      throw new Error(`FSB XML file not found: ${XML_FSB_PATH}`);
    }
    
    console.log('✓ Files found');
    console.log(`  1917 XML: ${XML_1917_PATH}`);
    console.log(`  FSB XML:  ${XML_FSB_PATH}\n`);
    
    // Read files
    const content1917 = fs.readFileSync(XML_1917_PATH, 'utf-8');
    const contentFSB = fs.readFileSync(XML_FSB_PATH, 'utf-8');
    
    const lines1917 = content1917.split('\n');
    const linesFSB = contentFSB.split('\n');
    
    console.log(`✓ Loaded files`);
    console.log(`  1917 XML: ${lines1917.length} lines`);
    console.log(`  FSB XML:  ${linesFSB.length} lines\n`);
    
    // Compare line counts
    const maxLines = Math.max(lines1917.length, linesFSB.length);
    const minLines = Math.min(lines1917.length, linesFSB.length);
    
    if (lines1917.length !== linesFSB.length) {
      console.log(`⚠ File lengths differ: 1917=${lines1917.length}, FSB=${linesFSB.length}`);
    }
    
    // Check line by line
    console.log('Checking vnumber consistency...\n');
    
    let versCount = 0;
    let lineMatches = 0;
    let verseStatus = []; // Array of {status: 'correct'|'incorrect', line: number, data: {...}}
    
    for (let i = 0; i < maxLines; i++) {
      const line1917 = i < lines1917.length ? lines1917[i] : null;
      const lineFSB = i < linesFSB.length ? linesFSB[i] : null;
      
      const has1917 = line1917 && hasVersTag(line1917);
      const hasFSB = lineFSB && hasVersTag(lineFSB);
      
      // Skip lines without VERS tags
      if (!has1917 && !hasFSB) {
        continue;
      }
      
      versCount++;
      let isCorrect = false;
      let issueData = null;
      
      // Both have VERS tags
      if (has1917 && hasFSB) {
        const vn1917 = extractVnumber(line1917);
        const vnFSB = extractVnumber(lineFSB);
        
        if (vn1917 !== null && vnFSB !== null && vn1917 === vnFSB) {
          isCorrect = true;
          lineMatches++;
        } else if (vn1917 === null && vnFSB === null) {
          isCorrect = true;
          lineMatches++;
        } else if (vn1917 !== null && vnFSB !== null) {
          issueData = {
            type: 'vnumber_mismatch',
            vn1917,
            vnFSB
          };
        }
      } else if (has1917 && !hasFSB) {
        const vn1917 = extractVnumber(line1917);
        issueData = {
          type: 'missing_in_fsb',
          vnumber: vn1917
        };
      } else if (!has1917 && hasFSB) {
        const vnFSB = extractVnumber(lineFSB);
        issueData = {
          type: 'missing_in_1917',
          vnumber: vnFSB
        };
      }
      
      verseStatus.push({
        status: isCorrect ? 'correct' : 'incorrect',
        line: i + 1,
        data: issueData
      });
    }
    
    // Remove consecutive duplicates - keep only first of each sequence
    const filtered = [];
    let lastStatus = null;
    for (const item of verseStatus) {
      if (item.status !== lastStatus) {
        filtered.push(item);
        lastStatus = item.status;
      }
    }
    
    // Report results
    console.log(`✓ Checked ${versCount} verse lines\n`);
    
    if (lineMatches === versCount && lines1917.length === linesFSB.length) {
      console.log(`✅ All ${versCount} verses match perfectly!\n`);
    } else {
      console.log(`Results:`);
      console.log(`  Matching verses: ${lineMatches}/${versCount}\n`);
    }
    
    // Report status changes
    if (filtered.length > 1 || (filtered.length === 1 && filtered[0].status === 'incorrect')) {
      console.log(`Status changes:\n`);
      
      filtered.forEach((item) => {
        if (item.status === 'incorrect') {
          const issue = item.data;
          let statusStr = '';
          
          if (issue.type === 'vnumber_mismatch') {
            statusStr = `vnumber mismatch: 1917="${issue.vn1917}" vs FSB="${issue.vnFSB}"`;
          } else if (issue.type === 'missing_in_fsb') {
            statusStr = `missing in FSB (vnumber="${issue.vnumber}")`;
          } else if (issue.type === 'missing_in_1917') {
            statusStr = `missing in 1917 (vnumber="${issue.vnumber}")`;
          }
          
          console.log(`  ❌ Line ${item.line}: ${statusStr}`);
        } else {
          console.log(`  ✅ Line ${item.line}: correct`);
        }
      });
      console.log();
    }
    
    // Summary
    const incorrectCount = filtered.filter(item => item.status === 'incorrect').length;
    if (incorrectCount === 0 && lines1917.length === linesFSB.length) {
      console.log('✅ Files are perfectly in sync!\n');
    } else if (incorrectCount > 0) {
      console.log(`⚠ Found ${incorrectCount} issue sequence(s)\n`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
