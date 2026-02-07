const fs = require('fs');
const path = require('path');
const config = require('../../config.js');

// Ensure FSB directory exists
if (!fs.existsSync(config.folders.fsbHtmlDir)) {
  fs.mkdirSync(config.folders.fsbHtmlDir, { recursive: true });
}
// Clear the FSB directory
if (fs.existsSync(config.folders.fsbHtmlDir)) {
  const files = fs.readdirSync(config.folders.fsbHtmlDir);
  files.forEach(file => {
    const filePath = path.join(config.folders.fsbHtmlDir, file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    }
  });
}

// Copy content of FSB_xml folder to FSB folder, renaming .xml to .html
const fsbXmlFiles = fs.readdirSync(config.folders.fsbXmlDir).filter(file => path.extname(file) === '.xml');
fsbXmlFiles.forEach(file => {
  const base = path.basename(file, '.xml');
  fs.copyFileSync(path.join(config.folders.fsbXmlDir, file), path.join(config.folders.fsbHtmlDir, base + '.html'));
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

const mappData = config.folders.fsbHtmlDir;
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