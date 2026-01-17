const path = require('path');

const rootDir = __dirname;

module.exports = {
  // Data paths
  data: {
    bibles: {
      xml1917: path.join(rootDir, 'data/bibles/1917.xml'),
      fsbXml: path.join(rootDir, 'data/bibles/FSB.xml'),
      fsbPre: path.join(rootDir, 'data/bibles/FSB_pre.xml'),
    },
    changes: {
      checks: path.join(rootDir, 'data/changes/checks.json'),
      replacements: path.join(rootDir, 'data/changes/replacements.json'),
      numberReplacements: path.join(rootDir, 'data/changes/number_replacements.json'),
      newWords: path.join(rootDir, 'data/changes/new_words.md'),
    },
  },
  // Folders
  folders: {
    fsbXmlDir: path.join(rootDir, 'web/utils/FSB_xml'),
    fsbHtmlDir: path.join(rootDir, 'web/prod/FSB'),
    analysisDir: path.join(rootDir, 'analysis'),
  },
  // Workflow paths
  workflows: {
    diffFinder: path.join(rootDir, 'workflows/diff_finder'),
    llm25: path.join(rootDir, 'workflows/llm_25'),
    llmVerse: path.join(rootDir, 'workflows/llm_verse'),
    numbers: path.join(rootDir, 'workflows/numbers'),
    numbersChecker: path.join(rootDir, 'workflows/numbers_checker'),
    numbersApply: path.join(rootDir, 'workflows/numbers_apply'),
    replacementApply: path.join(rootDir, 'workflows/replacement_apply'),
    replacementChecker: path.join(rootDir, 'workflows/replacement_checker'),
    verseChecker: path.join(rootDir, 'workflows/verse_checker'),
  },
  // Root
  root: rootDir,
};
