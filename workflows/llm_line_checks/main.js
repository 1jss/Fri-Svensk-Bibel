const fs = require('fs');
const path = require('path');
const config = require('../../config.js');
const { checkSpellingAndFacts } = require('./checks/check_spelling_facts.js');
const { checkSentenceFlow } = require('./checks/check_sentence_flow.js');
const { resolveSpellingAndFacts } = require('./checks/resolve_spelling_facts.js');
const { resolveSentenceFlow } = require('./checks/resolve_sentence_flow.js');
const { stripXML } = require('../../utils/llm-runner.js');

/**
 * Main orchestrator for line-by-line LLM checks with resolver loop
 * For each line: Check -> Resolve (if needed) -> Check again -> Loop until resolved or max failures
 * Only applies changes if all checks pass. Otherwise keeps original.
 */

async function main() {
    const startLine = (parseInt(process.argv[2]) || 1) - 1;
    const contextLines = parseInt(process.argv[3]) || 1; // Number of previous lines for context
    const maxFailedAttempts = 3; // Max failed iterations before giving up
    const debugMode = process.argv[4] === '--debug'; // Enable verbose logging
    
    console.log(`Starting line checks from line ${startLine + 1}`);
    console.log(`Using ${contextLines} previous line(s) for context`);
    console.log(`Max failed attempts: ${maxFailedAttempts}`);
    if (debugMode) console.log(`Debug mode: ON - Showing detailed check outputs`);
    console.log('---');

    // Read both files
    const file1917 = fs.readFileSync(config.data.bibles.xml1917, 'utf-8');
    const fileFSB = fs.readFileSync(config.data.bibles.fsbXml, 'utf-8');

    const lines1917 = file1917.replace(/\r\n/g, '\n').split('\n');
    const linesFSB = fileFSB.replace(/\r\n/g, '\n').split('\n');

    const maxLines = Math.min(lines1917.length, linesFSB.length);
    
    // Load or initialize results file
    const resultsPath = path.join(__dirname, 'line_checks_results.json');
    let allResults = {};
    
    try {
        allResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    } catch (e) {
        console.log('Starting fresh results file');
    }

    // Process lines
    for (let i = startLine; i < maxLines; i++) {
        let line1917 = lines1917[i];
        let lineFSB = linesFSB[i];

        console.log(`\nProcessing line ${i + 1}...`);

        // Skip empty or content-less lines (extract content first)
        const lineFSBContent = stripXML(lineFSB);
        if (!lineFSBContent.trim()) {
            console.log(`Skipped: No text content`);
            continue;
        }

        if (debugMode) {
            console.log(`  1917 content: "${stripXML(line1917).substring(0, 80)}${stripXML(line1917).length > 80 ? '...' : ''}"`);
            console.log(`  FSB content:  "${lineFSBContent.substring(0, 80)}${lineFSBContent.length > 80 ? '...' : ''}"`);
        }

        // Get context (previous lines)
        let contextLines1917 = '';
        if (i > 0) {
            for (let j = Math.max(0, i - contextLines); j < i; j++) {
                contextLines1917 += lines1917[j] + '\n';
            }
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

        // Check-Resolve Loop
        let failedAttempts = 0;
        let allChecksPassed = false;
        let currentLine = lineFSB;
        let lastSuccessfulLine = lineFSB;

        while (failedAttempts < maxFailedAttempts && !allChecksPassed) {
            failedAttempts++;
            console.log(`  Attempt ${failedAttempts}/${maxFailedAttempts}:`);

            // Run Check 1: Spelling and Facts
            console.log(`    - Checking spelling/facts...`);
            const check1 = await checkSpellingAndFacts(line1917, currentLine, i + 1);
            
            // Run Check 2: Sentence Flow
            console.log(`    - Checking sentence flow...`);
            const check2 = await checkSentenceFlow(currentLine, contextLines1917, i + 1);

            lineResults.checks.push({
                attempt: failedAttempts,
                check1: check1,
                check2: check2
            });

            // Determine if checks passed
            const check1Passed = !check1.changed && !check1.error;
            const check2Passed = !check2.hasIssues && !check2.error;
            allChecksPassed = check1Passed && check2Passed;

            if (allChecksPassed) {
                console.log(`    ✓ All checks passed!`);
                lineResults.finalStatus = 'resolved_success';
                lastSuccessfulLine = currentLine;
                break;
            }

            // Log why checks failed
            if (!check1Passed) {
                if (check1.error) {
                    console.log(`    ✗ Check1 error: ${check1.error}`);
                } else if (check1.changed) {
                    console.log(`    ✗ Check1 found fact changes: ${check1.analysis}`);
                    if (debugMode && check1.validated) {
                        console.log(`      Validation: isValid=${check1.validated.isValid}, confidence=${(check1.validated.confidence * 100).toFixed(0)}%`);
                        if (check1.validated.issues.length > 0) {
                            console.log(`      Issues: ${check1.validated.issues.join(', ')}`);
                        }
                    }
                }
            }

            if (!check2Passed) {
                if (check2.error) {
                    console.log(`    ✗ Check2 error: ${check2.error}`);
                } else if (check2.hasIssues) {
                    console.log(`    ✗ Check2 found flow issues (severity: ${check2.severity})`);
                    if (debugMode) {
                        if (check2.flowIssues.length > 0) {
                            console.log(`      Flow: ${check2.flowIssues.join(', ')}`);
                        }
                        if (check2.consistencyIssues.length > 0) {
                            console.log(`      Consistency: ${check2.consistencyIssues.join(', ')}`);
                        }
                        if (check2.suggestions) {
                            console.log(`      Suggestions: ${check2.suggestions}`);
                        }
                    }
                }
            }

            // Try to resolve issues
            console.log(`    - Attempting resolution...`);
            let resolved1 = null;
            let resolved2 = null;
            let somethingResolved = false;

            if (!check1Passed) {
                resolved1 = await resolveSpellingAndFacts(line1917, currentLine, check1, i + 1);
                if (resolved1.resolved) {
                    console.log(`      ✓ Proposed spelling/facts fix`);
                    if (debugMode) {
                        console.log(`        Original: "${stripXML(currentLine).substring(0, 60)}..."`);
                        console.log(`        Proposed: "${stripXML(resolved1.proposedLine).substring(0, 60)}..."`);
                    }
                    currentLine = resolved1.proposedLine;
                    somethingResolved = true;
                } else {
                    console.log(`      ✗ No spelling/facts fix possible`);
                }
            }

            if (!check2Passed) {
                resolved2 = await resolveSentenceFlow(currentLine, contextLines1917, check2, i + 1);
                if (resolved2.resolved) {
                    console.log(`      ✓ Proposed sentence flow fix`);
                    currentLine = resolved2.proposedLine;
                    somethingResolved = true;
                } else {
                    console.log(`      ✗ No sentence flow fix possible`);
                }
            }

            lineResults.resolutions.push({
                attempt: failedAttempts,
                resolved1: resolved1,
                resolved2: resolved2
            });

            // If nothing could be resolved, stop trying
            if (!somethingResolved) {
                console.log(`    ✗ No further resolutions possible - giving up`);
                lineResults.finalStatus = 'unresolvable';
                break;
            }
        }

        if (failedAttempts >= maxFailedAttempts && !allChecksPassed) {
            console.log(`  Max failed attempts (${maxFailedAttempts}) reached without full resolution`);
            lineResults.finalStatus = 'max_attempts_failed';
        }

        // Only update FSB if ALL checks passed
        if (allChecksPassed && lastSuccessfulLine !== lineFSB) {
            console.log(`  ✓ Applying resolved version to FSB`);
            lineResults.finalLineFSB = lastSuccessfulLine;
            lineResults.applied = true;
            linesFSB[i] = lastSuccessfulLine;
        } else if (allChecksPassed && lastSuccessfulLine === lineFSB) {
            console.log(`  ✓ Line already correct - no changes`);
            lineResults.finalStatus = 'already_correct';
        } else {
            console.log(`  ✗ Not applying changes - checks did not fully pass`);
            lineResults.finalLineFSB = lineFSB;
            lineResults.applied = false;
        }
    }

    // Write updated FSB back to file
    const updatedFSB = linesFSB.join('\n');
    fs.writeFileSync(config.data.bibles.fsbXml, updatedFSB);

    console.log(`\n✓ Line checks complete`);
    console.log(`✓ Results saved to: ${resultsPath}`);
    console.log(`✓ FSB updated at: ${config.data.bibles.fsbXml}`);
}

main().catch(console.error);
