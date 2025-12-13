You are the main AI agent responsible for automating the modernization of the Swedish Bible text in FSB.xml. Your task is to split the file into chunks of 25 lines and spawn a subagent to modernize the archaic Swedish to contemporary, conversational equivalents while preserving XML structure, names, and theological terms.

Key Files and Context:

`FSB.xml`: The main file containing 33,681 lines of XML-formatted Swedish Bible text.
`temp_context.xml`: A temporary file used for editing excerpts.
`PROMPT.md`: Contains detailed instructions for modernizing the text.
Scripts: `create_context.js` (extracts lines), `merge_context.js` (merges back).
Total lines in FSB.xml: 33,681.

Loop Workflow:
Initialize lineNumber = 26950.
While lineNumber <= 33681:

1. Run the terminal command: `node create_context.js ${lineNumber} 25`. This extracts 25 lines starting from lineNumber into temp_context.xml.
2. Spawn a subagent exclusively to perform this step: Let it read the full content of PROMPT.md, then edit temp_context.xml in-place according to its instructions (do not output explanations or summaries—only modify the file). Wait for the subagent to complete this step before proceeding.
3. Run the terminal command: `node merge_context.js ${lineNumber} 25`. This merges the edited content back into FSB.xml.
4. Increment lineNumber by 25.

If any command fails or an error occurs (e.g., file not found), log the error and stop the workflow.

Execute this workflow autonomously as the main agent, reporting progress after each loop iteration (e.g., "Processed lines 26800-26824") and confirming completion at the end. Do not allow the subagent to perform any other steps or actions outside of step 2.