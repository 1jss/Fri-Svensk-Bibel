const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new LMStudioClient();
  const model = await client.llm.model(); // Uses the default loaded model

  const systemPrompt = `Du är en expert på svensk språkvård. Din uppgift är att identifiera ålderdomliga ord.
Regler:
* Om ordet är okänt, modernt eller ett namn, svara "NEJ"
* Om ordet är känt och ålderdomligt, svara "JA"
* Svara "NEJ" vid minsta osäkerhet
Exempel:
* siflon - "[NEJ]"
* fartyg - "[NEJ]"
* akparsad - "[NEJ]"
* lassaron - "[NEJ]"
* skrifva - "[JA]"
* ehuru - "[JA]"
* gingo - "[JA]"

### Output-format:
Svara strikt enligt följande struktur utan ytterligare förklaringar: [JA / NEJ]
`; // Hard-coded system prompt

  const startLine = parseInt(process.argv[2]) || 0;
  console.log(`Starting processing from index ${startLine}`);

  const filePathPost = path.join(__dirname, '..', 'word_stats.json');
  const words = JSON.parse(fs.readFileSync(filePathPost, 'utf8'));

  const wordsPath = path.join(__dirname, '..', 'old_words.json');

  let indentifiedWords = [];
  try {
    indentifiedWords = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
  } catch (e) {
    console.log('old_words.json not found or invalid, starting empty');
  }

  for (let i = startLine; i < words.length; i++) {
    const word = words[i].word;
    const promptText = `"${word}"`;
    const chat = Chat.from([
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ]);
      const result = await model.respond(chat);
      const newText = result.content.trim();

      console.log(`${i}: "${word}" - ${newText}`);
      if (newText.includes('JA')) {
        indentifiedWords.push({ word: word, comment: newText });
        fs.writeFileSync(wordsPath, JSON.stringify(indentifiedWords, null, 2));
      }
  }
  console.log('Processing complete.');
}

main().catch(console.error);
