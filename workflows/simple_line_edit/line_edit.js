const fs = require('fs');
const path = require('path');
const { LMStudioClient, Chat } = require("@lmstudio/sdk");

// Config paths
const rootDir = path.join(__dirname, '../..');
const XML_1917 = path.join(rootDir, 'data/bibles/1917.xml');
const XML_FSB = path.join(rootDir, 'data/bibles/FSB.xml');
const RESULTS_FILE = path.join(__dirname, 'results.json');

// Helper: Strip XML tags
function stripXML(text) {
    return text.replace(/<[^>]+>/g, '').trim();
}

// Helper: Run LLM check
async function runLLM(input, instruction, skipToken = null) {
    const cleanInput = stripXML(input);
    
    try {
        const client = new LMStudioClient();
        const model = await client.llm.model();
        const chat = Chat.from([
            { role: "system", content: instruction },
            { role: "user", content: cleanInput }
        ]);
        
        const result = await model.respond(chat);
        const output = result.content.trim();
        
        if (skipToken && output.includes(skipToken)) {
            return null;
        }
        
        return output;
    } catch (error) {
        throw new Error(`LLM Error: ${error.message}`);
    }
}

// Check if facts changed between 1917 and FSB
async function checkFacts(line1917, lineFSB, lineNumber) {
    const text1917 = stripXML(line1917);
    const textFSB = stripXML(lineFSB);
    
    if (text1917 === textFSB) {
        return { changed: false, analysis: null, error: null };
    }

    // Use LLM to detect meaning-altering changes
    const SKIP_TOKEN = "SKIP_TOKEN";
    const instruction = `You are an expert in Swedish text analysis and language preservation. Determine if this modernization has altered FACTS or meaning.

IGNORE (these are acceptable changes):
- Spelling and modern language form
- Word choice (synonyms) like: "bördeman" → "förmyndare", "ty" → "för", "skall" → "ska"
- Archaic words → modern Swedish
- Grammatical improvements
- Same core meaning despite different wording

FLAG ONLY (critical changes):
- Subject and object swapped (action altered)
- Negation changed (from "not" to no negation or vice versa)
- Number incorrectly altered (singular/plural changing meaning)
- Numerical values changed
- Names/places are spelled differently
- What happens or doesn't happen has changed
- Proper names (people, places) changed to different names

IMPORTANT: For any changes, list each change explicitly in the format:
"'new_word' should be changed to 'old_word'"

For example, if "Jeus" was changed to "John", report: "'John' should be changed to 'Jeus'"
If multiple things need changing, list each one on a separate line."

OLD: "${text1917}"
NEW: "${textFSB}"

If there are no critical changes to flag, respond: ${SKIP_TOKEN}`;

    try {
        const result = await runLLM(textFSB, instruction, SKIP_TOKEN);
        
        if (result === null) {
            return { changed: false, analysis: 'No fact changes', error: null };
        }
        
        return { 
            changed: true, 
            analysis: result.substring(0, 300), 
            error: null 
        };
    } catch (error) {
        return { changed: false, analysis: null, error: error.message };
    }
}

// Resolve issues by proposing modernized text
async function resolveFacts(proposedLine, checkResult) {
    if (!checkResult.changed) {
        return { resolved: false, proposedLine, error: null };
    }

    const instruction = `You are an expert in text editing. Your task is to modify the given text to fix the issues identified in the feedback.

Rules:
* Make only the specific changes mentioned in the feedback.
* Preserve all other parts of the text exactly as they are.
* Do not make additional changes beyond what the feedback describes.
* Your response must be ONLY the corrected text. No explanations or introductions.

Feedback:
${checkResult.analysis}

Text to modify:
"${proposedLine}"

Corrected text:`;

    try {
        const result = await runLLM(proposedLine, instruction);
        
        if (result) {
            return { resolved: true, proposedLine: result, error: null };
        }
        
        return { resolved: false, proposedLine, error: null };
    } catch (error) {
        return { resolved: false, proposedLine, error: error.message };
    }
}

// Main function
async function main() {
    const startLine = (parseInt(process.argv[2]) || 1) - 1;
    const maxAttempts = 3;
    const contextLines = 1;
    
    console.log(`Starting from line ${startLine + 1}`);
    console.log(`Max attempts: ${maxAttempts}`);
    console.log('---');

    const file1917 = fs.readFileSync(XML_1917, 'utf-8');
    const fileFSB = fs.readFileSync(XML_FSB, 'utf-8');

    const lines1917 = file1917.replace(/\r\n/g, '\n').split('\n');
    const linesFSB = fileFSB.replace(/\r\n/g, '\n').split('\n');

    const maxLines = Math.min(lines1917.length, linesFSB.length);
    
    let allResults = {};
    try {
        allResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    } catch (e) {
        console.log('Starting fresh results file');
    }

    for (let i = startLine; i < maxLines; i++) {
        const line1917 = lines1917[i];
        const lineFSB = linesFSB[i];

        console.log(`\nProcessing line ${i + 1}...`);

        // Strip XML from both lines once
        const text1917 = stripXML(line1917);
        const textFSB = stripXML(lineFSB);
        
        if (!textFSB.trim()) {
            console.log(`Skipped: No text content`);
            continue;
        }

        console.log(`  1917: "${text1917}"`);
        console.log(`  FSB:  "${textFSB}"`);

        const lineKey = `line_${i + 1}`;
        const lineResults = {
            lineNumber: i + 1,
            line1917,
            initialLineFSB: lineFSB,
            finalLineFSB: lineFSB,
            checks: [],
            resolutions: [],
            finalStatus: 'no_changes',
            applied: false
        };

        // Initialize proposedLine with stripped FSB text
        let proposedLine = textFSB;
        let attempts = 0;
        let passed = false;

        while (attempts < maxAttempts && !passed) {
            attempts++;
            console.log(`  Attempt ${attempts}/${maxAttempts}:`);

            // Check: compare proposedLine against 1917 line
            const check = await checkFacts(line1917, proposedLine, i + 1);
            lineResults.checks.push({ attempt: attempts, check });

            if (!check.changed && !check.error) {
                // Check passed: apply proposed line and exit loop
                passed = true;
                console.log(`    ✓ Check passed!`);
                const finalLineFSB = lineFSB.replace(textFSB, proposedLine);
                linesFSB[i] = finalLineFSB;
                lineResults.finalLineFSB = finalLineFSB;
                lineResults.finalStatus = 'resolved_success';
                lineResults.applied = true;
                break;
            }

            // Check failed: log error or changes
            if (check.error) {
                console.log(`    ✗ Error: ${check.error}`);
                lineResults.finalStatus = 'check_error';
                break;
            }

            if (check.changed) {
                console.log(`    ✗ Changes: ${check.analysis}`);
            }

            // Try to resolve the issue
            console.log(`    - Resolving...`);
            const resolved = await resolveFacts(proposedLine, check);
            lineResults.resolutions.push({ attempt: attempts, resolved });

            if (resolved.resolved) {
                console.log(`      ✓ Proposed fix`);
                console.log(`        Was: "${proposedLine}"`);
                console.log(`        Now: "${resolved.proposedLine}"`);
                // Update proposedLine and loop back to check
                proposedLine = resolved.proposedLine;
            } else {
                console.log(`      ✗ No fix possible`);
                lineResults.finalStatus = 'unresolvable';
                break;
            }
        }

        if (attempts >= maxAttempts && !passed) {
            console.log(`  Max attempts reached`);
            lineResults.finalStatus = 'max_attempts_failed';
        }

        allResults[lineKey] = lineResults;
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(allResults, null, 2));
        
        // Write FSB after each line
        const updatedFSB = linesFSB.join('\n');
        fs.writeFileSync(XML_FSB, updatedFSB);
    }

    console.log(`\n✓ Complete`);
    console.log(`✓ Results: ${RESULTS_FILE}`);
    console.log(`✓ FSB updated: ${XML_FSB}`);
}

main().catch(console.error);
