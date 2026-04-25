# xml-sync

**Purpose:** Synchronizes database and XML file for verse management and approval workflow.

**Files Changed:**
- `FSB.xml` - Updated with approved verses from database
- Database (FSB.db) - Updated verse status and metadata
- `edits.js` - Log of manual approvals and edits recorded

**Workflow:** Two-way sync between XML and database: `import-xml.js` reads FSB.xml and populates/updates the database with all verses and their line numbers; `export-xml.js` takes approved verses from the database and writes them back to FSB.xml, updating their status and recording the edit in an audit log.
