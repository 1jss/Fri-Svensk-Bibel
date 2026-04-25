# numbers_apply

**Purpose:** Applies previously generated number word-to-numeric conversions to FSB.xml.

**Files Changed:**
- `FSB.xml` - Updated with all replacements from numberReplacements.json applied

**Workflow:** Reads `numberReplacements.json` and applies each old/new pair as a string replacement throughout the entire FSB.xml file. This is the execution step after number conversions have been generated and reviewed.
