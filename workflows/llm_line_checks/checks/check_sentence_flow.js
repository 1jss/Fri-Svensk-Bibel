const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Check 2: Sentence flow and consistency
 * Look at the current line together with previous lines to ensure:
 * - Smooth sentence/paragraph flow
 * - Consistent wording and terminology
 * 
 * @param {string} currentLine - The current line to check
 * @param {string} previousLines - Context from previous lines (typically 1-3 lines)
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Result with flow analysis and suggestions
 */
async function checkSentenceFlow(currentLine, previousLines, lineNumber) {
    const SKIP_TOKEN = "PUNCTUATION_OK";
    const instruction = `Check punctuation between lines:
Previous: "${stripXML(previousLines)}"
Current: "${stripXML(currentLine)}"

What should prev line end with? What case should current start with?
Reply ${SKIP_TOKEN} if OK, else {"previousLineShouldEndWith":"punctuation","currentLineShouldStartWith":"case","explanation":"..."}`;

    try {
        const result = await runLLMCheck(currentLine, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null, it means LLM output the skip token - punctuation is OK
        if (result === null) {
            return {
                lineNumber,
                check: 'sentence_flow',
                hasIssues: false,
                flowIssues: [],
                consistencyIssues: [],
                suggestions: null,
                severity: 'low',
                error: null
            };
        }
        
        let parsed = null;
        try {
            parsed = JSON.parse(result);
        } catch (e) {
            // Try to extract JSON from the response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        }

        const hasIssues = parsed && (
            parsed.previousLineShouldEndWith !== undefined ||
            parsed.currentLineShouldStartWith !== undefined
        );

        return {
            lineNumber,
            check: 'sentence_flow',
            hasIssues: hasIssues || false,
            flowIssues: parsed?.explanation ? [parsed.explanation] : [],
            consistencyIssues: [],
            previousLineShouldEndWith: parsed?.previousLineShouldEndWith || null,
            currentLineShouldStartWith: parsed?.currentLineShouldStartWith || null,
            suggestions: parsed?.explanation || null,
            severity: parsed?.severity || 'low',
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            check: 'sentence_flow',
            hasIssues: false,
            flowIssues: [],
            consistencyIssues: [],
            previousLineShouldEndWith: null,
            currentLineShouldStartWith: null,
            suggestions: null,
            severity: 'low',
            error: error.message
        };
    }
}

module.exports = {
    checkSentenceFlow
};
