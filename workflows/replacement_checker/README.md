# replacement_checker

**Purpose:** Validates that replacement rules preserve meaning using LLM comparison.

**Files Changed:**
- `replacementsUnchecked.json` - Split into approved/rejected pairs
- `replacementsChecked.json` - Stores rejected replacements with LLM reasoning

**Workflow:** Takes unchecked replacements and uses LLM to compare the original 1917 text against the proposed new text. Approves replacements where meaning is identical (LIKA) and rejects where meaning differs (OLIKA). Includes a cleanup step (`purge_matched.js`) to remove replacements that have already been applied to the XML.
