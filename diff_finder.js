const fs = require('fs');

const preFile = 'FSB_pre.xml';
const fsbFile = 'FSB.xml';
const replacementsFile = 'replacements.json';

let preLines = fs.readFileSync(preFile, 'utf8').split('\n');
let fsbLines = fs.readFileSync(fsbFile, 'utf8').split('\n');

let replacements = JSON.parse(fs.readFileSync(replacementsFile, 'utf8'));

for (let i = 0; i < Math.min(preLines.length, fsbLines.length); i++) {
    let preWords = preLines[i].trim().split(' ');
    let fsbWords = fsbLines[i].trim().split(' ');

    if (preWords.length === fsbWords.length) {
        for (let j = 0; j < preWords.length - 2; j++) {
            if (preWords[j] === fsbWords[j] &&
                preWords[j + 2] === fsbWords[j + 2] &&
                preWords[j + 1] !== fsbWords[j + 1]) {

                let oldStr = preWords[j] + ' ' + preWords[j + 1] + ' ' + preWords[j + 2];
                let newStr = fsbWords[j] + ' ' + fsbWords[j + 1] + ' ' + fsbWords[j + 2];

                // Check if this replacement already exists
                if (!replacements.some(r => r.old === oldStr && r.new === newStr)) {
                    replacements.push({ old: oldStr, new: newStr });
                }
            }
        }
    }
}

fs.writeFileSync(replacementsFile, JSON.stringify(replacements, null, 2));

console.log('Replacements updated.');