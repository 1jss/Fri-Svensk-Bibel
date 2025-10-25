
# PLAN för modernisering av FSB (byta ut ålderdomliga ord)

Detta dokument beskriver ett arbetsflöde för att modernisera en äldre svensk översättning genom att byta ut enstaka ord eller korta fraser (inte hela meningar). Målet är att skapa en `replacements.json` för hela verket som innehåller en array av objekt med fälten `old` och `new`.

## Kort sammanfattning

Arbetsflödet bygger på att en LLM läser en text, hittar ålderdomliga eller akaiska ord/fraser och föreslår moderniseringar i `replacements.json`.

**Viktigt:** Varje översättningspar i replacements.json måste innehålla kontext både FÖRE och EFTER det ersatta ordet (minst ett ord eller skiljetecken direkt efter). Par utan sådan kontext är inte godkända.

**KRITISK VARNING: Varje "old"-sträng MÅSTE innehålla minst ett ord eller skiljetecken DIREKT FÖRE OCH DIREKT EFTER det ersatta ordet. Par utan BÅDE före- och efterkontext är STRIKT FÖRBJUDET och kommer att avvisas. Detta är obligatoriskt för att undvika falska matchningar och säkerställa exakt ersättning.**

## Kontrakt (inputs / outputs / fel)

- Input:
  - XML-filen `temp_context.xml` (en temporär kontextfil extraherad från `FSB.xml`) som innehåller `<BIBLEBOOK> / <CHAPTER> / <VERS>` med text.
- Output (globalt för verket):
  - `replacements.json` — en JSON-array med objekt som endast har `old` och `new` (se exempel nedan). Denna fil gäller för hela verket.

## Filformat och exempel

Slutlig ersättningsfil: `replacements.json`

Exempelstruktur:

[
  { "old": "Vi predika ju", "new": "Vi predikar ju" },
  { "old": "vilja undgå att", "new": "vilja slippa att" }
  { "old": 'jag ock", så', "new": 'jag också", så' }
]

## Flödet (kortfattat)

  - Läs källfilen rad för att säkerställa att varje översättningspar bygger på faktisk förekomst i texten.
  - Skapa/uppdatera den globala `replacements.json` med objekt av formen `{ "old": "...", "new": "..." }`.
  - För varje rad: extrahera endast unika, ålderdomliga ord/fraser med kontext efter (enligt regler nedan).
  - Kontrollera mot tidigare förslag så att varje översättningspar bara förekommer en gång i replacements.json.
  - Hoppa över redan föreslagna eller identiska par.
  - Skriv aldrig generella par utan kontext efter.
  - Uppdatera replacements.json kontinuerligt, rad för rad, allt eftersom nya unika översättningspar hittas.
  - Förslagen ska alltid innehålla kontext (1-3 ord före och efter). Detta är obligatoriskt.

 
## Regler / riktlinjer (viktiga punkter)

- Endast ord och korta fraser får ändras — inte meningsstruktur eller tillägg/radering av hela satser.
- **KRITISKT: Översättningspar utan kontext BÅDE FÖRE OCH EFTER det ersatta ordet är inte godkända.** Det måste alltid finnas minst ett ord eller skiljetecken direkt FÖRE OCH direkt EFTER det ersatta ordet i "old". Detta innebär att "old" alltid måste innehålla minst 3 ord totalt (t.ex. "vi vilja nämligen" → "vi vill nämligen", där "vi" är före och "nämligen" är efter det ersatta ordet "vilja"). 
- **Exempel på ej godkända par (utan före- eller efterkontext):**
  - "kunna bryta ner" → "kan bryta ner" (ingen kontext före "kunna").
  - "vi vilja" → "vi vill" (ingen kontext efter "vilja").
  - "berömmer oss" → "berömma oss" (ingen kontext före "berömmer").
- **Exempel på godkända par:**
  - "de kunna bryta ner" → "de kan bryta ner" (kontext före: "de", efter: "ner").
  - "vi vilja nämligen" → "vi vill nämligen" (kontext före: "vi", efter: "nämligen").
- Bevara tempus och böjning där så krävs; om ändring kräver böjning, föreslå rätt böjning i `new`.
- I tveksamma fall: Gå vidare till nästa ord
- Undvik att stavning av namn, platser eller teologiskt laddade termer

## Edge cases att uppmärksamma
- Versen innehåller XML-entiteter (&amp;, &lt;, mm.) — se till att parsning/dump bevarar dem korrekt.
- Fall med skiljetecken (t.ex. "predika," vs "predika") — matcha så att skiljetecken inte förstör sök/ersättning.