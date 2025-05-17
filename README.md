# Fri Svensk Bibel
> Bibel på svenska för fri användning.

## Om FSB
**Fri Svensk Bibel (FSB)** är en svensk helbibel. Översättningen faller tillbaka på 1917 års översättning där ingen ny översättning gjorts än.

Till skillnad från många andra svenska biblar får du fritt ladda ner hela bibeltexten och använda som du vill utan att först be om tillåtelse eller ens hänvisa till FSB. Du kan alltså citera obegränsat utan att hänvisa eller på annat sätt skriva ut vilken översättning du använt. Samma rättighet har du som vill trycka eller publicera delar av eller hela bibeltexten. Det är även tillåtet att använda FSB som grundöversättning i kommande översättningsprojekt utan att hänvisa eller be om lov. I de fall då du modifierat texten så är det dock inte tillåtet att kalla den nya texten för Fri Svensk Bibel.

## Licens
Texten är i sin helhet och i alla versioner licenserad under Creative Commmons Zero (CC0). Läs mer om licensen på `https://creativecommons.org/publicdomain/zero/1.0/`

## Översättning

Översättningen sker i filen `FSB.xml`.

Det finns en enkel läsare/editor `index.php` som kan köras som en hemsida. Starta hemsidan lokalt på din dator med följande kommando:

```sh
php -S localhost:8000
```

Gå sedan till `http://localhost:8000` i valfri webläsare och klicka på den vers du vill ändra.

Ändringarna skrivs till filen `diff.txt`. För att applicara dina ändringar på `FSB.xml` kör du:

```sh
php apply_diff.php
```

eller navigerar till `http://localhost:8000/apply_diff.php` om du fortfarande kör servern.

### Gör om till HTML
Kör `build_html.php`, så bygger den om html-filerna i mappen `FSB`

```sh
php build_html.php
```



The user wants to create a Swedish Bible translation (Fri Svensk Bibel) based on the 1917 version. The goal is to replace archaic words with simple, modern equivalents while where possible keeping the original word order. The XML format should be kept at all times.

The project involves working on a file containing only one book at a time (`/Users/jesper/GitHub/Fri-Svensk-Bibel/FSB_xml/44.xml`). The user has implicitly approved batches of suggested minimal word replacements.

The assistant has been using the `developer__text_editor` tool with the `str_replace` command to apply changes.

Several replacements have aready been applied such as `nejd` (replaced with `område`), archaic verb forms (`gingo` -> `gick`), and slightly awkward phrasing (`en på var av dem` -> `en på var och en av dem`).

1.  Continue identifying archaic words and suggesting single-word replacements. Avoid longer phrases and make sure output is valid Swedish.
2.  Apply replacements for words using `str_replace`.
3.  If a word appears more than once only change the found occurance and leave the other ones for later.



Fri Svensk Bibel is a modernisation of the 1917 Swedish bible. The goal is to use a simple and modern vocabulary without slang and yet stay close to the sources. This is done by just replacing single old words. Apart from this the original translation is minimally changed or modified. Several replacements have aready been applied such as `nejd` (replaced with `område`), archaic verb forms (`gingo` -> `gick`). More previous edits: "fränka" to "släkting", "menen" to "menar", "omtalade" to "berättade", "allahanda" to "alla slags", "Vid pass"->"Omkring", "funno"->"fann", and "frågen" to "frågar". The task is now to keep reading the input file and look for similar old words and replace with new ones. The format of the xml document should stay untouched. If a word occures multiple times, just replace the first one and keep going. Don't remove redundant words. Only look for archaic word forms.
/Users/jesper/GitHub/Fri-Svensk-Bibel/FSB_xml/42.xml