const { LMStudioClient, Chat } = require("@lmstudio/sdk");

/**
 * Strip XML tags from text, preserving only the content
 * @param {string} text - Text that may contain XML tags
 * @returns {string} Text without XML tags
 */
function stripXML(text) {
    return text.replace(/<[^>]+>/g, '').trim();
}

/**
 * General LLM runner for processing text with a given instruction
 * @param {string} input - The input text to process (XML will be stripped automatically)
 * @param {string} instruction - The system prompt/instruction for the LLM
 * @param {Object} options - Optional configuration
 * @param {string} options.skipToken - A token the LLM should output if no changes needed or test passes.
 *                                     If LLM output contains this token, the result will be null.
 *                                     Include instructions in `instruction` parameter for LLM to use this token.
 * @param {boolean} options.debug - Enable debug logging
 * @returns {Promise<string|null>} The processed output from the LLM, or null if output contains skipToken
 */
async function runLLMCheck(input, instruction, options = {}) {
    const { skipToken, debug = false } = options;

    // Strip XML from input before processing
    const cleanInput = stripXML(input);

    try {
        const client = new LMStudioClient();
        const model = await client.llm.model();

        const chat = Chat.from([
            { role: "system", content: instruction },
            { role: "user", content: cleanInput }
        ]);

        const result = await model.respond(chat);
        const output = result.content.trim();

        // Check if output contains the skip token
        if (skipToken && output.includes(skipToken)) {
            if (debug) console.log(`Output contains skip token: "${skipToken}"`);
            return null;
        }

        if (debug) {
            console.log(`Input (cleaned): "${cleanInput.substring(0, 100)}${cleanInput.length > 100 ? '...' : ''}"`);
            console.log(`Output: "${output.substring(0, 100)}${output.length > 100 ? '...' : ''}"`);
        }

        return output;
    } catch (error) {
        console.error(`LLM Error: ${error.message}`);
        throw error;
    }
}

/**
 * Process multiple items with batching support
 * @param {Array} items - Array of items to process
 * @param {Function} processFn - Function that takes an item and returns { input, instruction, options }
 * @param {Object} config - Configuration object
 * @param {number} config.startIndex - Start processing from this index (0-based)
 * @param {number} config.batchSize - Number of items to process before logging progress (default: 1)
 * @param {boolean} config.debug - Enable debug logging
 * @returns {Promise<Array>} Array of results with original items and outputs
 */
async function processBatch(items, processFn, config = {}) {
    const { startIndex = 0, batchSize = 1, debug = false } = config;
    const results = [];

    for (let i = startIndex; i < items.length; i++) {
        const item = items[i];
        const { input, instruction, options } = processFn(item, i);

        try {
            const output = await runLLMCheck(input, instruction, { ...options, debug });
            results.push({
                index: i,
                item,
                input,
                output,
                error: null
            });
        } catch (error) {
            results.push({
                index: i,
                item,
                input,
                output: null,
                error: error.message
            });
        }

        if ((i - startIndex + 1) % batchSize === 0) {
            console.log(`Processed ${i - startIndex + 1} items...`);
        }
    }

    return results;
}

module.exports = {
    runLLMCheck,
    processBatch,
    stripXML
};
