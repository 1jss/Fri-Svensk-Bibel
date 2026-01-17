<?php

if (!isset($_POST['original-text']) || !isset($_POST['edited-text'])) {
    echo 'Error: original-text or edited-text not set';
    exit;
}

$original_text = $_POST['original-text'];
$edited_text = $_POST['edited-text'];

$file = fopen('diff.txt', 'a');

$diff = $original_text . "\n" . $edited_text . "\n\n";
fwrite($file, $diff);
fclose($file);

echo 'Saved';

?>