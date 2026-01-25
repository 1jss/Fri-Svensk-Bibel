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

    const clean1917 = stripXML(line1917);
    const cleanFSB = stripXML(lineFSB);

    // Use the same modernization prompt as prompter.js, but add feedback about what changed
    const instruction = `Du är en expert på svensk språkvård. Din uppgift är att modernisera gammal svensk text till modern, naturlig svenska.

Regler:
* Ersätt ålderdomliga ord (t.ex. "skall" -> "ska", "ehuru" -> "fastän").
* Modernisera meningsbyggnad om den känns onaturlig, men bevara ALLTID betydelsen exakt.
* Undvik sammansatta ord.
* Ändra INTE namn eller stavning på personer eller platser.
* Svara ENDAST med den moderniserade texten. Ingen inledning eller förklaring.

Feedback från föregående försök:
${checkResult.analysis}

Förra försöket gav:
"${cleanFSB}"

Modernisera texten på ett ANNORLUNDA sätt, och åtgärda problemet som angavs i feedbacken:`;

    try {
        const result = await runLLMCheck(cleanFSB, instruction, { debug: false });
        
        // If we got a response (not null), use it as the proposed text
        if (result) {
            // Use find and replace to preserve indentation and XML structure
            // Replace the current FSB text with the modernized 1917 text within the original line
            const proposedLine = lineFSB.replace(cleanFSB, result);

            return {
                lineNumber,
                resolver: 'spelling_facts',
                resolved: true,
                proposedLine: proposedLine,
                explanation: `Modernized 1917 text using Swedish language rules`,
                error: null
            };
        }
        
        // If result is null, couldn't resolve
        return {
            lineNumber,
            resolver: 'spelling_facts',
            resolved: false,
            proposedLine: lineFSB,
            explanation: 'Could not generate better version',
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
