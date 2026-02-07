const fs = require('fs');
const path = require('path');
const config = require('../../config.js');

// Ensure FSB_xml directory exists
if (!fs.existsSync('FSB_xml')) {
  fs.mkdirSync('FSB_xml', { recursive: true });
}

// Clear the FSB_xml directory
if (fs.existsSync('FSB_xml')) {
  const files = fs.readdirSync('FSB_xml');
  for (const file of files) {
    fs.unlinkSync(path.join('FSB_xml', file));
  }
}

// Read the translation file
const xml_content = fs.readFileSync(config.data.bibles.fsbXml, 'utf8');

// Split the content into bible books - simple split at BIBLEBOOK
const bible_books = xml_content.split('<BIBLEBOOK');

// Remove the first empty element
bible_books.shift();

// Process each bible book
for (let i = 0; i < bible_books.length; i++) {
  if (bible_books[i]) {
    // Add back the BIBLEBOOK tag that was removed by split
    const full_book = '<BIBLEBOOK' + bible_books[i];

    // Save to a numbered XML file
    const book_number = (i + 1).toString().padStart(2, '0');
    fs.writeFileSync(`FSB_xml/${book_number}.xml`, full_book, 'utf8');
  }
}