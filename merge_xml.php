<?php
// coding= utf-8

$parts = glob('FSB_xml/*');
$merged = 'FSB.xml';
file_put_contents($merged, ''); // Clear the merged file

foreach ($parts as $filnamn) {
  echo 'Arbetar med: ' . $filnamn . "\n";

  // Read the file content with UTF-8 encoding
  $text = file_get_contents($filnamn);

  // Write the modified content back to the file
  file_put_contents($merged, $text, FILE_APPEND);
}
?> 