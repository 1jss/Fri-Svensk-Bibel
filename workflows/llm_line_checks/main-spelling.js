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
    
    const resultsPath = path.join(__dirname, 'line_checks_results_spelling.json');
    let allResults = {};
    
    try {
        allResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    } catch (e) {
        console.log('Starting fresh results file');
    }

    for (let i = startLine; i < maxLines; i++) {
        let line1917 = lines1917[i];
        let lineFSB = linesFSB[i];

        console.log(`\nProcessing line ${i + 1}...`);

        const lineFSBContent = stripXML(lineFSB);
        if (!lineFSBContent.trim()) {
            console.log(`Skipped: No text content`);
            continue;
        }

        if (debugMode) {
            console.log(`  1917 content: "${stripXML(line1917).substring(0, 80)}${stripXML(line1917).length > 80 ? '...' : ''}"`);
            console.log(`  FSB content:  "${lineFSBContent.substring(0, 80)}${lineFSBContent.length > 80 ? '...' : ''}"`);
        }

        const lineKey = `line_${i + 1}`;
        const lineResults = {
            lineNumber: i + 1,
            line1917: line1917,
            initialLineFSB: lineFSB,
            finalLineFSB: lineFSB,
            checks: [],
            resolutions: [],
            finalStatus: 'no_changes',
            applied: false
        };

        let failedAttempts = 0;
        let checkPassed = false;
        let currentLine = lineFSB;
        let lastSuccessfulLine = lineFSB;

        while (failedAttempts < maxFailedAttempts && !checkPassed) {
            failedAttempts++;
            console.log(`  Attempt ${failedAttempts}/${maxFailedAttempts}:`);

            const check = await checkSpellingAndFacts(line1917, currentLine, i + 1);
            
            lineResults.checks.push({
                attempt: failedAttempts,
                check: check
            });

            const checkPassed_ = !check.changed && !check.error;
            checkPassed = checkPassed_;

            if (checkPassed) {
                console.log(`    ✓ Spelling/facts check passed!`);
                lineResults.finalStatus = 'resolved_success';
                lastSuccessfulLine = currentLine;
                break;
            }

            if (check.error) {
                console.log(`    ✗ Check error: ${check.error}`);
            } else if (check.changed) {
                console.log(`    ✗ Found fact changes: ${check.analysis}`);
                if (debugMode && check.validated) {
                    console.log(`      Validation: isValid=${check.validated.isValid}, confidence=${(check.validated.confidence * 100).toFixed(0)}%`);
                    if (check.validated.issues.length > 0) {
                        console.log(`      Issues: ${check.validated.issues.join(', ')}`);
                    }
                }
            }

            console.log(`    - Attempting resolution...`);
            const resolved = await resolveSpellingAndFacts(line1917, currentLine, check, i + 1);
            
            lineResults.resolutions.push({
                attempt: failedAttempts,
                resolved: resolved
            });

            if (resolved.resolved) {
                console.log(`      ✓ Proposed fix`);
                if (debugMode) {
                    console.log(`        Original: "${stripXML(currentLine).substring(0, 60)}..."`);
                    console.log(`        Proposed: "${stripXML(resolved.proposedLine).substring(0, 60)}..."`);
                }
                currentLine = resolved.proposedLine;
            } else {
                console.log(`      ✗ No fix possible`);
                lineResults.finalStatus = 'unresolvable';
                break;
            }
        }

        if (failedAttempts >= maxFailedAttempts && !checkPassed) {
            console.log(`  Max failed attempts reached`);
            lineResults.finalStatus = 'max_attempts_failed';
        }

        if (checkPassed && lastSuccessfulLine !== lineFSB) {
            console.log(`  ✓ Applying resolved version to FSB`);
            lineResults.finalLineFSB = lastSuccessfulLine;
            lineResults.applied = true;
            linesFSB[i] = lastSuccessfulLine;
        } else if (checkPassed && lastSuccessfulLine === lineFSB) {
            console.log(`  ✓ Line already correct - no changes`);
            lineResults.finalStatus = 'already_correct';
        } else {
            console.log(`  ✗ Not applying changes - check did not pass`);
            lineResults.finalLineFSB = lineFSB;
            lineResults.applied = false;
        }

        allResults[lineKey] = lineResults;
        fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
        
        // Write FSB file immediately after each line is processed
        const updatedFSB = linesFSB.join('\n');
        fs.writeFileSync(config.data.bibles.fsbXml, updatedFSB);
    }

    console.log(`\n✓ Spelling/facts checks complete`);
    console.log(`✓ Results saved to: ${resultsPath}`);
    console.log(`✓ FSB updated incrementally at: ${config.data.bibles.fsbXml}`);
}

main().catch(console.error);
