const fs = require('fs');

const replacements = JSON.parse(fs.readFileSync('replacements.json', 'utf8'));

let xmlContent = fs.readFileSync('FSB.xml', 'utf8');

for (const rep of replacements) {
    xmlContent = xmlContent.split(rep.old).join(rep.new);
}

fs.writeFileSync('FSB.xml', xmlContent);

console.log('Replacements applied successfully.');