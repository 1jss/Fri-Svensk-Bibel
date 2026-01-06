const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');
const { text } = require("stream/consumers");

async function main() {
  const client = new LMStudioClient();
  const model = await client.llm.model(); // Uses the default loaded model

  const systemPrompt = `Du är en expert på lingvistik och semantik med specialisering i svenska språket från 1900-talets början fram till idag.

Din uppgift är att jämföra två meningar (Text A från år 1900 och Text B från år 2000) och avgöra om de förmedlar exakt samma budskap och logiska innebörd, trots skillnader i stil, ordförråd och grammatik.

### Bedömningskriterier:
1. Andemening: Är det grundläggande budskapet detsamma?
2. Logik och Syftning: Flagga för skillnad om vem som gör vad, eller förhållandet mellan objekt, har ändrats.
3. Kontextuella synonymer: Acceptera att ord som "automobil" (1900) motsvarar "bil" (2000).
4. Acceptera inte förändringar av namn, platser eller specifika fakta.

### Output-format:
Svara strikt enligt följande struktur utan ytterligare förklaringar:
- Status: [LIKA / OLIKA]
- Avikelse: [En mening som förklarar skillnaden, eller "Inga avvikelser" om de är lika.]
`; // Hard-coded system prompt

  const startLine = parseInt(process.argv[2]) || 0;
  console.log(`Starting processing from line ${startLine}`);

  const filePathPre = path.join(__dirname, '..', '1917.xml');
  const contentPre = fs.readFileSync(filePathPre, 'utf8');
  const linesPre = contentPre.split('\n');

  const filePathPost = path.join(__dirname, '..', 'FSB.xml');
  const contentPost = fs.readFileSync(filePathPost, 'utf8');
  const linesPost = contentPost.split('\n');

  const checksPath = path.join(__dirname, '..', 'checks.json');

  let replacements = [];
  try {
    replacements = JSON.parse(fs.readFileSync(checksPath, 'utf8'));
  } catch (e) {
    console.log('replacements.json not found or invalid, starting empty');
  }

  for (let i = startLine; i < linesPre.length; i++) {
    const linePre = linesPre[i];
    const linePost = linesPost[i];
    if (linePre === linePost) {
      continue; // Skip identical lines
    }
    const regex = /<VERS[^>]*>(.*?)<\/VERS>/;
    const matchPre = linePre.match(regex);
    const matchPost = linePost.match(regex);
    if (matchPre && matchPost) {
      const textPre = matchPre[1];
      const textPost = matchPost[1];
      const promptText = `Text A (1900): "${textPre}"\nText B (2000): "${textPost}"`;
      const chat = Chat.from([
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ]);
      const result = await model.respond(chat);
      const newText = result.content.trim();

      console.log(`Line ${i + 1}:\n"${textPre}"\n"${textPost}"\n${newText}\n`);
      if (newText.includes('OLIKA')) {
        replacements.push({ text: textPost, comment: newText });
        fs.writeFileSync(checksPath, JSON.stringify(replacements, null, 2));
      }
    }
  }
  console.log('Processing complete.');
}

main().catch(console.error);
