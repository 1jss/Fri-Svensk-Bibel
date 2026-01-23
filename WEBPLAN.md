# Web Application Rewrite Plan - FSB Approval & Review System

## Project Overview

**Goal**: Rebuild the web/prod application as a mobile-first side-by-side approval interface for FSB (Fri-Svensk-Bibel) verses with optional inline edits, backed by SQLite and bidirectional XML sync.

**Key Principles**:
- **Phone-first**: Minimal friction, fast tapping workflow
- **Simple approval**: Most verses already edited—just mark as approved
- **Optional inline edits**: Quick fixes without modal dialogs
- **Reference-only**: 1917 text is read-only reference
- **Line number preservation**: Track actual XML line numbers
- **Bidirectional XML**: Import from and export to XML (other processes also edit)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Simple PHP Web Script (web/prod/index.php)      │
│  - Multi-verse Bible flow view (with context)           │
│  - Verse picker (jump to book/chapter/verse)            │
│  - Approval panel (1917 ref / FSB editable)             │
│  - Next/Prev verse navigation                           │
│  - Direct SQLite queries (no separate API layer)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SQLite Database                            │
│  (Approval status tracking)                             │
│  Table: verses                                          │
│  - id, book, chapter, verse_num, xml_line_num           │
│  - text_1917, text_fsb, approved                        │
└──────────────────────┬──────────────────────────────────┘
          ▲            │
          │            │
    (read/write)       │
          │            │
          └────────────┘
                       
┌─────────────────────────────────────────────────────────┐
│      Node.js Sync Scripts (workflows/xml-sync/)         │
│  - import-xml.js: Load FSB.xml & 1917.xml → DB         │
│  - export-xml.js: Save APPROVED verses from DB → XML   │
│  - Run manually or via cron                             │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  XML Files (data/bibles/FSB.xml & 1917.xml)             │
│  - FSB.xml: synced with DB (approved verses only)       │
│  - 1917.xml: read-only reference                        │
│  - Other processes may also edit FSB.xml                │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model (SQLite Schema)

### Single Table Design

```sql
CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,              -- e.g., "matt", "1mos"
  book_number INTEGER,             -- 1-66 for ordering
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  xml_line_number INTEGER,         -- Actual line in FSB.xml (for traceability)
  text_1917 TEXT NOT NULL,         -- 1917 translation (read-only reference)
  text_fsb TEXT NOT NULL,          -- FSB text (editable, reflects XML state)
  approved BOOLEAN DEFAULT 0,      -- 0=pending approval, 1=approved
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(book, chapter, verse_number)
);
```

**Rationale**:
- Minimal schema: just tracks approval status
- `text_fsb` is always synced with FSB.xml (not a working copy)
- `xml_line_number` enables traceability back to original source
- No edit history, no user tracking, no timestamps
- DB is lightweight—primarily for approval status, XML is source of truth for text

---

## Frontend Features (Mobile-Optimized)

### 1. Main View: Multi-Verse Bible Flow (PHP Server-Rendered HTML)
- Display Bible as continuous scrollable text (for context)
- Each verse is a clickable `<a>` link
- Visual indicators for approval status (CSS classes):
  - `.approved` (green): Approved verses
  - `.pending` (gray): Pending approval
- **Verse picker**: Book + Chapter selectors (`<select>`) as simple HTML form
- Form submission redirects to verse location via URL parameter
- No JavaScript framework, pure HTML/CSS/vanilla JS

### 2. Approval Panel (Stacked Vertical Layout, HTML Form)
When user clicks a verse, shows as a new page or inline form:

**1917 Section (Top)**:
- Verse reference: `Matt 1:1` (rendered as plain text)
- 1917 text (read-only, `<div>`, scrollable for long verses)
- Light gray background CSS class to indicate read-only

**FSB Section (Bottom)**:
- HTML `<textarea>` with FSB text (editable, full keyboard)
- Scrollable for long verses
- White background to indicate editable

**Form Actions** (plain HTML buttons):
- `<input type="submit" value="← Prev" name="action" />` – Previous unapproved
- `<input type="submit" value="Approve" name="action" />` – Mark approved
- `<input type="submit" value="Next →" name="action" />` – Next unapproved

All wrapped in a single HTML `<form method="POST">` that submits back to PHP

### 3. Workflow
```
Main View (Bible flow)
    ↓ [Tap verse]
Approval Panel (1917 ref / FSB editable)
    ↓ [Optional: edit FSB text]
    ↓ [Tap Approve]
Database updated + close panel
    ↓ [Tap Next →]
Jump to next unapproved verse
```

### 4. UX Principles
- **Minimal chrome**: No modals, dialogs, or popups
- **Fast approval**: Single tap to open, one button to approve
- **Low friction**: Edit inline if needed, no separate save step
- **Phone-friendly**: Large tap targets, full-width inputs
- **No undo/preview**: Keep it simple

---

## PHP Web Interface

### Single PHP Script (web/prod/index.php)
Simple PHP script that:
- Connects directly to SQLite database
- Queries verses by book/chapter/verse
- Displays Bible flow with verse picker
- Handles form POST to approve verses with optional edits
- No separate API layer

**Key Functions**:
- `getVerse($book, $chapter, $verse)` – Fetch single verse from DB
- `getBook($book)` – Fetch all verses in a book
- `getNextUnapproved($book, $chapter, $verse)` – Find next pending verse
- `approveVerse($verse_id, $text_fsb = null)` – Mark approved, optionally update text

### Example Flow
```
GET index.php?read=matt&chapter=1
  ↓
PHP renders Bible flow HTML with verse picker form
  ↓
User submits form → updates book/chapter → page reloads to that location
  ↓
User clicks verse link (e.g., href="index.php?read=matt&chapter=1&verse=5&action=view")
  ↓
PHP renders approval panel with 1917 text + FSB textarea
  ↓
User types in textarea and clicks Approve button
  ↓
POST index.php with action=approve + verse_id + text_fsb
  ↓
PHP updates DB (approved=1, text_fsb) and redirects to next unapproved verse
  ↓
Page loads showing next verse in approval panel
```

---

## Node.js XML Sync Scripts

### `workflows/xml-sync/import-xml.js`
Load FSB.xml and 1917.xml into database (manual execution).
```bash
node workflows/xml-sync/import-xml.js
```

**Behavior**:
- Parse both XML files
- Extract verse structure (book, chapter, verse, line number, text)
- Insert into `verses` table
- For existing verses: preserve `approved` status, update text from XML
- New verses: default `approved=0`

### `workflows/xml-sync/export-xml.js`
Save APPROVED verses from database back to FSB.xml (manual execution).
```bash
node workflows/xml-sync/export-xml.js
```

**Behavior**:
- Read all verses from DB where `approved=1`
- For each approved verse: update the corresponding text in FSB.xml
- Preserve XML structure, formatting, and attributes
- Only unapproved verses keep their original text from last import
- Backup old FSB.xml before writing
- Output: `data/bibles/FSB.xml` (updated with approved verses only)

### Manual Sync Workflow
```
1. One-time Initial Setup:
   $ node workflows/xml-sync/import-xml.js
   → Loads both XMLs into fresh DB

2. Approval Workflow (as needed):
   Open browser → http://localhost/web/prod/index.php
   Users approve verses via PHP interface
   DB updated with approved=1 and any edits

3. When ready to export (manual):
   $ node workflows/xml-sync/export-xml.js
   → Writes approved verses back to FSB.xml
   → Backups previous version

4. If other processes edit FSB.xml externally:
   $ node workflows/xml-sync/import-xml.js
   → Re-imports XML, preserves approval status
   → Syncs external edits into DB
```

**No automatic syncing or cron jobs**. All execution is manual and local.

---

## Database Initialization & XML Sync

### Initial Setup: XML → SQLite
1. Parse `data/bibles/FSB.xml` (extract verse text + line numbers)
2. Parse `data/bibles/1917.xml` (extract 1917 reference text)
3. Extract verse structure: `<BIBLEBOOK bnumber="X">` → `<CHAPTER cnumber="Y">` → `<VERS vnumber="Z">text</VERS>`
4. **Crucially**: Capture XML line number for each verse (physical line in file)
5. Insert into `verses` table, all with `approved=0`
6. After initial approval workflow, export back to XML with `approved=1` status (or similar marker)

### XML Line Number Preservation
- When parsing XML, record the actual line number where each `<VERS>` tag appears
- Store in `xml_line_number` column
- This enables:
  - Traceability to original source
  - Validation against manual XML edits
  - Coordination with other processes that also edit FSB.xml

### Bidirectional XML Sync Strategy

**Problem**: Other processes (workflows/) also edit FSB.xml directly. We need to handle this.

**Solution**: Hybrid approach
```
┌─────────────────┐
│  Other Process  │  (workflows/numbers/, replacement_apply/, etc.)
│  edits FSB.xml  │
└────────┬────────┘
         │
         ▼
    FSB.xml (source of truth for text)
         │
         ├─ GET sync-xml/import → Load into DB
         │   (Update text_fsb, preserve approved status for matching verses)
         │
         └─ POST sync-xml/export → Save to FSB.xml
             (Read text_fsb from DB, write back to XML preserving structure)
```

**Key Points**:
- **Import**: Load XML → update `text_fsb` column, but preserve `approved` status for matching verses (by book/chapter/verse)
- **Export**: Read `text_fsb` → write back to XML, preserving all XML structure/formatting
- **Conflict resolution**: If XML and DB disagree on verse text, DB wins (approved text takes precedence)
- **Versioning**: Keep backups of FSB.xml before export (e.g., `FSB.xml.backup.2026-01-23`)

---

## Data Persistence & Approval Tracking

### Role of Each Component

| Component | Role |
|-----------|------|
| **FSB.xml** | Primary source for verse text; keeps last-exported state |
| **SQLite DB** | Tracks approval status; mirrors FSB.xml text |
| **1917.xml** | Reference-only; loaded once into DB, never modified |

### Workflow

```
1. Initial Setup:
   node workflows/xml-sync/import-xml.js
   → Parse FSB.xml & 1917.xml
   → Create verses table
   → All verses: approved=0 (pending)

2. Approval Loop (via PHP web interface):
   User taps verse → Show 1917 + FSB textarea
   User edits FSB (optional) and approves
   POST to PHP → DB updated: approved=1, text_fsb
   Show next unapproved verse

3. Export Approved Verses (manual or cron):
   node workflows/xml-sync/export-xml.js
   → Read all verses where approved=1
   → Update FSB.xml with their text_fsb values
   → Leave unapproved verses with original XML text
   → Backup old FSB.xml before writing

4. Re-import After External Edits:
   Other processes edit FSB.xml directly
   node workflows/xml-sync/import-xml.js
   → Load FSB.xml from disk
   → For each verse: update text_fsb from XML
   → Preserve approved status (keep existing approval flags)
   → Now DB is in sync with external changes
```

### Key Points
- **Only approved verses exported**: Unapproved verses stay unchanged in FSB.xml
- **Approval is sticky**: Once approved=1, re-importing XML doesn't reset it (unless you manually reset DB)
- **External edits synced**: If other processes edit FSB.xml, import-xml.js pulls those changes into DB
- **No edit history**: DB only tracks boolean approval, not who/when/what changed

---

## Technology Stack

### Web Frontend
- **Language**: HTML + CSS + PHP (server-side rendering)
- **Forms**: Plain HTML `<form>` with POST submission (no JavaScript required)
- **Database**: SQLite3 (PHP PDO or SQLite extension)
- **Styling**: Vanilla CSS (mobile-first, minimal)
- **JavaScript**: Vanilla JS optional (for auto-resize textarea, no framework)

### XML Sync (Node.js Scripts)
- **Runtime**: Node.js (existing setup)
- **XML Parsing**: xml2js or fast-xml-parser
- **Database**: sqlite3 npm package
- **Execution**: Manual CLI or cron job

### Database
- **SQLite**: Single file, no server needed, easy backups
- **File**: `data/bibles/fsb_approval.db`
- **Access**: PHP (via PDO or SQLite extension), Node.js (via sqlite3)

---

## Implementation Phases

### Phase 1: Database & XML Sync Scripts
- [x] Create SQLite schema (`db_schema.sql`)
- [x] Write `workflows/xml-sync/import-xml.js` (parse XML, extract line numbers, load into DB)
- [x] Write `workflows/xml-sync/export-xml.js` (export approved verses to FSB.xml)
- [ ] Test bidirectional sync: import → approve in DB → export → verify XML

### Phase 2: PHP Web Interface
- [x] Rewrite `web/prod/index.php` as SQLite-backed PHP script
- [x] Connect to DB, query verses by book/chapter/verse
- [x] Display Bible flow with verse picker (book + chapter dropdowns)
- [x] Implement verse tap → approval panel modal
- [x] Show 1917 (top, read-only) + FSB (bottom, textarea, editable)
- [x] Add Prev/Next/Approve buttons

### Phase 3: Approval Logic in PHP
- [x] Handle POST requests from approval panel
- [x] Update DB: `approved=1` + optional `text_fsb` edits
- [x] Redirect or show next unapproved verse
- [x] Handle edge cases (long verses, special characters)

### Phase 4: Mobile Styling & Testing
- [x] Mobile-first CSS (large tap targets, full-width inputs)
- [ ] Test on actual phone device
- [ ] Verify scrolling, touch responsiveness, keyboard interaction
- [ ] Adjust spacing/sizing as needed

### Phase 5: Integration
- [ ] Test full workflow: import XML → approve verses → export XML
- [ ] Verify approved verses appear in exported FSB.xml
- [ ] Test re-import after external edits
- [ ] Document manual sync procedures

---

## File Structure (Proposed)

```
web/
└── next/
    ├── index.php               (Single PHP script: UI + DB queries + form handling)
    ├── style.css               (Mobile-first styling)
    └── fsb_approval.db         (SQLite database, created by import-xml.js)

workflows/
└── xml-sync/
    ├── import-xml.js           (Parse FSB.xml & 1917.xml → load into DB)
    └── export-xml.js           (Read approved verses from DB → write to FSB.xml)

data/
└── bibles/
    ├── FSB.xml                 (Updated by export-xml.js with approved verses)
    └── 1917.xml                (Reference, never modified)
```

---

## Final Design Summary

### What We're Building
A **mobile-first web app** for reviewing FSB verses against 1917 reference text. Users tap through verses, optionally edit FSB text inline, and approve. Approved verses are synced back to FSB.xml via Node.js scripts.

### Architecture
- **Web Interface**: Simple PHP script (no separate API server)
- **Database**: SQLite (approval status tracking)
- **XML Sync**: Node.js scripts (import-xml.js, export-xml.js)
- **Text Source**: XML files (synced with DB, updated only for approved verses)

### Key Decisions (Locked In)
✅ **PHP + HTML forms**: Server-side rendered, plain HTML forms, no framework  
✅ **Simple submission**: Form POST to same PHP script, page reloads/redirects  
✅ **No JavaScript framework**: Pure HTML/CSS, vanilla JS for textarea auto-resize only  
✅ **Node.js sync scripts**: All XML parsing/import/export in Node  
✅ **Export only approved**: Only approved=1 verses written back to FSB.xml  
✅ **Phone-first UI**: Minimal friction, large tap targets, full-width inputs  
✅ **Read-only 1917**: Reference text only, never edited in app  
✅ **Vertical stacking**: 1917 on top (read-only), FSB below (editable textarea)  
✅ **Simple workflow**: Click verse → edit if needed → approve → next  
✅ **Line numbers preserved**: XML line numbers stored in DB for traceability  
✅ **Bidirectional XML sync**: Import and export both supported  
✅ **SQLite persistence**: Lightweight, single-file database for approval tracking  

### What We're NOT Building
❌ Express.js backend / REST API  
❌ React/Vue/any JavaScript framework  
❌ Single-page app (SPA)
❌ AJAX requests
❌ Edit history or diffs  
❌ User accounts or permissions  
❌ Analytics dashboards or progress metrics  
❌ Complex UI components  
❌ Undo/preview functionality  

### Manual Execution Flow
```
1. One-time setup:
   $ node workflows/xml-sync/import-xml.js
   → Create DB and load both XML files

2. Approval workflow (via browser):
   $ open http://localhost/web/prod/index.php
   → Approve verses using PHP interface
   (repeat as needed)

3. When ready to export (manual, as needed):
   $ node workflows/xml-sync/export-xml.js
   → Write approved verses back to FSB.xml

4. Handle external edits (manual, as needed):
   $ node workflows/xml-sync/import-xml.js
   → Re-sync FSB.xml changes into DB
```

**All syncing is manual and local—no cron jobs or automatic execution.**

### Next Steps
Ready to begin implementation when you give the go-ahead:
1. Create SQLite schema
2. Write XML sync Node.js scripts
3. Rewrite PHP web interface
4. Test end-to-end workflow

---

**Last Updated**: 2026-01-23  
**Status**: Implementation Complete - Ready for Testing & Integration

## Implementation Summary

### ✅ Completed Components

**1. Folder Structure**
- Created `workflows/xml-sync/` for XML sync scripts
- Created `web/next/` for PHP interface and database

**2. Configuration**
- Added `database.fsb` location to `config.js` pointing to `web/next/fsb_approval.db`
- Dependencies added to root `package.json` (fast-xml-parser, sqlite3)

**3. XML Sync Scripts** (`workflows/xml-sync/`)
- **import-xml.js**: Parses FSB.xml and 1917.xml, extracts line numbers, creates SQLite database
- **export-xml.js**: Exports approved verses from database back to FSB.xml with automatic backup

**4. PHP Web Interface** (`web/next/`)
- **index.php**: Complete server-side rendered web app with:
  - Book/chapter selector
  - Bible flow display (clickable verses)
  - Approval panel (1917 reference / FSB editable)
  - Prev/Next/Approve navigation
  - Auto-resize textarea
  - Approval status tracking
  
- **style.css**: Mobile-first responsive design with:
  - Touch-friendly buttons and inputs
  - Full-width layout on small screens
  - Visual indicators for approved/pending verses
  - Gradient headers and modern styling

### 🔧 Next Steps for Testing

1. **Initial Setup**:
   ```bash
   npm install  # Install dependencies
   cd workflows/xml-sync
   node import-xml.js  # Create DB and load both XML files
   ```

2. **Start Web Server**:
   ```bash
   # Using PHP built-in server (for development):
   php -S localhost:8000 -t web/next
   ```

3. **Test Approval Workflow**:
   - Open http://localhost:8000/index.php
   - Select a book and chapter
   - Click a verse to open approval panel
   - Edit FSB text (optional) and click Approve
   - Verify next unapproved verse is shown

4. **Export Approved Verses**:
   ```bash
   node workflows/xml-sync/export-xml.js
   ```

5. **Verify XML Output**:
   - Check `data/bibles/FSB.xml` for updated verses
   - Verify `data/bibles/FSB.xml.backup.YYYY-MM-DD` backup was created
   - Re-import to sync external changes: `node import-xml.js`

---

**Last Updated**: 2026-01-23  
**Status**: Implementation Complete - Ready for Testing & Integration
