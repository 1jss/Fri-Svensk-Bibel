const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Resolver for spelling and facts issues
 * Takes check results and proposes a corrected version
 * 
 * @param {string} line1917 - Original 1917 text
 * @param {string} lineFSB - Current FSB text to resolve
 * @param {Object} checkResult - Result from checkSpellingAndFacts
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Resolution result with proposed text
 */
async function resolveSpellingAndFacts(line1917, lineFSB, checkResult, lineNumber) {
    // If check shows no changes needed, nothing to resolve
    if (!checkResult.changed) {
        return {
            lineNumber,
            resolver: 'spelling_facts',
            resolved: false,
            proposedLine: lineFSB,
            explanation: 'No resolution needed - check passed',
            error: null
        };
    }

    // Parse XML structure to preserve it
    const openingTagMatch = lineFSB.match(/^\s*(<[^>]+>)/);
    const closingTagMatch = lineFSB.match(/(<\/[^>]+>)\s*$/);
    const openingTag = openingTagMatch ? openingTagMatch[1] : '';
    const closingTag = closingTagMatch ? closingTagMatch[1] : '';
    
    const clean1917 = stripXML(line1917);
    const cleanFSB = stripXML(lineFSB);

    const SKIP_TOKEN = "RESOLVED_CORRECTLY";
    const instruction = `Du är en bibelöversättningsexpert. En rad behöver korrigeras för att behålla fakta från 1917-versionen medan modern svenska används.

1917-version (original fakta): "${clean1917}"
FSB-version (nuvarande): "${cleanFSB}"

Skriv en version som:
1. Behåller alla namn, platser, och siffror från 1917-versionen
2. Använder modernt svenska från FSB-versionen
3. Flödar naturligt

Om du kan skapa en bättre version, skriv bara den nya texten, ingenting annat.
Om du inte kan förbättra den, svara med: ${SKIP_TOKEN}`;

    try {
        const result = await runLLMCheck(cleanFSB, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If null, it means LLM output the skip token - can't resolve further
        if (result === null) {
            return {
                lineNumber,
                resolver: 'spelling_facts',
                resolved: false,
                proposedLine: lineFSB,
                explanation: 'Could not generate better version',
                error: null
            };
        }

        // Rebuild with XML structure
        const proposedLine = openingTag ? `${openingTag}${result}${closingTag}` : result;

        return {
            lineNumber,
            resolver: 'spelling_facts',
            resolved: true,
            proposedLine: proposedLine,
            explanation: `Generated improved version preserving 1917 facts`,
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            resolver: 'spelling_facts',
            resolved: false,
            proposedLine: lineFSB,
            explanation: null,
            error: error.message
        };
    }
}

module.exports = {
    resolveSpellingAndFacts
};
