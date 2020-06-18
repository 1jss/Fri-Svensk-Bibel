'use strict';

const fs = require('fs');

// Read bible file
let bibleData = String(fs.readFileSync('data/1917.xml'));

function escape(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/, '\\$&');
}

// Read word list folder
const dirname = 'ordlistorText/';
fs.readdirSync(dirname).forEach(filename => {
    if (filename.charAt(0) === '.') {} // Skips hidden file
    else {
        console.log(filename);
        // Read and parse word lists
        let wordlist = JSON.parse(fs.readFileSync(dirname + filename));
        if (wordlist["regex"]){
            // Replace old words with new words
            for (let i in wordlist["ordpar"]) {
                let re = new RegExp(i, "g");
                bibleData = bibleData.replace(re, wordlist["ordpar"][i]);
                // console.log(i + ":" + wordlist["ordpar"][i]);
            }

        }
        else {
            // Replace old words with new words
            for (let i in wordlist["ordpar"]) {
                bibleData = bibleData.split(i).join(wordlist["ordpar"][i]);
            }
        }
    }
});
// Write bible file
fs.writeFileSync('outputData.xml', bibleData);
