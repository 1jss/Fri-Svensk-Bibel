# diff_finder

**Purpose:** Compares two versions of the Bible XML to identify word-level differences.

**Files Changed:**
- `replacements.json` - Generated/updated with detected differences between lines

**Workflow:** Scans the FSB.xml file against the FSB_pre.xml file to find where single words have been changed while keeping surrounding words identical. Creates a structured list of old/new word pairs for review and potential replacement.
