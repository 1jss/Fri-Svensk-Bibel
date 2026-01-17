const fs = require('fs');
const path = require('path');

const filePath = 'FSB.xml'; // Path to the XML file, can be changed or passed as argument

try {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n');
  let errors = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Check if both current and next lines contain vnumber
    if (currentLine.includes('vnumber=') && nextLine.includes('vnumber=')) {
      const matchCurrent = currentLine.match(/vnumber="(\d+)"/);
      const matchNext = nextLine.match(/vnumber="(\d+)"/);

      if (matchCurrent && matchNext) {
        const numCurrent = parseInt(matchCurrent[1]);
        const numNext = parseInt(matchNext[1]);

        // Check if the next number is exactly one more than the current
        if (numNext !== numCurrent + 1) {
          errors.push(`Lines ${i + 1}-${i + 2}: Verse numbers ${numCurrent} to ${numNext} are not in correct order or missing verses. Expected next verse to be ${numCurrent + 1}.`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.log('Errors found in verse ordering:');
    errors.forEach(error => console.log(error));
  } else {
    console.log('All consecutive verse pairs are in correct order. No missing verses detected between consecutive verse lines.');
  }
} catch (err) {
  console.error('Error reading the file:', err.message);
}