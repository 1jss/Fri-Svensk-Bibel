# numbers_checker

**Purpose:** Validates and filters number replacements to ensure quality before application.

**Files Changed:**
- `numberReplacements.json` - Filtered to remove invalid or problematic replacements

**Workflow:** Examines each replacement in `numberReplacements.json` and removes entries that don't meet quality criteria: identical old/new, numbers below 10, no numbers in result, or more words in result than original. Can run in dry-run mode to preview removals without modifying the file.
