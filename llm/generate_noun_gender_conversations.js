const fs = require('fs');
const path = require('path');

const approvedPath = path.join(__dirname, 'approved.json');
const outputDir = path.join(__dirname, '../../small-think/lora/training-new');

// Question templates with placeholder [NOUN]
const questionTemplates = [
  "Heter det 'en [NOUN]' eller 'ett [NOUN]'?",
  "Vilket genus har ordet '[NOUN]'? Svara 'en [NOUN]' eller 'ett [NOUN]'.",
  "Är det 'en [NOUN]' eller 'ett [NOUN]'?",
  "Svenska ordet '[NOUN]' - är det 'en [NOUN]' eller 'ett [NOUN]'?"
];

function getRandomTemplate() {
  return questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
}

function generateTimestamp(index) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  // Add index to ensure uniqueness
  const uniqueId = String(index).padStart(4, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${uniqueId}`;
}

function createConversation(gender, noun) {
  const template = getRandomTemplate();
  const question = template.replace(/\[NOUN\]/g, noun);
  
  // Response follows the instruction: "Svara bara 'en man' eller 'ett man'"
  const response = `${gender} ${noun}`;
  
  return [
    {
      role: 'user',
      content: question
    },
    {
      role: 'assistant',
      content: response
    }
  ];
}

function main() {
  try {
    // Read approved.json
    const approvedData = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
    
    console.log(`Generating conversations for ${approvedData.length} words...`);
    
    let createdCount = 0;
    
    // Generate one conversation per word
    for (let i = 0; i < approvedData.length; i++) {
      const item = approvedData[i];
      const conversation = createConversation(item.gender, item.noun);
      
      // Create filename with timestamp and index for uniqueness
      const timestamp = generateTimestamp(i);
      const filename = `gender_${timestamp}.json`;
      const filepath = path.join(outputDir, filename);
      
      // Write conversation to file
      fs.writeFileSync(filepath, JSON.stringify(conversation, null, 2));
      createdCount++;
    }
    
    console.log(`✓ Successfully created ${createdCount} conversation files`);
    console.log(`✓ Output directory: ${outputDir}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
