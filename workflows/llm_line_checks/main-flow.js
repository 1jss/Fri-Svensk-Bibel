const fs = require('fs');
const path = require('path');
const config = require('../../config.js');
const { checkSentenceFlow } = require('./checks/check_sentence_flow.js');
const { resolveSentenceFlow } = require('./checks/resolve_sentence_flow.js');
const { stripXML } = require('../../utils/llm-runner.js');

/**
 * Main orchestrator for sentence flow checks only
 * Runs check and resolver loop for punctuation and flow issues
 */

async function main() {
    const startLine = (parseInt(process.argv[2]) || 1) - 1;
    const contextLines = parseInt(process.argv[3]) || 1;
    const maxFailedAttempts = 3;
    const debugMode = process.argv[4] === '--debug';
    
    console.log(`Starting SENTENCE FLOW checks from line ${startLine + 1}`);
    console.log(`Using ${contextLines} previous line(s) for context`);
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

        let contextLines1917 = '';
        if (i > 0) {
            for (let j = Math.max(0, i - contextLines); j < i; j++) {
                contextLines1917 += lines1917[j] + '\n';
            }
        }

        const lineKey = `line_${i + 1}`;
        let failedAttempts = 0;
        let checkPassed = false;
        let currentLine = lineFSB;
        let lastSuccessfulLine = lineFSB;

        while (failedAttempts < maxFailedAttempts && !checkPassed) {
            failedAttempts++;
            console.log(`  Attempt ${failedAttempts}/${maxFailedAttempts}:`);

            const check = await checkSentenceFlow(currentLine, contextLines1917, i + 1);
            
            checkPassed = !check.hasIssues && !check.error;

            if (checkPassed) {
                console.log(`    ✓ Sentence flow check passed!`);
                lastSuccessfulLine = currentLine;
                break;
            }

            if (check.error) {
                console.log(`    ✗ Check error: ${check.error}`);
            } else if (check.hasIssues) {
                console.log(`    ✗ Found punctuation issues (severity: ${check.severity})`);
            }

            console.log(`    - Attempting resolution...`);
            const resolved = await resolveSentenceFlow(currentLine, contextLines1917, check, i + 1);
            
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

        const updatedFSB = linesFSB.join('\n');
        fs.writeFileSync(config.data.bibles.fsbXml, updatedFSB);
    }

    console.log(`\n✓ Sentence flow checks complete`);
    console.log(`✓ FSB updated at: ${config.data.bibles.fsbXml}`);
}

main().catch(console.error);
