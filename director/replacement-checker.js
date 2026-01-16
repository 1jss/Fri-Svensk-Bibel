const { LMStudioClient, Chat } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new LMStudioClient();
  const model = await client.llm.model(); // Uses the default loaded model

  const systemPrompt = `Du är en noggrann granskare. Din uppgift är att jämföra två texter (A och B) och se till att innebörden är identisk.
  
Regler:
* Om innebörden i båda texterna är identisk, svara med "LIKA" och "INGEN" som avikelse.
* Om det finns skillnader i innebörd, svara med "OLIKA" och specificera vad som skiljer sig åt.

### Output-format:
Svara strikt enligt följande struktur utan ytterligare förklaringar:
- Status: [LIKA / OLIKA]
- Avikelse: [Vad som har ändrats, eller "INGEN" om inga skillnader finns]
`; // Hard-coded system prompt

  const replacementsPath = path.join(__dirname, '..', 'replacements.json');
  const filePathPre = path.join(__dirname, '..', '1917.xml');
  
  let replacements = [];
  try {
    replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));
  } catch (e) {
    console.log('replacements.json not found or invalid, starting empty');
    return;
  }

  const contentPre = fs.readFileSync(filePathPre, 'utf8');
  const linesPre = contentPre.split('\n');

  const regex = /<VERS[^>]*>(.*?)<\/VERS>/;

  let kept = 0;
  let discarded = 0;

  for (let i = 0; i < replacements.length; i++) {
    const item = replacements[i];
    
    if (!item.line) {
      continue; // Skip items without line number
    }

    // Line numbers are 1-indexed in the JSON, arrays are 0-indexed
    const lineIndex = item.line - 1;
    
    if (lineIndex >= linesPre.length || lineIndex < 0) {
      console.log(`Line ${item.line} out of bounds, skipping`);
      continue;
    }

    const linePre = linesPre[lineIndex];
    const matchPre = linePre.match(regex);
    
    if (!matchPre) {
      console.log(`Could not extract text from line ${item.line}, skipping`);
      continue;
    }

    const text1917 = matchPre[1];
    const textNew = item.new;

    const promptText = `Text A: "${text1917}"\nText B: "${textNew}"`;
    const chat = Chat.from([
      { role: "system", content: systemPrompt },
      { role: "user", content: promptText }
    ]);
    
    const result = await model.respond(chat);
    const response = result.content.trim();

    console.log(`\n--- Item ${i + 1}/${replacements.length} (Line ${item.line}) ---`);
    console.log(`Text A (1917): "${text1917}"`);
    console.log(`Text B (new): "${textNew}"`);
    console.log(`Response: ${response}`);

    if (response.includes('OLIKA')) {
      kept++;
      console.log(`✓ KEPT`);
    } else {
      replacements.splice(i, 1);
      i--;
      discarded++;
      console.log(`✗ DISCARDED`);
    }

    // Save after each iteration
    fs.writeFileSync(replacementsPath, JSON.stringify(replacements, null, 2));
  }

  console.log(`\n\nProcessing complete. Kept: ${kept}, Discarded: ${discarded}`);
}

main().catch(console.error);
