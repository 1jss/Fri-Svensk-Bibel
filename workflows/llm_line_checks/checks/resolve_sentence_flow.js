const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Resolver for sentence punctuation and flow issues
 * Fixes comma/period issues between lines and capitalization
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
            explanation: 'No punctuation issues detected',
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

    const SKIP_TOKEN = "PUNCTUATION_FIXED";
    const instruction = `Fix punctuation/capitalization:
Prev: "${cleanPrevious}"
Curr: "${cleanCurrent}"
Should end with: ${checkResult.previousLineShouldEndWith || "?"}
Should start with: ${checkResult.currentLineShouldStartWith || "?"}
Reply with only fixed current text, or ${SKIP_TOKEN}`;

    try {
        const result = await runLLMCheck(cleanCurrent, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If null, it means LLM output the skip token - can't fix
        if (result === null) {
            return {
                lineNumber,
                resolver: 'sentence_flow',
                resolved: false,
                proposedLine: currentLine,
                explanation: `Could not fix punctuation: ${checkResult.suggestions || ''}`,
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
            explanation: `Fixed punctuation and/or capitalization`,
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
