const fs = require('fs');
const config = require('../../config.js');

const replacements = JSON.parse(fs.readFileSync(config.data.changes.replacements, 'utf8'));

let xmlContent = fs.readFileSync(config.data.bibles.fsbXml, 'utf8');

const notApplied = [];

for (const rep of replacements) {
    if (xmlContent.includes(rep.old)) {
        xmlContent = xmlContent.split(rep.old).join(rep.new);
    } else {
        notApplied.push(rep);
    }
}

fs.writeFileSync(config.data.bibles.fsbXml, xmlContent);
fs.writeFileSync(config.data.changes.replacements, JSON.stringify(notApplied, null, 2));

console.log(`Applied ${replacements.length - notApplied.length} replacements.`);
console.log(`${notApplied.length} replacements had no match and were kept in the file.`);