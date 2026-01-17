const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function checkReplacements() {
  rl.question('>>> Are you content with the replacements? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      // Wait for user committing changes
      rl.question('>>> Commit your changes and press Enter when done: ', () => {
        // Loop back to new line number input
        askLineNumber();
      });
    } else {
      // Wait for user to edit replacements.json and revert changes
      rl.question('>>> Edit replacements.json and revert changes if needed, then press Enter: ', () => {
        // Run replace.js again
        execSync('node replace.js', { stdio: 'inherit' });
        // Check again
        checkReplacements();
      });
    }
  });
}

function askLineNumber() {
  rl.question('>>> Enter line number: ', (lineNumber) => {
    // Copy FSB.xml to FSB_pre.xml
    fs.copyFileSync('FSB.xml', 'FSB_pre.xml');
    
    // Run create_context.js with line number
    execSync(`node create_context.js ${lineNumber} 25`, { stdio: 'inherit' });
    
    // Wait for user edits in temp_context.xml
    rl.question('>>> Edit temp_context.xml and press Enter when done: ', () => {
      // Run merge_context.js with line number
      execSync(`node merge_context.js ${lineNumber} 25`, { stdio: 'inherit' });
      
      // Wait for user committing changes
      rl.question('>>> Commit your changes and press Enter when done: ', () => {
        // Run diff_finder.js
        execSync('node diff_finder.js', { stdio: 'inherit' });
        
        // Wait for user reviewing replacements.json
        rl.question('>>> Review replacements.json and press Enter when done: ', () => {
          // Run replace.js
          execSync('node replace.js', { stdio: 'inherit' });
          
          checkReplacements();
        });
      });
    });
  });
}

askLineNumber();