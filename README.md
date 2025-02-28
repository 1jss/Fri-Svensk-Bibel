# Fri Svensk Bibel
> Bibel på svenska för fri användning.

## Om FSB
**Fri Svensk Bibel (FSB)** är en svensk helbibel. Översättningen faller tillbaka på 1917 års översättning där ingen ny översättning gjorts än.

Till skillnad från många andra svenska biblar får du fritt ladda ner hela bibeltexten och använda som du vill utan att först be om tillåtelse eller ens hänvisa till FSB. Du kan alltså citera obegränsat utan att hänvisa eller på annat sätt skriva ut vilken översättning du använt. Samma rättighet har du som vill trycka eller publicera delar av eller hela bibeltexten. Det är även tillåtet att använda FSB som grundöversättning i kommande översättningsprojekt utan att hänvisa eller be om lov. I de fall då du modifierat texten så är det dock inte tillåtet att kalla den nya texten för Fri Svensk Bibel.

## Licens
Texten är i sin helhet och i alla versioner licenserad under Creative Commmons Zero (CC0). Läs mer om licensen på `https://creativecommons.org/publicdomain/zero/1.0/`

## Tekniskt
Översättningen sker i `fsb.xml`

### Gör om till HTML
- Kopiera `FSB.xml`  till mappen `/FSB` med kommandot: ```cp FSB.xml FSB/FSB.xml```
- Gå in i mappen `/FSB` med kommandot: ```cd FSB```
- Dela upp filen i bibelböcker med kommandot: ```csplit -k -f "" FSB.xml /\<BIBLEBOOK/ '{66}'```
- Ge de bibelböckerna rätt ändelse med kommandot: ```for FILENAME in *; do mv $FILENAME $FILENAME.html; done```
- Gå ur mappen med kommandot: ```cd ..```
- Byt ut xml-taggar mot html-taggar med kommandot: ```python buildHtml.py```