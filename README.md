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