# numbers

**Purpose:** Converts number words to numeric form in verses using LLM.

**Files Changed:**
- `FSB.xml` - Updated with numeric replacements for number words
- `numberReplacements.json` - Contains old/new number conversions (e.g., "tjugo" → "20")

**Workflow:** Scans verses for Swedish number words ("tjugo", "trettio", etc.) and uses LLM to convert them to numerals while preserving ordinal words unchanged ("första", "andra"). Generates a replacement log for review and application.
