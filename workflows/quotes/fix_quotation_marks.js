const fs = require('fs');
const path = require('path');
const config = require('../../config');

/**
 * Fix quotation mark errors in FSB by comparing with 1917
 * 1917 uses » for outer quotes, FSB uses "
 * Both use ' for inner quotes
 */
function compareQuotationMarks() {
  const path1917 = config.data.bibles.xml1917;
  const pathFSB = config.data.bibles.fsbXml;
  
  const lines1917 = fs.readFileSync(path1917, 'utf8').split('\n');
  const linesFSB = fs.readFileSync(pathFSB, 'utf8').split('\n');
  
  // Process and fix FSB lines
  const fixedLinesFSB = [];
  let fixCount1 = 0; // Removed ending quote
  let fixCount2 = 0; // Replaced " with '
  
  for (let i = 0; i < linesFSB.length; i++) {
    const line1917 = lines1917[i] || '';
    let lineFSB = linesFSB[i];
    
    // Strip XML tags for comparison and counting
    const line1917Content = stripXML(line1917);
    const lineFSBContent = stripXML(lineFSB);
    
    // Skip empty lines
    if (!lineFSBContent.trim()) {
      fixedLinesFSB.push(lineFSB);
      continue;
    }
    
    // Count quotation marks in content only (without XML)
    const count1917Outer = countChar(line1917Content, '»');
    const count1917Inner = countChar(line1917Content, "'");
    
    let countFSBOuter = countChar(lineFSBContent, '"');
    let countFSBInner = countChar(lineFSBContent, "'");
    
    // Case 1: FSB has ending quote but 1917 does not - Remove ending quote in FSB
    if (countFSBOuter === count1917Outer + 1 && countFSBInner === count1917Inner) {
      const line1917Trimmed = line1917.trimEnd();
      const lineFSBTrimmed = lineFSB.trimEnd();
      const lastChar1917 = line1917Trimmed.charAt(line1917Trimmed.length - 1);
      const lastCharFSB = lineFSBTrimmed.charAt(lineFSBTrimmed.length - 1);
      
      const isQuote1917 = lastChar1917 === '»' || lastChar1917 === "'";
      const isQuoteFSB = lastCharFSB === '"' || lastCharFSB === "'";
      
      if (isQuote1917 && !isQuoteFSB) {
        const contentLastQuoteIndex = lineFSBContent.trimEnd().lastIndexOf('"');
        if (contentLastQuoteIndex !== -1) {
          // Remove the last quote from content and rebuild line with XML
          const modifiedContent = lineFSBContent.trimEnd().slice(0, contentLastQuoteIndex) + lineFSBContent.trimEnd().slice(contentLastQuoteIndex + 1);
          lineFSB = replaceContentInXML(lineFSB, modifiedContent);
          fixCount1++;
        }
      }
    }
    
    // Case 2: FSB should use ' when 1917 uses ', but it uses " instead
    // Replace all " with ' in FSB
    countFSBOuter = countChar(lineFSBContent, '"');
    countFSBInner = countChar(lineFSBContent, "'");
    
    if (countFSBOuter > 0 && countFSBInner === 0 && count1917Outer === 0 && count1917Inner > 0) {
      if (countFSBOuter === count1917Inner) {
        const modifiedContent = lineFSBContent.replace(/"/g, "'");
        lineFSB = replaceContentInXML(lineFSB, modifiedContent);
        fixCount2++;
      }
    }
    
    fixedLinesFSB.push(lineFSB);
  }
  
  // Write the fixed FSB back to file
  fs.writeFileSync(pathFSB, fixedLinesFSB.join('\n'), 'utf8');
  console.log(`✓ Applied ${fixCount1} fixes (case 1: removed ending quote)`);
  console.log(`✓ Applied ${fixCount2} fixes (case 2: replaced " with ')`);
  console.log(`✓ Total: ${fixCount1 + fixCount2} fixes`);
}

/**
 * Replace content in a line while preserving XML tags
 * @param {string} line - The full line with XML tags
 * @param {string} newContent - The new content without XML tags
 * @returns {string} - The line with XML tags and new content
 */
function replaceContentInXML(line, newContent) {
  // Get the original content (without XML)
  const originalContent = stripXML(line);
  // Simple find and replace the original content with the new content
  return line.replace(originalContent, newContent);
}

/**
 * Strip XML tags from a string
 * @param {string} str - The string to clean
 * @returns {string} - The string without XML tags
 */
function stripXML(str) {
  return str.replace(/<[^>]*>/g, '');
}