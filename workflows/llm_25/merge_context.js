// How to use:
// node merge_context.js <startLine> <numLines>
// Example: node merge_context.js 100 50
// This will replace 50 lines starting from line 100 in FSB.xml with the content from temp_context.xml

const fs = require('fs');
const path = require('path');

// Path to the larger file
const largeFilePath = path.join(__dirname, 'FSB.xml');

// Path to the temporary context file
const tempFilePath = path.join(__dirname, 'temp_context.xml');

// Get command line arguments
const args = process.argv.slice(2);
const startLine = parseInt(args[0]) || 1; // Default to line 1
const numLines = parseInt(args[1]) || 100; // Default to 100 lines

// Read the large file
fs.readFile(largeFilePath, 'utf8', (err, largeData) => {
  if (err) {
    console.error('Error reading FSB.xml:', err);
    return;
  }

  // Read the temp context file
  fs.readFile(tempFilePath, 'utf8', (err, tempData) => {
    if (err) {
      console.error('Error reading temp_context.xml:', err);
      return;
    }

    // Split into lines
    const largeLines = largeData.split('\n');
    const tempLines = tempData.split('\n');

    // Calculate indices
    const startIndex = startLine - 1;
    const endIndex = startIndex + numLines;

    // Replace the lines
    const newLines = [
      ...largeLines.slice(0, startIndex),
      ...tempLines,
      ...largeLines.slice(endIndex)
    ];

    // Join back into a string
    const newContent = newLines.join('\n');

    // Write back to FSB.xml
    fs.writeFile(largeFilePath, newContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing FSB.xml:', err);
        return;
      }
      console.log(`FSB.xml updated: replaced lines ${startLine} to ${startLine + numLines - 1} with content from temp_context.xml`);
    });
  });
});