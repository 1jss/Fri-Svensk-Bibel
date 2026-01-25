const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Extract text content from an XML line while preserving attributes
 * @param {string} line - The XML line
 * @returns {Object} { fullLine, textContent, openingTag, closingTag, hasXML }
 */
function parseXMLLine(line) {
    // Match opening and closing tags
    const openingTagMatch = line.match(/^\s*(<[^>]+>)/);
    const closingTagMatch = line.match(/(<\/[^>]+>)\s*$/);
    
    if (openingTagMatch && closingTagMatch) {
        const openingTag = openingTagMatch[1];
        const closingTag = closingTagMatch[1];
        const textContent = stripXML(line);
        
        return {
            fullLine: line,
            textContent: textContent,
            openingTag: openingTag,
            closingTag: closingTag,
            hasXML: true
        };
    }
    
    return {
        fullLine: line,
        textContent: line.trim(),
        openingTag: null,
        closingTag: null,
        hasXML: false
    };
}

/**
 * Validate that proposed text maintains facts from 1917 version
 * @param {string} text1917 - Original 1917 text (will be stripped of XML)
 * @param {string} proposedText - The proposed modernized text (will be stripped of XML)
 * @returns {Promise<Object>} Validation result
 */
async function validateProposedText(text1917, proposedText) {
    // Ensure texts are clean of XML
    const clean1917 = stripXML(text1917);
    const cleanProposed = stripXML(proposedText);
    const SKIP_TOKEN = "OK_FACTS_PRESERVED";
    const instruction = `Check if proposed text preserves CRITICAL facts: names, places, numbers, meaning. Ignore synonyms/rewording.
1917: "${clean1917}"
Proposed: "${cleanProposed}"
Reply ${SKIP_TOKEN} if OK, else {"issues":["list"],"confidence":0.0-1.0}`;

    try {
        const result = await runLLMCheck(cleanProposed, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null, it means LLM output the skip token - all is OK
        if (result === null) {
            return {
                isValid: true,
                issues: [],
                confidence: 1.0
            };
        }

        // Otherwise, parse the error response
        let parsed = null;
        try {
            parsed = JSON.parse(result);
        } catch (e) {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        }
        return {
            isValid: false,
            issues: parsed?.issues || [result],
            confidence: parsed?.confidence || 0
        };
    } catch (error) {
        return {
            isValid: false,
            issues: [`Validation error: ${error.message}`],
            confidence: 0
        };
    }
}

/**
 * Check 1: Are names, places, or facts changed between 1917 and FSB?
 * If changed, propose a version that keeps 1917 spelling/facts but uses modern language.
 * 
 * @param {string} line1917 - The line from 1917 version
 * @param {string} lineFSB - The line from FSB version
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Result with analysis and proposed text if needed
 */
async function checkSpellingAndFacts(line1917, lineFSB, lineNumber) {
    // Parse XML structure
    const parsed1917 = parseXMLLine(line1917);
    const parsedFSB = parseXMLLine(lineFSB);
    
    // Skip if text content is identical
    if (parsed1917.textContent === parsedFSB.textContent) {
        return {
            lineNumber,
            check: 'spelling_facts',
            changed: false,
            analysis: null,
            proposed: null,
            validated: null,
            error: null
        };
    }

    const SKIP_TOKEN = "NO_FACT_CHANGES";
    const instruction = `Compare 1917 vs FSB for FACT CHANGES ONLY.
IGNORE: word choice synonyms, archaic→modern language updates, grammar updates, spelling modernization.
FLAG ONLY: Names changed, numbers changed, places changed, theological meaning altered, events described differently.

Examples of ACCEPTABLE changes (reply ${SKIP_TOKEN}):
- "därav" → "av det" (both mean "of it")
- "ty" → "för" (both mean "therefore/because")
- "skall du icke" → "ska du inte" (archaic→modern)

1917: "${parsed1917.textContent}"
FSB: "${parsedFSB.textContent}"

If no fact changes, reply: ${SKIP_TOKEN}
If fact changes detected, explain briefly what changed.`;

    try {
        const result = await runLLMCheck(parsedFSB.textContent, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null, it means LLM output the skip token - no changes needed
        if (result === null) {
            return {
                lineNumber,
                check: 'spelling_facts',
                changed: false,
                analysis: 'No fact/spelling changes detected',
                proposed: null,
                validated: null,
                error: null
            };
        }

        // LLM returned an explanation of fact changes
        return {
            lineNumber,
            check: 'spelling_facts',
            changed: true,
            analysis: result.substring(0, 200),
            proposed: null,
            validated: null,
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            check: 'spelling_facts',
            changed: false,
            analysis: null,
            proposed: null,
            validated: null,
            error: error.message
        };
    }
}

module.exports = {
    checkSpellingAndFacts
};
