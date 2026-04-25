const fs = require('fs');
const path = require('path');
const config = require('../../config.js');
// Experts (validators)
const { checkFacts } = require('./checks/check_spelling_facts.js');
const { checkModernization } = require('./checks/check_modernization.js');
// Unified Fixer
const { unifiedFix } = require('./checks/unified_fixer.js');
const { stripXML } = require('../../utils/llm-runner.js');

  /**
   * Main orchestrator for line-by-line LLM checks with resolver loop
   * For each line: Check facts, check modernization, fix if needed, repeat up to 3 times
   * Only applies changes if BOTH experts pass. Otherwise keeps best version reached.
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

        // Get context (previous lines)
        let contextLines1917 = '';
        if (i > 0) {
            for (let j = Math.max(0, i - contextLines); j < i; j++) {
                contextLines1917 += lines1917[j] + '\n';
            }
        }

        const lineKey = `line_${i + 1}`;

        // EXPERT VALIDATION LOOP - Permissive Mode
        let attempt = 0;
        let allChecksPassed = false;
        let currentLine = lineFSB;

        while (attempt < maxFailedAttempts && !allChecksPassed) {
            attempt++;
            console.log(`  Attempt ${attempt}/${maxFailedAttempts}:`);

            // === EXPERT VALIDATION PHASE ===
            console.log(`    - Running expert validators...`);
            
            // Facts Expert: Checks if meaning is preserved from 1917
            const factsExpert = await checkFacts(line1917, currentLine, i + 1);
            
            // Modernization Expert: Checks if text needs modernization
            const modernizationExpert = await checkModernization(currentLine, i + 1);

            // Check if all experts are satisfied
            const factsOK = !factsExpert.factualChangeDetected && !factsExpert.error;
            const modernizationOK = !modernizationExpert.needsModernization && !modernizationExpert.error;
            allChecksPassed = factsOK && modernizationOK;

            if (allChecksPassed) {
                console.log(`    ✓ All experts satisfied!`);
                break;
            }

            // === LOG EXPERT FEEDBACK ===
            let issueCount = 0;
            if (!factsOK) {
                if (factsExpert.error) {
                    console.log(`    ⚠ Facts Expert error: ${factsExpert.error}`);
                } else if (factsExpert.factualChangeDetected) {
                    console.log(`    ✗ Facts Expert: "${factsExpert.explanation}"`);
                    issueCount++;
                }
            }

            if (!modernizationOK) {
                if (modernizationExpert.error) {
                    console.log(`    ⚠ Modernization Expert error: ${modernizationExpert.error}`);
                } else if (modernizationExpert.needsModernization) {
                    const elemList = modernizationExpert.archaicElements.join(', ');
                    console.log(`    ✗ Modernization Expert: ${elemList}`);
                    issueCount++;
                }
            }

            // If max attempts reached
            if (attempt >= maxFailedAttempts) {
                console.log(`  Max attempts (${maxFailedAttempts}) reached`);
                break;
            }

            // === UNIFIED FIXER PHASE ===
            // Consolidate all expert feedback and produce ONE improved version
            console.log(`    - Unified fixer consolidating ${issueCount} expert feedback...`);
            const fixResult = await unifiedFix(
                line1917,
                currentLine,
                {
                    facts: factsExpert,
                    modernization: modernizationExpert
                },
                contextLines1917,
                i + 1
            );

            if (fixResult) {
                console.log(`      ✓ Improvement applied`);
                currentLine = fixResult.proposedLine;

                // Continue to next attempt with improved version
                if (attempt < maxFailedAttempts) {
                    console.log(`    - Continuing to next attempt...`);
                }
            } else {
                console.log(`    - No improvement possible - stopping`);
                break;
            }
        }

        if (attempt >= maxFailedAttempts && !allChecksPassed) {
            console.log(`  Max attempts (${maxFailedAttempts}) reached - applying best version`);
        }

        // === APPLICATION PHASE ===
        // Apply the best version reached (permissive mode)
        if (currentLine !== lineFSB) {
            console.log(`  ✓ Applying improved version to FSB`);
            linesFSB[i] = currentLine;
            
            if (allChecksPassed) {
                console.log(`    All experts satisfied!`);
            } else {
                console.log(`    Best effort after ${attempt} attempt(s)`);
            }
        } else {
            console.log(`  ✓ Already correct - no changes`);
        }

        // Write updated FSB back to file after each line
        const updatedFSB = linesFSB.join('\n');
        fs.writeFileSync(config.data.bibles.fsbXml, updatedFSB);
    }

    // Final write to ensure all changes are saved
    const finalFSB = linesFSB.join('\n');
    fs.writeFileSync(config.data.bibles.fsbXml, finalFSB);

    console.log(`\n✓ Line checks complete`);
    console.log(`✓ FSB updated at: ${config.data.bibles.fsbXml}`);
}

main().catch(console.error);
