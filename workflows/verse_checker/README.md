# verse_checker

**Purpose:** Identifies verses where meaning differs between 1917 and FSB using LLM verification.

**Files Changed:**
- `checks.json` - Updated with line numbers where meaning changed (marked OLIKA)

**Workflow:** Compares each non-identical verse pair between 1917.xml and FSB.xml using LLM. Uses the same comparison logic as replacement_checker to determine if meaning is preserved. Records line numbers of verses with meaning changes to a results file for later review or correction.
