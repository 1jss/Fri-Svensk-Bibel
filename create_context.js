// How to use:
// node create_context.js <startLine> <numLines>
// Example: node create_context.js 100 50
// This will extract 50 lines starting from line 100 of FSB.xml and write them to temp_context.xml

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
fs.readFile(largeFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Split into lines
  const lines = data.split('\n');

  // Extract lines from startLine - 1 (since array is 0-indexed) to startLine - 1 + numLines
  const extractedLines = lines.slice(startLine - 1, startLine - 1 + numLines);

  // Join back into a string
  const contextContent = extractedLines.join('\n');

  // Write to temporary file (overwrites if exists)
  fs.writeFile(tempFilePath, contextContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log(`Temporary context file created: ${tempFilePath}`);
    console.log(`Extracted lines ${startLine} to ${startLine + numLines - 1}`);
  });
});