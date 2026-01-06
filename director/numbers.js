const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');

async function main() {
    const client = new LMStudioClient();
    const model = await client.llm.model(); // Uses the default loaded model

    const systemPrompt = `Du är en expert på svensk språkvård. Din uppgift är att byta ut siffror i ordform mot deras numeriska motsvarigheter i en given text.

Regler:
* Ersätt alla siffror skrivna med bokstäver (t.ex. "ett", "tjugo", "två hundra tusen trettio") med deras numeriska motsvarigheter ("1", "20", "200030").
* Ersätt inte en eller ett när de används som artiklar.
* Bevara meningsstrukturen och övrig text oförändrad.
* Svara ENDAST med den modifierade texten. Ingen inledning eller förklaring.
* Om inga siffror behöver bytas ut, svara med texten oförändrad.

Exempel:
Input: "Jag har tjugo äpplen och tre bananer."
Output: "Jag har 20 äpplen och 3 bananer."

Här kommer texten som kan ha siffror i sig:`; // Hard-coded system prompt

    const startLine = parseInt(process.argv[2]) || 0;
    console.log(`Starting processing from line ${startLine}`);

    const filePath = path.join(__dirname, '..', 'FSB.xml');
    const replacementsPath = path.join(__dirname, '..', 'replacements.json');
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
                replacements.push({ old: oldText, new: newText });
                fs.writeFileSync(replacementsPath, JSON.stringify(replacements, null, 2));
            }
            console.log(`Processed line ${i + 1}: "${oldText}" -> "${newText}"`);
        }
    }
    console.log('Processing complete.');
}

main().catch(console.error);
