<?php
// coding= utf-8

// Ensure FSB directory exists
if (!is_dir('FSB')) {
  mkdir('FSB', 0755);
}
// Clear the FSB directory
if (is_dir('FSB')) {
  $files = glob('FSB/*');
  foreach ($files as $file) {
    unlink($file);
  }
}

// Read the translation file
$xml_content = file_get_contents('FSB.xml');

// Split the content into bible books - simple split at BIBLEBOOK
$bible_books = explode('<BIBLEBOOK', $xml_content);

// Remove the first empty element
array_shift($bible_books);

// Process each bible book
for ($i = 0; $i < count($bible_books); $i++) {
  if (!empty($bible_books[$i])) {
    // Add back the BIBLEBOOK tag that was removed by explode
    $full_book = '<BIBLEBOOK' . $bible_books[$i];

    // Save to a numbered HTML file
    $book_number = str_pad($i + 1, 2, '0', STR_PAD_LEFT);
    file_put_contents("FSB/$book_number.html", $full_book);
  }
}

/**
 * Lists files in a directory, excluding hidden files
 * @param string $path Directory path
 * @return array Array of file paths
 */
function listdir_nohidden($path)
{
  return glob($path . '/*');
}

$mapp_ordlistor = 'ordlistorHtml/';
$ordlistor = listdir_nohidden($mapp_ordlistor);

$mapp_data = 'FSB/';
$fillista = listdir_nohidden($mapp_data);

foreach ($fillista as $filnamn) {
  echo 'Arbetar med: ' . $filnamn . "\n";

  // Read the file content with UTF-8 encoding
  $text = file_get_contents($filnamn);

  foreach ($ordlistor as $ordlista) {
    // Read and decode the JSON file
    $json_content = file_get_contents($ordlista);
    $lista = json_decode($json_content, true);

    // Process each word pair
    foreach ($lista['ordpar'] as $a => $b) {
      if ($lista['regex']) {
        $text = preg_replace('/' . str_replace('/', '\/', $a) . '/s', $b, $text);
      } else {
        $text = str_replace($a, $b, $text);
      }
    }
  }

  // Write the modified content back to the file
  file_put_contents($filnamn, $text);
}

?> 