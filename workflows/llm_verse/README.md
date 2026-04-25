# llm_verse

**Purpose:** Modernizes outdated Swedish language in individual verses using LLM.

**Files Changed:**
- `FSB.xml` - Updated with modernized verse text
- `replacements.json` - Contains old/new verse pairs found during processing

**Workflow:** Scans verses in FSB.xml and uses LLM to modernize archaic Swedish words and phrasing (e.g., "skall" → "ska", "ehuru" → "fastän") while preserving meaning. Generates a replacement log that can be applied later. Also includes an apply variant (`prompter_apply.js`) to apply saved replacements back to the XML.
