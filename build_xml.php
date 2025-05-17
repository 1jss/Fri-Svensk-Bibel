<?php
// coding= utf-8

// Ensure FSB directory exists
if (!is_dir('FSB_xml')) {
  mkdir('FSB_xml', 0755);
}
// Clear the FSB directory
if (is_dir('FSB_xml')) {
  $files = glob('FSB_xml/*');
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
    file_put_contents("FSB_xml/$book_number.xml", $full_book);
  }
}

?> 