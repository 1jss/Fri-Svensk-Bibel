const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * UNIFIED FIXER - Consolidates feedback from both expert validators
 * Takes feedback from Facts Expert and Modernization Expert
 * Produces ONE improved version that addresses all concerns
 * 
 * @param {string} line1917 - Original 1917 text (reference for facts)
 * @param {string} currentLine - Current FSB line to improve
 * @param {Object} experts - Object containing feedback from both experts
 *   - experts.facts: {factualChangeDetected, changes, explanation, ...}
 *   - experts.modernization: {needsModernization, archaicElements, suggestions, ...}
 * @param {string} previousLines - Context from previous lines
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Improved text or null if can't improve
 */
async function unifiedFix(line1917, currentLine, experts, previousLines, lineNumber) {
    const cleanCurrent = stripXML(currentLine);
    const clean1917 = stripXML(line1917);
    const cleanPrevious = stripXML(previousLines);

    // Build feedback summary from both experts
    const feedbackList = [];

    if (experts.facts && experts.facts.factualChangeDetected) {
        feedbackList.push(`FACTS EXPERT DETECTED CHANGE: ${experts.facts.explanation}`);
        if (experts.facts.changes && experts.facts.changes.length > 0) {
            feedbackList.push(`  Changes detected: ${experts.facts.changes.join(', ')}`);
        }
    }

    if (experts.modernization && experts.modernization.needsModernization) {
        feedbackList.push(`MODERNIZATION EXPERT: Text contains archaic language`);
        if (experts.modernization.archaicElements && experts.modernization.archaicElements.length > 0) {
            feedbackList.push(`  Archaic elements: ${experts.modernization.archaicElements.join(', ')}`);
        }
        if (experts.modernization.suggestions) {
            feedbackList.push(`  ${experts.modernization.suggestions}`);
        }
    }

    const feedbackText = feedbackList.length > 0 
        ? feedbackList.join('\n') 
        : 'No specific issues but text can be improved';

    // Build consolidated instruction
    const instruction = `Förbättra denna svenska bibeltext:

1. MODERNISERING (primär uppgift):
   - Ersätt ålderdomliga ord: skall→ska, ehuru→fastän, ty→för, etc.
   - Modernisera onaturlig meningsbyggnad
   - Förenkla sammansatta ord där det finns moderna alternativ
   - Undvik semikolon. Använd punkt eller komma istället.
   - Bevara ALLTID exakt samma betydelse som originalet

2. FAKTAKONTROLL (sekundär):
   - Ändra INTE namn eller platser
   - Ändra INTE siffror eller mängder
   - Byt INTE på subjekt-objekt relationer

3. FORMAT:
   - Svara ENDAST med den moderniserade texten
   - Ingen inledning, förklaring eller kommentarer
   - Bibehåll XML-taggar om de finns

ORIGINALET (1917):
"${clean1917}"

NUVARANDE TEXT:
"${cleanCurrent}"

KONTEXT:
"${cleanPrevious}"

EXPERTFEEDBACK:
${feedbackList.length > 0 ? feedbackList.join('\n') : '(Ingen specifik feedback - förbättra med modernisering)'}

Moderniserad text (endast texten, inget annat):`;

    try {
        const result = await runLLMCheck(currentLine, instruction, { debug: false });

        if (!result || !result.trim()) {
            return null;
        }

        // Validate result is different from current
        if (result.trim() === cleanCurrent) {
            return null;
        }

        // Preserve XML structure by replacing only the text content
        // This maintains indentation and formatting
        const improvedLine = currentLine.replace(cleanCurrent, result);

        return {
            proposedLine: improvedLine,
            feedbackAddressed: feedbackList,
            explanation: `Consolidated improvements from ${feedbackList.length} expert(s)`
        };
    } catch (error) {
        return null;
    }
}

module.exports = {
    unifiedFix
};
