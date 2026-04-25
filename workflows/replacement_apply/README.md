# replacement_apply

**Purpose:** Applies validated replacement rules to FSB.xml.

**Files Changed:**
- `FSB.xml` - Updated with all replacements from replacements.json applied
- `replacements.json` - Updated to remove successfully applied entries

**Workflow:** Takes `replacements.json` (containing old/new text pairs) and applies each replacement to FSB.xml. Tracks which replacements were successfully applied versus skipped (already changed or not found) and updates the file with remaining unapplied replacements.
