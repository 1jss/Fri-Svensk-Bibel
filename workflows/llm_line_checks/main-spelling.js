const fs = require('fs');
const path = require('path');
const config = require('../../config.js');
const { checkSpellingAndFacts } = require('./checks/check_spelling_facts.js');
const { resolveSpellingAndFacts } = require('./checks/resolve_spelling_facts.js');
const { stripXML } = require('../../utils/llm-runner.js');

/**
 * Main orchestrator for spelling/facts checks only
 * Runs check and resolver loop for spelling and facts issues
 */

async function main() {
    const startLine = (parseInt(process.argv[2]) || 1) - 1;
    const contextLines = parseInt(process.argv[3]) || 1;
    const maxFailedAttempts = 3;
    const debugMode = process.argv[4] === '--debug';
    
    console.log(`Starting SPELLING/FACTS checks from line ${startLine + 1}`);
    console.log(`Max failed attempts: ${maxFailedAttempts}`);
    if (debugMode) console.log(`Debug mode: ON`);
    console.log('---');

    const file1917 = fs.readFileSync(config.data.bibles.xml1917, 'utf-8');
    const fileFSB = fs.readFileSync(config.data.bibles.fsbXml, 'utf-8');

    const lines1917 = file1917.replace(/\r\n/g, '\n').split('\n');
    const linesFSB = fileFSB.replace(/\r\n/g, '\n').split('\n');

    const maxLines = Math.min(lines1917.length, linesFSB.length);

    for (let i = startLine; i < maxLines; i++) {
        let line1917 = lines1917[i];
        let lineFSB = linesFSB[i];

        console.log(`\nProcessing line ${i + 1}...`);

        const lineFSBContent = stripXML(lineFSB);
        if (!lineFSBContent.trim()) {
            console.log(`Skipped: No text content`);
            continue;
        }

        const lineKey = `line_${i + 1}`;
        let failedAttempts = 0;
        let checkPassed = false;
        let currentLine = lineFSB;
        let lastSuccessfulLine = lineFSB;

        while (failedAttempts < maxFailedAttempts && !checkPassed) {
            failedAttempts++;
            console.log(`  Attempt ${failedAttempts}/${maxFailedAttempts}:`);

            const check = await checkSpellingAndFacts(line1917, currentLine, i + 1);
            
            const checkPassed_ = !check.changed && !check.error;
            checkPassed = checkPassed_;

            if (checkPassed) {
                console.log(`    ✓ Spelling/facts check passed!`);
                lastSuccessfulLine = currentLine;
                break;
            }

            if (check.error) {
                console.log(`    ✗ Check error: ${check.error}`);
            } else if (check.changed) {
                console.log(`    ✗ Found fact changes: ${check.analysis}`);
            }

            console.log(`    - Attempting resolution...`);
            const resolved = await resolveSpellingAndFacts(line1917, currentLine, check, i + 1);
            
            if (resolved.resolved) {
                console.log(`      ✓ Proposed fix`);
                currentLine = resolved.proposedLine;
            } else {
                console.log(`      ✗ No fix possible`);
                break;
            }
        }

        if (failedAttempts >= maxFailedAttempts && !checkPassed) {
            console.log(`  Max failed attempts reached`);
        }

        if (checkPassed && lastSuccessfulLine !== lineFSB) {
            console.log(`  ✓ Applying resolved version to FSB`);
            linesFSB[i] = lastSuccessfulLine;
        } else if (checkPassed && lastSuccessfulLine === lineFSB) {
            console.log(`  ✓ Line already correct - no changes`);
        } else {
            console.log(`  ✗ Not applying changes - check did not pass`);
        }

        // Write FSB file immediately after each line is processed
        const updatedFSB = linesFSB.join('\n');
        fs.writeFileSync(config.data.bibles.fsbXml, updatedFSB);
    }

    console.log(`\n✓ Spelling/facts checks complete`);
    console.log(`✓ FSB updated at: ${config.data.bibles.fsbXml}`);
}

main().catch(console.error);
