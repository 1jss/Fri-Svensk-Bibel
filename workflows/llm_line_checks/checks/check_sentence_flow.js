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
    const SKIP_TOKEN = "FLOW_OK";
    const instruction = `Du är en svensk språkexpert specialiserad på bibeltexter. Analysera flöde och konsistens i följande text:

Föregående kontext:
"${stripXML(previousLines)}"

Nuvarande rad:
"${stripXML(currentLine)}"

Bedöm:
1. Flödar texten naturligt från föregående kontext?
2. Används samma terminologi och ordval som i kontexten?
3. Finns det några ordval som bryter mot konsistensen?

Om texten flödar bra och är konsistent, svara med: ${SKIP_TOKEN}

Om det finns problem, svara med JSON:
{
  "flowIssues": ["lista över flödesproblem"],
  "consistencyIssues": ["lista över konsistensasproblem"],
  "suggestions": "Förslag till förbättringar",
  "severity": "low|medium|high"
}

Svara ENDAST med ${SKIP_TOKEN} eller JSON.`;

    try {
        const result = await runLLMCheck(currentLine, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null, it means LLM output the skip token - flow is OK
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
            (parsed.flowIssues && parsed.flowIssues.length > 0) ||
            (parsed.consistencyIssues && parsed.consistencyIssues.length > 0)
        );

        return {
            lineNumber,
            check: 'sentence_flow',
            hasIssues: hasIssues || false,
            flowIssues: parsed?.flowIssues || [],
            consistencyIssues: parsed?.consistencyIssues || [],
            suggestions: parsed?.suggestions || null,
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
            suggestions: null,
            severity: 'low',
            error: error.message
        };
    }
}

module.exports = {
    checkSentenceFlow
};
