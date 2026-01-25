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
    const instruction = `Du är en bibelöversättningsexpert. Verifiera att en föreslagen översättning behåller alla faktiska detaljer från originalversionen.

Originaltext (1917): "${clean1917}"
Föreslagen text: "${cleanProposed}"

Bedöm:
1. Behålls alla namn, platser och siffror från originalversionen?
2. Finns det några faktiska skillnader?

Om texten är korrekt och bevarar alla fakta, svara med: ${SKIP_TOKEN}

Om det finns problem, svara med JSON:
{
  "issues": ["lista över problem"],
  "confidence": 0.0-1.0
}`;

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
    const instruction = `Du är en bibelöversättningsexpert. Jämför två versioner av samma bibeltext och bestäm:

1. Om namn, platser, eller faktiska uppgifter (som tal, datum) har förändrats mellan dem.
2. Om de har förändrats, föreslå en version som:
   - Behåller exakt stavning och faktiska detaljer från 1917-versionen
   - Men använder modernare svenska språk från FSB-versionen

Om inga faktiska ändringar behövs eller om 1917 och FSB redan har samma fakta, svara med: ${SKIP_TOKEN}

Om ändringar behövs, svara med JSON:
{
  "changed": true,
  "details": "Kort beskrivning av vad som ändrats",
  "proposed": "Den föreslagna texten"
}

1917-version: "${parsed1917.textContent}"
FSB-version: "${parsedFSB.textContent}"`;

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

        // If a change is proposed, validate it
        let validated = null;
        if (parsed?.proposed && parsed?.changed) {
            validated = await validateProposedText(parsed1917.textContent, parsed.proposed);
            
            // If validation fails, don't use the proposed text
            if (!validated.isValid) {
                parsed.proposed = null;
            }
        }

        // If we have a valid proposal, rebuild it with original XML structure
        let finalProposed = null;
        if (parsed?.proposed && parsedFSB.hasXML) {
            finalProposed = `${parsedFSB.openingTag}${parsed.proposed}${parsedFSB.closingTag}`;
        } else if (parsed?.proposed) {
            finalProposed = parsed.proposed;
        }

        return {
            lineNumber,
            check: 'spelling_facts',
            changed: parsed?.changed || false,
            analysis: parsed?.details || null,
            proposed: finalProposed,
            validated: validated,
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
