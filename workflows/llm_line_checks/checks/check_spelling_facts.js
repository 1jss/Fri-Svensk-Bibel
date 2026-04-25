const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Facts Expert
 * Compares 1917 original with FSB current to verify no factual changes
 * 
 * Checks:
 * - No names/places changed
 * - No numbers/quantities changed
 * - No subject-object switches
 * - Meaning preserved exactly
 * 
 * IGNORES: Archaic→modern word replacements, style changes, modernization
 * 
 * @param {string} original1917 - The 1917 version of this line
 * @param {string} currentFSB - The FSB version of this line
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Facts check result
 */
async function checkFacts(original1917, currentFSB, lineNumber) {
    const SKIP_TOKEN = "NO_FACT_CHANGES";
    const clean1917 = stripXML(original1917);
    const cleanFSB = stripXML(currentFSB);

    const instruction = `Jämför två bibelversioner för faktiska ändringar.

FOKUS: Är innehållet samma?

Flagga bara om detta gjordes:
- Namn/platser ändrade
- Siffror ändrade
- Subjekt/objekt byte
- Betydelse förändrad

IGNORERA (modernisering, inga faktaändringar):
- Casing skillnader (HERREN/herren är samma)
- "I" → "du/ni" (gammalt formellt tilltal → modern)
- "ljungeldar" → "blixtar" (samma fenomen)
- "förbarma sig" → "ha förbarmande" (samma handling)
- Arkaiska ord → moderna motsvarigheter
- Ändrad ordföljd (om betydelsen är samma)

1917: "${clean1917}"
FSB: "${cleanFSB}"

Om ingen faktaförändring: ${SKIP_TOKEN}
Om ändringar: {"factualChangeDetected":true,"changes":["x"],"explanation":"y"}`;

    try {
        const result = await runLLMCheck(original1917, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null, it means LLM output the skip token - no changes needed
        if (result === null) {
            return {
                lineNumber,
                check: 'facts',
                factualChangeDetected: false,
                changes: [],
                explanation: null,
                error: null
            };
        }

        // Parse factual changes
        let parsed = null;
        try {
            parsed = JSON.parse(result);
        } catch (e) {
            // Try to extract JSON more carefully
            try {
                const jsonMatch = result.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                }
            } catch (e2) {
                // If can't parse JSON but mentions changes
                if (result.toLowerCase().includes('ändr') || result.toLowerCase().includes('förändra')) {
                    return {
                        lineNumber,
                        check: 'facts',
                        factualChangeDetected: true,
                        changes: [result.substring(0, 100)],
                        explanation: 'Faktisk förändring detekterad',
                        error: null
                    };
                }
            }
        }

        if (!parsed) {
            return {
                lineNumber,
                check: 'facts',
                factualChangeDetected: false,
                changes: [],
                explanation: null,
                error: null
            };
        }

        return {
            lineNumber,
            check: 'facts',
            factualChangeDetected: parsed?.factualChangeDetected || false,
            changes: parsed?.changes || [],
            explanation: parsed?.explanation || null,
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            check: 'facts',
            factualChangeDetected: false,
            changes: [],
            explanation: null,
            error: `Facts check error: ${error.message.substring(0, 50)}`
        };
    }
}

module.exports = {
    checkFacts
};
