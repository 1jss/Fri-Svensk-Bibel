const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');
const { text } = require("stream/consumers");

async function main() {
  const client = new LMStudioClient();
  const model = await client.llm.model(); // Uses the default loaded model

  const systemPrompt = `Du är en noggrann granskare. Din uppgift är att jämföra egennamn och personnamn (ovanliga namn) i två texter (A och B) och se till att de är identiska.
  
Regler:
* Se om det finns några egennamn (personnamn och platsnamn) med stor bokstav. Jämför endast dessa.
* Om namnen finns i båda texterna och är identiska, svara med "LIKA" och "INGEN" som avikelse.
* Om det finns skillnader, svara med "OLIKA" och specificera vad som skiljer sig åt.

### Output-format:
Svara strikt enligt följande struktur utan ytterligare förklaringar:
- Status: [LIKA / OLIKA]
- Avikelse: [Vad som har ändrats, eller "INGEN" om inga skillnader finns]
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
      const promptText = `Text A: "${textPre}"\nText B: "${textPost}"`;
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
