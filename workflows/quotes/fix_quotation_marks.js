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
  
  console.log(`Reading from:\n  1917: ${path1917}\n  FSB: ${pathFSB}\n`);
  
  const lines1917 = fs.readFileSync(path1917, 'utf8').split('\n');
  const linesFSB = fs.readFileSync(pathFSB, 'utf8').split('\n');
  
  console.log(`Files loaded. Processing ${linesFSB.length} lines...\n`);
  
  // Process and fix FSB lines
  const fixedLinesFSB = [];
  let fixCount1 = 0; // Removed ending quote
  let fixCount2 = 0; // Replaced " with '
  let linesExamined = 0;
  let linesWithQuotes = 0;
  
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
    
    linesExamined++;
    
    // Count quotation marks in content only (without XML)
    const count1917Outer = countChar(line1917Content, '»');
    const count1917Inner = countChar(line1917Content, "'");
    
    let countFSBOuter = countChar(lineFSBContent, '"');
    let countFSBInner = countChar(lineFSBContent, "'");
    
    // Track lines with any quotes
    if (countFSBOuter > 0 || countFSBInner > 0 || count1917Outer > 0 || count1917Inner > 0) {
      linesWithQuotes++;
    }
    
    // Case 1: FSB has ending quote but 1917 does not - Remove ending quote in FSB
    // Check if FSB CONTENT ends with " but 1917 CONTENT does NOT end with »
    const fsbContentTrimmed = lineFSBContent.trimEnd();
    const line1917ContentTrimmed = line1917Content.trimEnd();
    
    if (fsbContentTrimmed.endsWith('"') && !line1917ContentTrimmed.endsWith('»')) {
      // Remove the trailing " from FSB content
      const modifiedContent = fsbContentTrimmed.slice(0, -1);
      lineFSB = replaceContentInXML(lineFSB, modifiedContent);
      fixCount1++;
    }
    
    // Case 1b: Opposite - 1917 has ending » but FSB does not - Add ending quote to FSB
    else if (line1917ContentTrimmed.endsWith('»') && !fsbContentTrimmed.endsWith('"')) {
      // Add the trailing " to FSB content
      const modifiedContent = fsbContentTrimmed + '"';
      lineFSB = replaceContentInXML(lineFSB, modifiedContent);
      fixCount1++;
    }
    
    // Case 1c: 1917 ends with ' but FSB does not - Add ending ' to FSB
    else if (line1917ContentTrimmed.endsWith("'") && !fsbContentTrimmed.endsWith("'")) {
      // Add the trailing ' to FSB content
      const modifiedContent = fsbContentTrimmed + "'";
      lineFSB = replaceContentInXML(lineFSB, modifiedContent);
      fixCount1++;
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
  console.log(`✓ Processed ${linesExamined} non-empty lines`);
  console.log(`✓ Found ${linesWithQuotes} lines with quotation marks`);
  console.log(`✓ Applied ${fixCount1} fixes (case 1: removed ending quote)`);
  console.log(`✓ Applied ${fixCount2} fixes (case 2: replaced " with ')`);
  console.log(`✓ Total: ${fixCount1 + fixCount2} fixes`);
  console.log(`✓ File written to: ${pathFSB}`);
}

/**
 * Replace content in a line while preserving XML tags
 * @param {string} line - The full line with XML tags
 * @param {string} newContent - The new content without XML tags
 * @returns {string} - The line with XML tags and new content
 */
function replaceContentInXML(line, newContent) {
  // Extract all XML tags and text parts
  const parts = [];
  let lastIndex = 0;
  const tagRegex = /<[^>]*>/g;
  let match;
  
  while ((match = tagRegex.exec(line)) !== null) {
    // Add text before tag
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }
    // Add tag
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }
  
  // Rebuild line by replacing text parts while keeping XML tags
  let result = '';
  let contentIndex = 0;
  const originalContent = stripXML(line);
  
  for (const part of parts) {
    if (part.startsWith('<')) {
      // It's an XML tag, keep it as is
      result += part;
    } else {
      // It's content, replace with newContent at the appropriate position
      // Match character by character from the original content
      let charCount = 0;
      for (const char of part) {
        if (contentIndex < newContent.length) {
          result += newContent[contentIndex];
          contentIndex++;
        }
        charCount++;
      }
    }
  }
  
  return result;
}

/**
 * Strip XML tags from a string
 * @param {string} str - The string to clean
 * @returns {string} - The string without XML tags
 */
function stripXML(str) {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Count occurrences of a character in a string
 * @param {string} str - The string to search in
 * @param {string} char - The character to count
 * @returns {number} - The count of the character
 */
function countChar(str, char) {
  return (str.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

// Run the main function
compareQuotationMarks();