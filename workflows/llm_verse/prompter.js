const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');
const config = require('../../config.js');

async function main() {
    const client = new LMStudioClient();
    const model = await client.llm.model(); // Uses the default loaded model

    const systemPrompt = `Du är en expert på svensk språkvård. Din uppgift är att modernisera gammal svensk text till modern, naturlig svenska.

Regler:
* Ersätt ålderdomliga ord (t.ex. "skall" -> "ska", "ehuru" -> "fastän").
* Modernisera meningsbyggnad om den känns onaturlig, men bevara ALLTID betydelsen exakt.
* Undvik sammansatta ord.
* Ändra INTE namn eller stavning på personer eller platser.
* Svara ENDAST med den moderniserade texten. Ingen inledning eller förklaring.

Exempel:
Input: "Huset skall varda uppfört å denna plats."
Output: "Huset ska byggas på den här platsen."

Här kommer texten som ska moderniseras:`; // Hard-coded system prompt

    const startLine = parseInt(process.argv[2]) || 0;
    console.log(`Starting processing from line ${startLine}`);

    const filePath = config.data.bibles.fsbXml;
    const replacementsPath = config.data.changes.replacements;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let replacements = [];
    try {
        replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));
    } catch (e) {
        console.log('replacements.json not found or invalid, starting empty');
    }

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        const regex = /<VERS[^>]*>(.*?)<\/VERS>/;
        const match = line.match(regex);
        if (match) {
            const oldText = match[1];
            const chat = Chat.from([
                { role: "system", content: systemPrompt },
                { role: "user", content: oldText }
            ]);
            const result = await model.respond(chat);
            const newText = result.content.trim();
            if (oldText !== newText) {
                replacements.push({ old: oldText, new: newText, line: i + 1 });
                fs.writeFileSync(replacementsPath, JSON.stringify(replacements, null, 2));
            }
            console.log(`Processed line ${i + 1}: "${oldText}" -> "${newText}"`);
        }
    }
    console.log('Processing complete.');
}

main().catch(console.error);
