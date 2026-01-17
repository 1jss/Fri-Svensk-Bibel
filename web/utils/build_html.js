const fs = require('fs');
const path = require('path');

// Ensure FSB directory exists
if (!fs.existsSync('FSB')) {
  fs.mkdirSync('FSB', { recursive: true });
}
// Clear the FSB directory
if (fs.existsSync('FSB')) {
  const files = fs.readdirSync('FSB');
  files.forEach(file => {
    const filePath = path.join('FSB', file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    }
  });
}

// Copy content of FSB_xml folder to FSB folder, renaming .xml to .html
const fsbXmlFiles = fs.readdirSync('FSB_xml').filter(file => path.extname(file) === '.xml');
fsbXmlFiles.forEach(file => {
  const base = path.basename(file, '.xml');
  fs.copyFileSync(path.join('FSB_xml', file), path.join('FSB', base + '.html'));
});

/**
 * Lists files in a directory, excluding hidden files
 * @param {string} dirPath Directory path
 * @return {string[]} Array of file paths
 */
function listdirNoHidden(dirPath) {
  return fs.readdirSync(dirPath)
    .filter(file => !file.startsWith('.'))
    .map(file => path.join(dirPath, file));
}

const mappOrdlistor = 'ordlistorHtml/';
const ordlistor = listdirNoHidden(mappOrdlistor);

const mappData = 'FSB/';
const fillista = listdirNoHidden(mappData);

fillista.forEach(filnamn => {
  console.log('Arbetar med: ' + filnamn);

  // Read the file content with UTF-8 encoding
  let text = fs.readFileSync(filnamn, 'utf8');

  ordlistor.forEach(ordlista => {
    // Read and decode the JSON file
    const jsonContent = fs.readFileSync(ordlista, 'utf8');
    const lista = JSON.parse(jsonContent);

    // Process each word pair
    Object.entries(lista.ordpar).forEach(([a, b]) => {
      if (lista.regex) {
        const escapedA = a.replace(/\//g, '\\/');
        const regex = new RegExp(escapedA, 'g');
        text = text.replace(regex, b);
      } else {
        text = text.replaceAll(a, b);
      }
    });
  });

  // Write the modified content back to the file
  fs.writeFileSync(filnamn, text, 'utf8');
});