# Fri Svensk Bibel
> Bibel på svenska som allmän egendom (public domain).

## Användning
 **Fri Svensk Bibel (FSB)** är en svensk bibelöversättning.

 Till skillnad från många andra svenska biblar får du fritt ladda ner hela texten och använda som du vill utan att först be om tillåtelse.

## Modernisering genom mönster
 Bibeln 1917 ligger till grund för Fri Svensk Bibel. Språket i 1917 års översättning är dock ålderdomligt och behöver moderniseras för att kunna användas i en modern kontext. Detta sker i ett första steg genom att systematiskt byta ut gamla ord och fraser till nya. Den bearbetade texten återfinns i mappen FSB.

### Modernisera texten
Du kan lägga till egna moderniserings-mönster i mappen `/ordlistorText` och bygga om översättningen utifrån dem.
- Kopiera `1917.xml`  till mappen `/data`
- Modernisera texten med kommandot: ```python buildText.py```

### Gör om till HTML
- Gå in i mappen `/data` med kommandot: ```cd data```
- Dela upp filen i bibelböcker med kommandot: ```csplit -k -f "" 1917.xml /\<BIBLEBOOK/ '{66}'```
- Ge de bibelböckerna rätt ändelse med kommandot: ```for FILENAME in *; do mv $FILENAME $FILENAME.html; done```
- Gå ur mappen med kommandot: ```cd ..```
- Byt ut xml-taggar mot html-taggar med kommandot: ```python buildHtml.py```
