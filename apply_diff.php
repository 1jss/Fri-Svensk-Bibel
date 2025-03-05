<?php
// Apply diff in diff.txt to the huge file FSB.xml
// The diff.txt file is in the format of:
// original text\n
// edited text\n\n
// original text\n
// edited text\n\n
// etc.
// There are no deletions or additions, only changes.
// All changes should be applied to the FSB.xml file.

// Open the diff.txt file
$diff_file = fopen('diff.txt', 'r');
if (!$diff_file) {
  echo 'Error: diff.txt file not found';
  exit;
}

// Create a replacement map
$replacements = [];
while (($line = fgets($diff_file)) !== false) {
    $original_text = trim($line);
    $edited_text = trim(fgets($diff_file));
    $replacements[$original_text] = $edited_text;
    
    // Skip the empty line
    fgets($diff_file);
}

// Close the diff file since we don't need it anymore
fclose($diff_file);
echo 'Done reading diff file';

// Process the XML file in chunks
$chunk_size = 8192 * 1024; // 8MB chunks
$fp = fopen('FSB.xml', 'r');
$output = fopen('FSB.xml.tmp', 'w');

while (!feof($fp)) {
    $chunk = fread($fp, $chunk_size);
    // Apply all replacements at once using strtr
    $chunk = strtr($chunk, $replacements);
    fwrite($output, $chunk);
}

fclose($fp);
fclose($output);
echo 'Done processing XML file';
// Replace the original file with the new one
rename('FSB.xml.tmp', 'FSB.xml');
echo 'All done!';