<?php

$book = 'matt';
// Get book from GET parameters
if (isset($_GET['read'])) {
  $book = $_GET['read'];
}

// Bible books and their order
$book_numbers = [
  '1mos' => 1,  // 1 Mosebok (Genesis)
  '2mos' => 2,  // 2 Mosebok (Exodus)
  '3mos' => 3,  // 3 Mosebok (Leviticus)
  '4mos' => 4,  // 4 Mosebok (Numbers)
  '5mos' => 5,  // 5 Mosebok (Deuteronomy)
  'jos' => 6,  // Josua (Joshua)
  'dom' => 7,  // Domarboken (Judges)
  'rut' => 8,  // Rut (Ruth)
  '1sam' => 9,  // 1 Samuelsboken
  '2sam' => 10,  // 2 Samuelsboken
  '1kon' => 11,  // 1 Kungaboken (1 Kings)
  '2kon' => 12,  // 2 Kungaboken (2 Kings)
  '1kro' => 13,  // 1 Krönikeboken (1 Chronicles)
  '2kro' => 14,  // 2 Krönikeboken (2 Chronicles)
  'esr' => 15,  // Esra (Ezra)
  'neh' => 16,  // Nehemja (Nehemiah)
  'est' => 17,  // Ester (Esther)
  'job' => 18,  // Job
  'ps' => 19,  // Psaltaren (Psalms)
  'ords' => 20,  // Ordspråksboken (Proverbs)
  'pred' => 21,  // Predikaren (Ecclesiastes)
  'hv' => 22,  // Höga Visan (Song of Solomon)
  'jes' => 23,  // Jesaja (Isaiah)
  'jer' => 24,  // Jeremia (Jeremiah)
  'klag' => 25,  // Klagovisorna (Lamentations)
  'hes' => 26,  // Hesekiel (Ezekiel)
  'dan' => 27,  // Daniel
  'hos' => 28,  // Hosea
  'joel' => 29,  // Joel
  'amos' => 30,  // Amos
  'ob' => 31,  // Obadja (Obadiah)
  'jona' => 32,  // Jona (Jonah)
  'mika' => 33,  // Mika (Micah)
  'nah' => 34,  // Nahum
  'hab' => 35,  // Habackuk (Habakkuk)
  'sef' => 36,  // Sefanja (Zephaniah)
  'hag' => 37,  // Haggai
  'sak' => 38,  // Sakarja (Zechariah)
  'mal' => 39,  // Malaki (Malachi)
  'matt' => 40,  // Matteus (Matthew)
  'mark' => 41,  // Markus (Mark)
  'luk' => 42,  // Lukas (Luke)
  'joh' => 43,  // Johannes (John)
  'apg' => 44,  // Apostlagärningarna (Acts)
  'rom' => 45,  // Romarbrevet (Romans)
  '1kor' => 46,  // 1 Korintierbrevet (1 Corinthians)
  '2kor' => 47,  // 2 Korintierbrevet (2 Corinthians)
  'gal' => 48,  // Galaterbrevet (Galatians)
  'ef' => 49,  // Efesierbrevet (Ephesians)
  'fil' => 50,  // Filipperbrevet (Philippians)
  'kol' => 51,  // Kolosserbrevet (Colossians)
  '1tess' => 52,  // 1 Tessalonikerbrevet (1 Thessalonians)
  '2tess' => 53,  // 2 Tessalonikerbrevet (2 Thessalonians)
  '1tim' => 54,  // 1 Timoteusbrevet (1 Timothy)
  '2tim' => 55,  // 2 Timoteusbrevet (2 Timothy)
  'tit' => 56,  // Titusbrevet (Titus)
  'filem' => 57,  // Filemonbrevet (Philemon)
  'hebr' => 58,  // Hebreerbrevet (Hebrews)
  'jak' => 59,  // Jakobsbrevet (James)
  '1pet' => 60,  // 1 Petrusbrevet (1 Peter)
  '2pet' => 61,  // 2 Petrusbrevet (2 Peter)
  '1joh' => 62,  // 1 Johannesbrevet (1 John)
  '2joh' => 63,  // 2 Johannesbrevet (2 John)
  '3joh' => 64,  // 3 Johannesbrevet (3 John)
  'jud' => 65,  // Judasbrevet (Jude)
  'upp' => 66  // Uppenbarelseboken (Revelation)
];

// Chapters in each bible book
$chapters = [
  '1mos' => 50,
  '2mos' => 40,
  '3mos' => 27,
  '4mos' => 36,
  '5mos' => 34,
  'jos' => 24,
  'dom' => 21,
  'rut' => 4,
  '1sam' => 31,
  '2sam' => 24,
  '1kon' => 22,
  '2kon' => 25,
  '1kro' => 29,
  '2kro' => 36,
  'esr' => 10,
  'neh' => 13,
  'est' => 10,
  'job' => 42,
  'ps' => 150,
  'ords' => 31,
  'pred' => 12,
  'hv' => 8,
  'jes' => 66,
  'jer' => 52,
  'klag' => 5,
  'hes' => 48,
  'dan' => 12,
  'hos' => 14,
  'joel' => 3,
  'amos' => 9,
  'ob' => 1,
  'jona' => 4,
  'mika' => 7,
  'nah' => 3,
  'hab' => 3,
  'sef' => 3,
  'hag' => 2,
  'sak' => 14,
  'mal' => 4,
  'matt' => 28,
  'mark' => 16,
  'luk' => 24,
  'joh' => 21,
  'apg' => 28,
  'rom' => 16,
  '1kor' => 16,
  '2kor' => 13,
  'gal' => 6,
  'ef' => 6,
  'fil' => 4,
  'kol' => 4,
  '1tess' => 5,
  '2tess' => 3,
  '1tim' => 6,
  '2tim' => 4,
  'tit' => 3,
  'filem' => 1,
  'hebr' => 13,
  'jak' => 5,
  '1pet' => 5,
  '2pet' => 3,
  '1joh' => 5,
  '2joh' => 1,
  '3joh' => 1,
  'jud' => 1,
  'upp' => 22
];

// Full book names
$book_names = [
  '1mos' => '1 Mosebok',
  '2mos' => '2 Mosebok',
  '3mos' => '3 Mosebok',
  '4mos' => '4 Mosebok',
  '5mos' => '5 Mosebok',
  'jos' => 'Josua',
  'dom' => 'Domarboken',
  'rut' => 'Rut',
  '1sam' => '1 Samuelsboken',
  '2sam' => '2 Samuelsboken',
  '1kon' => '1 Kungaboken',
  '2kon' => '2 Kungaboken',
  '1kro' => '1 Krönikeboken',
  '2kro' => '2 Krönikeboken',
  'esr' => 'Esra',
  'neh' => 'Nehemja',
  'est' => 'Ester',
  'job' => 'Job',
  'ps' => 'Psaltaren',
  'ords' => 'Ordspråksboken',
  'pred' => 'Predikaren',
  'hv' => 'Höga Visan',
  'jes' => 'Jesaja',
  'jer' => 'Jeremia',
  'klag' => 'Klagovisorna',
  'hes' => 'Hesekiel',
  'dan' => 'Daniel',
  'hos' => 'Hosea',
  'joel' => 'Joel',
  'amos' => 'Amos',
  'ob' => 'Obadja',
  'jona' => 'Jona',
  'mika' => 'Mika',
  'nah' => 'Nahum',
  'hab' => 'Habackuk',
  'sef' => 'Sefanja',
  'hag' => 'Haggai',
  'sak' => 'Sakarja',
  'mal' => 'Malaki',
  'matt' => 'Matteus',
  'mark' => 'Markus',
  'luk' => 'Lukas',
  'joh' => 'Johannes',
  'apg' => 'Apostlagärningarna',
  'rom' => 'Romarbrevet',
  '1kor' => '1 Korintierbrevet',
  '2kor' => '2 Korintierbrevet',
  'gal' => 'Galaterbrevet',
  'ef' => 'Efesierbrevet',
  'fil' => 'Filipperbrevet',
  'kol' => 'Kolosserbrevet',
  '1tess' => '1 Tessalonikerbrevet',
  '2tess' => '2 Tessalonikerbrevet',
  '1tim' => '1 Timoteusbrevet',
  '2tim' => '2 Timoteusbrevet',
  'tit' => 'Titusbrevet',
  'filem' => 'Filemonbrevet',
  'hebr' => 'Hebreerbrevet',
  'jak' => 'Jakobsbrevet',
  '1pet' => '1 Petrusbrevet',
  '2pet' => '2 Petrusbrevet',
  '1joh' => '1 Johannesbrevet',
  '2joh' => '2 Johannesbrevet',
  '3joh' => '3 Johannesbrevet',
  'jud' => 'Judasbrevet',
  'upp' => 'Uppenbarelseboken'
];

?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $book_names[$book]; ?> - FSB</title>
  <style>
    body {
      font-family: 'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif;
      font-size: 1.2em;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
      color: #111;
    }
    .book {
      width: 100%;
      max-width: 480px;
      margin: 48px auto;
    }
    .verse {
      display: inline;
      hyphens: auto;
    }
    .verse i {
      vertical-align: super;
      font-size: 0.6em;
      color: #777;
      margin-right: 0.3em;
    }
    .navigation {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.5em 0.6em;
      font-size: 0.7em;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(2px);
      border-bottom-left-radius: 0.5em;
      border-bottom-right-radius: 0.5em;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #book-select, #chapter-select {
      border: 0;
      background-color: transparent;
      font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }
  </style>
</head>
<body>

<div class="navigation">
  <select name='book-select' id='book-select' onchange="window.location.href = 'index.php?read=' + this.value;">
    <?php
    foreach ($book_names as $key => $value) {
      // Set the selected attribute if the key matches the current book
      $selected = ($key === $book) ? 'selected' : '';
      echo "<option value='" . $key . "' $selected>" . $value . '</option>';
    }
    ?>
  </select>
  <select name="chapter-select" id="chapter-select" onchange="window.location.href = '#' + this.value;">
    <?php
    for ($i = 1; $i <= $chapters[$book]; $i++) {
      echo "<option value='" . $i . "'>" . $i . '</option>';
    }
    ?>
  </select>
</div>

  <?php
  // Get the book number and pad with leading zeros
  $book_number = str_pad($book_numbers[$book], 2, '0', STR_PAD_LEFT);
  // Get the book text from FSB/$book_number.html
  $book_text = file_get_contents('FSB/' . $book_number . '.html');
  echo $book_text;
  ?>
    
</body>
</html>