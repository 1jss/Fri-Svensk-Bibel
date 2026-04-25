# LLM Line Checks - Bible Modernization Workflow

Automated system to modernize Swedish Bible text (FSB) by replacing archaic language with modern equivalents while preserving exact meaning from the 1917 original.

Designed for **partial processing** - processes a few hundred lines at a time, resuming from previous runs.

## Quick Start

```bash
# Process lines 17500-17600
node workflows/llm_line_checks/main.js 17500

# With debug output
node workflows/llm_line_checks/main.js 17500 1 --debug
```

## How It Works

### Two-Expert Validation System

Each line is validated by two independent experts:

```
TEXT → Facts Expert → Modernization Expert → Unified Fixer → IMPROVED TEXT
         (meaning OK?)  (archaic language?)    (apply rules)
                             ↓
                        Both satisfied?
                        YES → Done
                        NO → Fixer improves → Re-validate (up to 3 times)
```

### Facts Expert
- **Compares:** 1917 original vs current FSB text
- **Checks:** Are names, numbers, and meaning preserved?
- **Ignores:** Archaic words, style, sentence structure

**Output:** `factualChangeDetected: true/false`

### Modernization Expert
- **Reads:** Current FSB text only
- **Checks:** Contains archaic words or structures?
- **Ignores:** Meaning changes, names, numbers

**Output:** `needsModernization: true/false, archaicElements: [...]`

### Unified Fixer
- **Receives:** Both expert reports + original 1917 text
- **Applies:** 5 modernization rules (see below)
- **Produces:** Single improved version addressing all concerns

**Output:** Modernized text with XML tags preserved

## Core Modernization Rules

1. **Replace archaic words**
   - skall → ska
   - ehuru → fastän
   - ty → för
   - länge sedan → länge tillbaka
   - etc.

2. **Modernize unnatural sentence structure**
   - But preserve exact meaning
   - Make modern Swedish natural to read

3. **Avoid compound words** (when simpler alternatives exist)
   - husbonde → man (context-dependent)
   - fördemna → döma (if meaning allows)

4. **Never change names or places**
   - Jerusalem → Jerusalem (always)
   - Amoréer → Amoréer (always)
   - Numbers stay identical

5. **Output only text, no explanations**
   - No "Here's the modernized version:"
   - No intermediate notes
   - Just the improved Swedish text

## Validation Loop

For each line, up to 3 attempts:

```
Attempt 1:
  ├─ Run Facts Expert
  ├─ Run Modernization Expert
  └─ Both OK? → Apply and done
              → Not OK? Continue to attempt 2

Attempt 2:
  ├─ Call Unified Fixer with expert feedback
  ├─ Fixer produces improved version
  ├─ Re-run both experts on improved version
  └─ Both OK? → Apply and done
              → Not OK? Continue to attempt 3

Attempt 3:
  ├─ Repeat attempt 2
  └─ After attempt 3: Apply best version reached
     (permissive mode - even if not perfect)
```

## File Persistence

- **Saves after every line** (fail-safe)
- **Results file** stores all attempts and final status
- **FSB file** updated in-place with improvements

## Status Values

- `resolved_success` - Both experts satisfied, changes applied
- `already_correct` - No changes needed (both experts OK on first attempt)
- `max_attempts_reached` - Hit 3 iterations, applied best version
- `best_effort_reached` - Fixer couldn't improve further, applied best version

## Architecture

### Files

**Active:**
- `check_spelling_facts.js` - Facts Expert validator
- `check_modernization.js` - Modernization Expert validator
- `unified_fixer.js` - Unified fixer that applies modernization
- `main.js` - Main orchestrator (runs validation loop)

**Documentation:**
- `README.md` (this file) - Quick reference
- `ENHANCEMENTS.md` - Detailed improvements and strategy
- `EXPERT_SEPARATION.md` - Deep dive on expert design
- `ARCHITECTURE.md` - System diagrams and components
- `MODERNIZATION_RULES.md` - Examples and decision trees

### Expert Responsibilities

```
Facts Expert:
  ✓ Compares 1917 vs current
  ✓ Checks for fact changes
  ✗ Doesn't check archaic language
  ✗ Doesn't check grammar

Modernization Expert:
  ✓ Checks for archaic language
  ✓ Suggests modernization
  ✗ Doesn't check facts
  ✗ Doesn't check meaning changes

Unified Fixer:
  ✓ Applies modernization rules
  ✓ Respects both experts' constraints
  ✓ Produces single coherent version
```

## Example Workflow

```
Line 17519: "Men han skall då återvända till hennes böner."

Attempt 1/3:
  Facts Expert: ✓ No factual changes (meaning identical)
  Modernization Expert: ✗ Found archaic "skall"
  
  Unified Fixer called:
    - Replaces "skall" → "ska"
    - Produces: "Men han ska då återvända till hennes böner."

Attempt 2/3:
  Facts Expert: ✓ Meaning still identical
  Modernization Expert: ✓ No archaic elements
  
  ✓ Both satisfied! Apply and continue.
```

## Permissive Mode

The system applies improvements automatically:

- **Attempt 1:** Run experts, if issues → Fixer improves
- **Attempt 2:** Run experts on improved version
- **Attempt 3:** Same as attempt 2
- **After 3:** Apply best version regardless

Rationale: Better to have partial improvements than no improvements. User can manually review `best_effort_reached` lines if needed.

## Configuration

- **Max attempts per line:** 3
- **Application strategy:** Permissive (apply best version reached)
- **Context lines:** 1 previous line for modernization check
- **File updates:** After every line (fail-safe)
- **Backup:** Created before processing starts

## Debugging

```bash
# Run with verbose output
node workflows/llm_line_checks/main.js 17514 1 --debug

# Check results file
cat workflows/llm_line_checks/line_checks_results.json | jq '.line_17514'

# Restore from backup if needed
cp workflows/llm_line_checks/fsbXml.backup workflows/llm_line_checks/fsbXml
```

## When to Use This Workflow

✓ Modernizing Bible text from 1917 to contemporary Swedish
✓ Replacing archaic words automatically
✓ Preserving exact meaning and facts
✓ Partial batch processing (hundreds of lines at a time)

✗ Not for translating to other languages
✗ Not for theological reinterpretation
✗ Not for changing sentence structure significantly

## Expected Improvements

Typical improvements include:

```
Before:  "Han skall komma å en plats där som är väldigt."
After:   "Han ska komma på en plats där som är väldigt."

Before:  "Ty det är så han älskar världen."
After:   "För det är så han älskar världen."

Before:  "Ehuru många kommer, så är det fåtaligt."
After:   "Fastän många kommer, så är det fåtaligt."
```

Not all archaic patterns are equal - the system prioritizes clarity and naturalness.

## Results File

Each line is documented in `line_checks_results.json`:

```json
{
  "line_17514": {
    "lineNumber": 17514,
    "line1917": "<v n=\"14\">Original 1917 text</v>",
    "initialLineFSB": "<v n=\"14\">Initial FSB text</v>",
    "finalLineFSB": "<v n=\"14\">Final improved text</v>",
    "checks": [
      {
        "attempt": 1,
        "facts": { "factualChangeDetected": false, ... },
        "modernization": { "needsModernization": true, ... }
      },
      {
        "attempt": 2,
        "facts": { "factualChangeDetected": false, ... },
        "modernization": { "needsModernization": false, ... }
      }
    ],
    "resolutions": [
      {
        "attempt": 1,
        "improved": true,
        "feedbackAddressed": ["Modernization feedback"]
      }
    ],
    "finalStatus": "resolved_success",
    "applied": true
  }
}
```

## Limitations

Some lines may not reach 100% satisfaction if:
- Original 1917 text has inherent ambiguities
- Multiple valid modernizations exist
- Domain expertise needed beyond language rules
- Conflicting linguistic constraints

For these, check the `best_effort_reached` status and review manually if needed.

## Error Handling

- Errors are handled gracefully
- File is saved after every line (fail-safe)
- If script crashes, manually handle the partial state

## Expert Feedback Examples

### Facts Expert Reports

```javascript
// No factual changes
{
  factualChangeDetected: false,
  changes: [],
  explanation: null
}

// Factual change detected
{
  factualChangeDetected: true,
  changes: ["Subject changed from 'I' to 'he'"],
  explanation: "The 1917 version says 'I did X' but FSB says 'he did X'"
}
```

### Modernization Expert Reports

```javascript
// No archaic language
{
  needsModernization: false,
  archaicElements: [],
  suggestions: null
}

// Archaic language detected
{
  needsModernization: true,
  archaicElements: ["skall", "å"],
  suggestions: "Replace 'skall' with 'ska' and 'å' with 'på'"
}
```

## Next Steps

1. **Run on test lines** to verify output quality
2. **Check backup file** to ensure restoration works
3. **Review results file** to understand improvement patterns
4. **Mark lines for manual review** if needed (status: `best_effort_reached`)
5. **Iterate** the modernization rules based on findings

## Key Insights

- **Two experts are better than three** - Clear separation of concerns
- **Unified fixer prevents conflicts** - No ping-pong between fixes
- **Permissive mode wins** - Better to improve partially than not at all
- **Write after every line** - Prevents data loss on crashes
- **Automatic loop** - Keeps improving until satisfied or max attempts

## For More Information

- See `ARCHITECTURE.md` for system diagrams
- See `EXPERT_SEPARATION.md` for expert design deep dive
- See `MODERNIZATION_RULES.md` for detailed rule examples
- See `ENHANCEMENTS.md` for improvements vs previous versions
