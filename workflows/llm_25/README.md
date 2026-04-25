# llm_25

**Purpose:** Interactive workflow for manual editing with context around specific lines.

**Files Changed:**
- `FSB.xml` - Updated with merged edits after each line
- `FSB_pre.xml` - Backup snapshot created before each edit session
- `temp_context.xml` - Temporary file for manual editing (extracted lines)
- `replacements.json` - Generated differences found after editing

**Workflow:** Manual multi-step process for editing a specific line with surrounding context. Creates a 25-line window around target line, waits for manual edits, then compares with a pre-edit backup to automatically detect changes and generate replacement rules. Allows review and reapplication of changes.
