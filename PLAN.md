# LLM PROMPT: Modernisera äldre svensk bibelöversättning

## Huvuduppgift

Läs filen `temp_context.xml` och identifiera minst **30 nya verspar** av ålderdomliga/arkaiska ord eller fraser som kan moderniseras. Generera **endast** nya par som **INTE redan finns** i `replacements.json`.

Outputformat: En JSON-array med objekt av formen `{ "old": "...", "new": "..." }`.

---

## KRITISKA REGLER FÖR VARJE PAR

### Regel 1: FÖRE- och EFTERKONTEXT är OBLIGATORISKA
Varje "old"-sträng **MÅSTE innehålla**:
- Minst ett ord eller skiljetecken DIREKT FÖRE det ersatta ordet
- Minst ett ord eller skiljetecken DIREKT EFTER det ersatta ordet

**Detta betyder:** "old" måste alltid innehålla minst **3 ord totalt** (eller motsv. med skiljetecken).

### Regel 2: Exempel på GODKÄNDA par (med före- och efterkontext)
```json
{ "old": "de kunna bryta", "new": "de kan bryta" }
{ "old": "vi vilja nämligen", "new": "vi vill nämligen" }
{ "old": "kan förfärdiga ett", "new": "kan tillverka ett" }
{ "old": "som utbreder himlen", "new": "som breder ut himlen" }
{ "old": "och de förtorka och", "new": "och de förtorkar och" }
```

### Regel 3: Exempel på OGODKÄNDA par (AVVISAS)
```json
{ "old": "kunna bryta", "new": "kan bryta" }           // INGEN kontext före
{ "old": "vi vilja", "new": "vi vill" }               // INGEN kontext efter
{ "old": "förfärdiga", "new": "tillverka" }           // INGEN kontext före eller efter
```

---

## INSTRUKTIONER (steg för steg)

1. **Läs** `temp_context.xml` och identifiera ord/fraser som:
   - Är ålderdomliga (t.ex. "kunna", "vilja", "förtorka", "förfärdiga")
   - Kan ersättas med moderna svenska motsvarigheter (t.ex. "kan", "vill", "förtorkas", "tillverka")
   - Faktiskt förekommer i texten

2. **För varje identifierat par:**
   - Kopiera det faktiska sammanhanget från `temp_context.xml` (omgivande ord)
   - Se till att "old" innehåller ord/skiljetecken INNAN och EFTER det ersatta ordet
   - Modernisera endast ordet/frasen, inte hela satser eller meningar

3. **Kontrollera mot befintlig `replacements.json`:**
   - Hoppa över par som redan finns i filen
   - Undvik dubbletter

4. **Bevara:**
   - Tempus och böjning (z.B. "kunna" → "kan", "förtorka" → "förtorkas")
   - Namn, platser och teologiska termer (dessa moderniseras INTE)
   - XML-entiteter och skiljetecken exakt som de förekommer

5. **Leverera minimum 30 nya par** och **skriv dem direkt till filen `replacements.json`**

Format för ny JSON-array i `replacements.json`:

```json
[
  { "old": "de kunna bryta", "new": "de kan bryta" },
  { "old": "vi vilja nämligen", "new": "vi vill nämligen" },
  { "old": "som utbreder himlen", "new": "som breder ut himlen" },
  ...
]
```

**Viktigt:** De nya paren ska läggs till i den befintliga arrayen i `replacements.json`. Befintliga par ska INTE tas bort eller ändras.

---

## INGÅNGAR

- **Kontextfil:** `temp_context.xml` (innehåller bibeltextens verser att analysera)
- **Befintlig mappning:** `replacements.json` (för att undvika dubbletter och att bevara redan existerade par)

## UTGÅNGAR

- **Uppdaterad `replacements.json`** med minimum 30 nya verspar tillagda
- Varje ny par **MÅSTE** följa Regel 1, 2 och 3 ovan
- Par utan både före- och efterkontext kommer att **AVVISAS**

---

## ANMÄRKNING

Appliceringen av replacements.json (dvs. att faktiskt ersätta orden i bibeltexten) sköts manuellt. Din uppgift är enbart att:
1. Läsa `temp_context.xml`
2. Identifiera ålderdomliga ord/fraser
3. Skriva de nya paren direkt till `replacements.json`