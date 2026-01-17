const fs = require('fs');
const config = require('../../config.js');

const replacements = JSON.parse(fs.readFileSync(config.data.changes.numberReplacements, 'utf8'));

let xmlContent = fs.readFileSync(config.data.bibles.fsbXml, 'utf8');

for (const rep of replacements) {
    xmlContent = xmlContent.split(rep.old).join(rep.new);
}

fs.writeFileSync(config.data.bibles.fsbXml, xmlContent);

console.log('Replacements applied successfully.');