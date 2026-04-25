# llm_line_checks

**Purpose:** Automated line-by-line verification and correction using LLM checks for spelling, facts, and sentence flow.

**Files Changed:**
- `FSB.xml` - Updated with corrected lines that pass all checks
- `line_checks_results.json` (or `line_checks_results_spelling.json`) - Detailed log of all check attempts and resolutions

**Workflow:** Processes each line from the 1917 Bible version by running two checks: 1) spelling/facts comparison against FSB, and 2) sentence flow validation. If issues are found, attempts automated resolution and re-checks. Only applies changes when all checks pass. Includes separate modes for full checks, spelling-only, or flow-only validation.
