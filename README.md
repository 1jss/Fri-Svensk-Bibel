# Fri Svensk Bibel
> Bibel på svenska som allmän egendom (public domain).

## Användning
 **Fri Svensk Bibel (FSB)** är en svensk bibelöversättning.

 Till skillnad från många andra svenska biblar får du fritt ladda ner hela texten och använda som du vill utan att först be om tillåtelse.

### Gör om till HTML
- Kopiera `fsb.xml`  till mappen `/temp` med kommandot: ```cp fsb.xml temp/fsb.xml```
- Gå in i mappen `/temp` med kommandot: ```cd temp```
- Dela upp filen i bibelböcker med kommandot: ```csplit -k -f "" fsb.xml /\<BIBLEBOOK/ '{66}'```
- Ge de bibelböckerna rätt ändelse med kommandot: ```for FILENAME in *; do mv $FILENAME $FILENAME.html; done```
- Gå ur mappen med kommandot: ```cd ..```
- Byt ut xml-taggar mot html-taggar med kommandot: ```python buildHtml.py```
