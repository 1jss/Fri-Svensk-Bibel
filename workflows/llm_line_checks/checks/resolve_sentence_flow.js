const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Resolver for sentence flow issues
 * Takes check results and proposes a corrected version that maintains flow
 * 
 * @param {string} currentLine - Current FSB line to resolve
 * @param {string} previousLines - Context from previous lines
 * @param {Object} checkResult - Result from checkSentenceFlow
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Resolution result with proposed text
 */
async function resolveSentenceFlow(currentLine, previousLines, checkResult, lineNumber) {
    // If check shows no issues, nothing to resolve
    if (!checkResult.hasIssues) {
        return {
            lineNumber,
            resolver: 'sentence_flow',
            resolved: false,
            proposedLine: currentLine,
            explanation: 'No resolution needed - flow is OK',
            error: null
        };
    }

    // Parse XML structure to preserve it
    const openingTagMatch = currentLine.match(/^\s*(<[^>]+>)/);
    const closingTagMatch = currentLine.match(/(<\/[^>]+>)\s*$/);
    const openingTag = openingTagMatch ? openingTagMatch[1] : '';
    const closingTag = closingTagMatch ? closingTagMatch[1] : '';
    
    const cleanCurrent = stripXML(currentLine);
    const cleanPrevious = stripXML(previousLines);

    const SKIP_TOKEN = "FLOW_RESOLVED";
    const instruction = `Du är en svensk språkexpert specialiserad på bibeltexter. En rad behöver korrigeras för att flöda bättre tillsammans med föregående text.

Föregående kontext:
"${cleanPrevious}"

Nuvarande rad (problemrad):
"${cleanCurrent}"

Problem identifierade:
- Flow issues: ${checkResult.flowIssues.join(', ')}
- Consistency issues: ${checkResult.consistencyIssues.join(', ')}

Skapa en ny version som:
1. Löser flow-problemen
2. Använder samma terminologi som kontexten
3. Flödar naturligt från föregående rad
4. Behåller samma betydelse

Skriv bara den nya texten, ingenting annat.
Om du inte kan förbättra den, svara med: ${SKIP_TOKEN}`;

    try {
        const result = await runLLMCheck(cleanCurrent, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If null, it means LLM output the skip token - can't resolve further
        if (result === null) {
            return {
                lineNumber,
                resolver: 'sentence_flow',
                resolved: false,
                proposedLine: currentLine,
                explanation: `Could not improve flow: ${checkResult.suggestions || 'No suggestions'}`,
                error: null
            };
        }

        // Rebuild with XML structure
        const proposedLine = openingTag ? `${openingTag}${result}${closingTag}` : result;

        return {
            lineNumber,
            resolver: 'sentence_flow',
            resolved: true,
            proposedLine: proposedLine,
            explanation: `Fixed flow and consistency issues`,
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            resolver: 'sentence_flow',
            resolved: false,
            proposedLine: currentLine,
            explanation: null,
            error: error.message
        };
    }
}

module.exports = {
    resolveSentenceFlow
};
