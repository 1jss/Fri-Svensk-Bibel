<?php
// FSB Approval & Review System
// Web interface for approving verses with optional inline edits

// Configuration
$dbPath = __DIR__ . '/fsb_approval.db';
$baseUrl = $_SERVER['PHP_SELF'];

// Map book number to name
function getBookName($bnumber) {
  $bookNames = [
    1 => '1 Mose', 2 => '2 Mose', 3 => '3 Mose', 4 => '4 Mose', 5 => '5 Mose',
    6 => 'Josua', 7 => 'Domarna', 8 => 'Rut', 9 => '1 Samuel', 10 => '2 Samuel',
    11 => '1 Kungaboken', 12 => '2 Kungaboken', 13 => '1 Krönikeboken', 14 => '2 Krönikeboken', 15 => 'Esra',
    16 => 'Nehemja', 17 => 'Ester', 18 => 'Job', 19 => 'Psaltaren', 20 => 'Ordspråken',
    21 => 'Predikaren', 22 => 'Höga visan', 23 => 'Jesaja', 24 => 'Jeremia', 25 => 'Klagevisorna',
    26 => 'Hesekiel', 27 => 'Daniel', 28 => 'Hosea', 29 => 'Joel', 30 => 'Amos',
    31 => 'Obadja', 32 => 'Jona', 33 => 'Mikea', 34 => 'Nahum', 35 => 'Habakuk',
    36 => 'Sefanja', 37 => 'Haggai', 38 => 'Sakarja', 39 => 'Malaki',
    40 => 'Matteus', 41 => 'Markus', 42 => 'Lukas', 43 => 'Johannes', 44 => 'Apostlagärningarna',
    45 => 'Romarbrevet', 46 => '1 Korintierbrevet', 47 => '2 Korintierbrevet', 48 => 'Galaterbrevet', 49 => 'Efesierbrevet',
    50 => 'Filipperbrevet', 51 => 'Kolosserbrevet', 52 => '1 Thessalonikerbrevet', 53 => '2 Thessalonikerbrevet', 54 => '1 Timoteusbrevet',
    55 => '2 Timoteusbrevet', 56 => 'Titusbrevet', 57 => 'Filemobrevet', 58 => 'Hebreerbrevet', 59 => 'Jakobsbrevet',
    60 => '1 Petrusbrevet', 61 => '2 Petrusbrevet', 62 => '1 Johannesbrevet', 63 => '2 Johannesbrevet', 64 => '3 Johannesbrevet',
    65 => 'Judasbrevet', 66 => 'Uppenbarelseboken'
  ];
  return $bookNames[$bnumber] ?? 'Unknown';
}

// Connect to database
function getDB() {
  global $dbPath;
  try {
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
  } catch (Exception $e) {
    die('Database connection failed: ' . $e->getMessage());
  }
}

// Get verse by ID
function getVerseById($db, $id) {
  $stmt = $db->prepare('SELECT * FROM verses WHERE id = ?');
  $stmt->execute([$id]);
  return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Get next unapproved verse
function getNextUnapproved($db, $currentId = null) {
  if ($currentId) {
    $stmt = $db->prepare('
      SELECT * FROM verses 
      WHERE approved = 0 AND id > ? 
      ORDER BY id 
      LIMIT 1
    ');
    $stmt->execute([$currentId]);
  } else {
    $stmt = $db->prepare('
      SELECT * FROM verses 
      WHERE approved = 0 
      ORDER BY bnumber, cnumber, vnumber 
      LIMIT 1
    ');
    $stmt->execute();
  }
  return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Get previous unapproved verse
function getPreviousUnapproved($db, $currentId) {
  $stmt = $db->prepare('
    SELECT * FROM verses 
    WHERE approved = 0 AND id < ? 
    ORDER BY id DESC 
    LIMIT 1
  ');
  $stmt->execute([$currentId]);
  return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Approve verse
function approveVerse($db, $verseId, $textFsb = null) {
  if ($textFsb !== null) {
    $stmt = $db->prepare('
      UPDATE verses 
      SET approved = 1, text_fsb = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    ');
    $stmt->execute([$textFsb, $verseId]);
  } else {
    $stmt = $db->prepare('
      UPDATE verses 
      SET approved = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    ');
    $stmt->execute([$verseId]);
  }
}

// Get all books with pending verses
function getBooksWithPending($db) {
  $stmt = $db->prepare('
    SELECT DISTINCT bnumber
    FROM verses 
    WHERE approved = 0 
    ORDER BY bnumber
  ');
  $stmt->execute();
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// Get chapters in book
function getChaptersInBook($db, $bnumber) {
  $stmt = $db->prepare('
    SELECT DISTINCT cnumber 
    FROM verses 
    WHERE bnumber = ? 
    ORDER BY cnumber
  ');
  $stmt->execute([$bnumber]);
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// Get verses in book/chapter
function getVersesByChapter($db, $bnumber, $cnumber) {
  $stmt = $db->prepare('
    SELECT * FROM verses 
    WHERE bnumber = ? AND cnumber = ? 
    ORDER BY vnumber
  ');
  $stmt->execute([$bnumber, $cnumber]);
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Get statistics
function getStats($db) {
  $stmt = $db->prepare('
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) as pending
    FROM verses
  ');
  $stmt->execute();
  return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Handle actions
$db = getDB();
$action = $_POST['action'] ?? $_GET['action'] ?? null;
$currentVerse = null;
$nextVerse = null;
$previousVerse = null;
$verseId = $_POST['verse_id'] ?? $_GET['verse_id'] ?? null;
$bnumber = $_GET['read'] ?? $_POST['read'] ?? null;
$cnumber = $_GET['chapter'] ?? $_POST['chapter'] ?? null;

if ($action === 'approve' && $verseId) {
  $textFsb = $_POST['text_fsb'] ?? null;
  approveVerse($db, $verseId, $textFsb);
  
  // Get next unapproved verse to show
  $nextVerse = getNextUnapproved($db, $verseId);
  if ($nextVerse) {
    header('Location: ' . $baseUrl . '?action=view&verse_id=' . $nextVerse['id']);
    exit;
  } else {
    header('Location: ' . $baseUrl);
    exit;
  }
}

if ($action === 'next' && $verseId) {
  $nextVerse = getNextUnapproved($db, $verseId);
  if ($nextVerse) {
    header('Location: ' . $baseUrl . '?action=view&verse_id=' . $nextVerse['id']);
    exit;
  } else {
    header('Location: ' . $baseUrl);
    exit;
  }
}

if ($action === 'prev' && $verseId) {
  $previousVerse = getPreviousUnapproved($db, $verseId);
  if ($previousVerse) {
    header('Location: ' . $baseUrl . '?action=view&verse_id=' . $previousVerse['id']);
    exit;
  } else {
    header('Location: ' . $baseUrl);
    exit;
  }
}

if ($action === 'view' && $verseId) {
  $currentVerse = getVerseById($db, $verseId);
  $nextVerse = getNextUnapproved($db, $verseId);
  $previousVerse = getPreviousUnapproved($db, $verseId);
}

$stats = getStats($db);
$pendingBooks = getBooksWithPending($db);

?>
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FSB Approval</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">

    <?php if ($action === 'view' && $currentVerse): ?>
      <div class="approval-panel">
        <span class="verse-ref"><?php echo getBookName($currentVerse['bnumber']) . ' ' . $currentVerse['cnumber'] . ':' . $currentVerse['vnumber']; ?></span>
        
        <div class="two-column">
          <div>
            <label>1917</label>
            <textarea class="readonly" readonly><?php echo htmlspecialchars($currentVerse['text_1917']); ?></textarea>
          </div>
          <div>
            <form method="POST">
              <input type="hidden" name="verse_id" value="<?php echo $currentVerse['id']; ?>">
              <label>FSB</label>
              <textarea name="text_fsb" id="fsb-textarea"><?php echo htmlspecialchars($currentVerse['text_fsb']); ?></textarea>
              
              <div class="form-actions">
                <button type="submit" name="action" value="prev" <?php echo $previousVerse ? '' : 'disabled'; ?>>← Prev</button>
                <button type="submit" name="action" value="approve" class="primary">Approve</button>
                <button type="submit" name="action" value="next" <?php echo $nextVerse ? '' : 'disabled'; ?>>Next →</button>
              </div>
            </form>
          </div>
        </div>
        
        <div class="back-section">
          <a href="<?php echo $baseUrl . '?read=' . $currentVerse['bnumber'] . '&chapter=' . $currentVerse['cnumber']; ?>" class="back-link">← Back</a>
        </div>
      </div>

    <?php else: ?>
      <div class="selector">
        <form method="GET">
          <div class="selector-row">
            <div>
              <label>Book</label>
              <select name="read" onchange="this.form.submit()">
                <option value="">Select book...</option>
                <?php foreach ($pendingBooks as $b): ?>
                  <option value="<?php echo $b; ?>" <?php echo ($bnumber == $b) ? 'selected' : ''; ?>>
                    <?php echo getBookName($b); ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>
            <div>
              <label>Chapter</label>
              <select name="chapter" onchange="this.form.submit()">
                <option value="">Select chapter...</option>
                <?php 
                  if ($bnumber) {
                    $chapters = getChaptersInBook($db, $bnumber);
                    foreach ($chapters as $c) {
                      $selected = ($cnumber == $c) ? 'selected' : '';
                      echo "<option value='$c' $selected>$c</option>";
                    }
                  }
                ?>
              </select>
            </div>
          </div>
        </form>
      </div>

      <?php if ($bnumber && $cnumber): ?>
        <div class="verses-list">
          <?php 
            $verses = getVersesByChapter($db, $bnumber, $cnumber);
            if ($verses):
              foreach ($verses as $v):
          ?>
            <div class="verse-item <?php echo 'approved-' . $v['approved']; ?>" onclick="window.location='<?php echo $baseUrl . '?action=view&verse_id=' . $v['id']; ?>'">
              <div class="verse-num"><?php echo $v['vnumber']; ?></div>
              <div class="verse-text"><?php echo htmlspecialchars($v['text_fsb']); ?></div>
            </div>
          <?php 
              endforeach;
            endif;
          ?>
        </div>
      <?php elseif (!$bnumber && !$cnumber): ?>
        <div class="stats">
          <p>Total: <strong><?php echo $stats['total']; ?></strong></p>
          <p>Pending: <strong><?php echo $stats['pending']; ?></strong></p>
        </div>
      <?php endif; ?>

    <?php endif; ?>

  </div>

  <script>
    const textarea = document.getElementById('fsb-textarea');
    if (textarea) {
      function autoResize() {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
      }
      textarea.addEventListener('input', autoResize);
      window.addEventListener('load', autoResize);
    }
  </script>
</body>
</html>
