const fs = require('fs');
const path = require('path');
const config = require('../../../config.js');
const { runLLMCheck, stripXML } = require('../../../utils/llm-runner.js');

/**
 * Modernization Expert
 * Checks if the text contains archaic language or outdated sentence structures
 * that should be modernized to contemporary Swedish.
 * 
 * Only reads FSB text (not 1917), focuses purely on modernization needs.
 * 
 * @param {string} currentLine - The current line to check for archaic language
 * @param {number} lineNumber - Line number for reference
 * @returns {Promise<Object>} Modernization check result
 */
async function checkModernization(currentLine, lineNumber) {
    const SKIP_TOKEN = "MODERNIZED";
    const cleanCurrent = stripXML(currentLine);

    const instruction = `Du är expert på att identifiera arkaisk svenska som behöver moderniseras.

FOKUS: Behöver denna text moderniseras?

Saker att flagga:
- Ålderdomliga ord: skall, ehuru, ty, voro, etc.
- Ålderdomlig meningsbyggnad som känns onaturlig idag
- Sammansatta ord som kan förenklas
- Arkaiska prepositioner eller ordföljd
- Felaktig stavning eller svensk grammatik (var strikt)

IGNORERA (dessa är OK):
- Namn och platser (bibehålls som de är)
- Siffror och tal (bibehålls som de är)
- Bibliska/teologiska termer

Text att kontrollera:
"${cleanCurrent}"

Om texten redan är modern och naturlig svenska, svara: ${SKIP_TOKEN}

Om texten behöver moderniseras, svara MED DENNA STRUKTUR:
{
  "needsModernization": true,
  "archaicElements": ["element1", "element2"],
  "suggestions": "Kort förklaring av vad som bör ändras"
}

Exempel:
- Input: "Han skall gå till hennes hus"
- Output: {"needsModernization": true, "archaicElements": ["skall"], "suggestions": "Ersätt 'skall' med 'ska'"}

- Input: "Herren sa till honom"
- Output: ${SKIP_TOKEN}`;

    try {
        const result = await runLLMCheck(currentLine, instruction, { skipToken: SKIP_TOKEN, debug: false });
        
        // If result is null or equals SKIP_TOKEN, modernization not needed
        if (result === null || result.includes(SKIP_TOKEN)) {
            return {
                lineNumber,
                check: 'modernization',
                needsModernization: false,
                archaicElements: [],
                suggestions: null,
                error: null
            };
        }

        // Parse modernization feedback
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
                // If can't parse JSON but response suggests modernization needed
                if (result.toLowerCase().includes('moderniz') || result.toLowerCase().includes('arkaisk')) {
                    return {
                        lineNumber,
                        check: 'modernization',
                        needsModernization: true,
                        archaicElements: [result.substring(0, 80)],
                        suggestions: 'Arkaisk språk detekterad - behöver modernisering',
                        error: null
                    };
                }
            }
        }

        if (!parsed) {
            return {
                lineNumber,
                check: 'modernization',
                needsModernization: false,
                archaicElements: [],
                suggestions: null,
                error: null
            };
        }

        return {
            lineNumber,
            check: 'modernization',
            needsModernization: parsed?.needsModernization || false,
            archaicElements: parsed?.archaicElements || [],
            suggestions: parsed?.suggestions || null,
            error: null
        };
    } catch (error) {
        return {
            lineNumber,
            check: 'modernization',
            needsModernization: false,
            archaicElements: [],
            suggestions: null,
            error: `Modernization check error: ${error.message.substring(0, 50)}`
        };
    }
}

module.exports = {
    checkModernization
};
