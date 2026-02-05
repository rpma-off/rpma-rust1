const fs = require('fs');
const path = require('path');

// Encoding corruption patterns
const patterns = [
  { corrupted: 'Ã©', correct: 'é' },
  { corrupted: 'Ã´', correct: 'ô' },
  { corrupted: 'Ã®', correct: 'î' },
  { corrupted: 'Ã¨', correct: 'è' },
  { corrupted: 'Ãª', correct: 'ê' },
  { corrupted: 'Ã ', correct: 'à' },
  { corrupted: 'Ã§', correct: 'ç' },
  { corrupted: 'Ã¹', correct: 'ù' },
  { corrupted: 'Ã«', correct: 'ë' },
  { corrupted: 'Ã¯', correct: 'ï' },
  { corrupted: 'Ã¼', correct: 'ü' },
  { corrupted: 'Ã¶', correct: 'ö' },
  { corrupted: 'Ã¤', correct: 'ä' },
  { corrupted: 'Ã¢', correct: 'â' },
  { corrupted: 'Ã‰', correct: 'É' },
  { corrupted: 'Ãˆ', correct: 'È' },
  { corrupted: 'ÃŠ', correct: 'Ê' },
  { corrupted: 'Ã€', correct: 'À' },
  { corrupted: 'Ã‡', correct: 'Ç' },
];

function getAllFiles(dirPath, extensions = ['.ts', '.tsx']) {
  const files = [];

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and .next directories
        if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
          traverse(fullPath);
        }
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dirPath);
  return files;
}

function fixEncoding() {
  const frontendDir = path.join(__dirname, '../frontend/src');

  if (!fs.existsSync(frontendDir)) {
    console.error(`Directory not found: ${frontendDir}`);
    process.exit(1);
  }

  // Find all .ts and .tsx files
  const files = getAllFiles(frontendDir, ['.ts', '.tsx']);

  let totalFilesFixed = 0;
  let totalReplacements = 0;

  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let replacementsInFile = 0;

    // Replace each corrupted pattern
    for (const { corrupted, correct } of patterns) {
      const regex = new RegExp(escapeRegExp(corrupted), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, correct);
        replacementsInFile += matches.length;
      }
    }

    // Only write file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFilesFixed++;
      totalReplacements += replacementsInFile;
      console.log(`✓ Fixed ${replacementsInFile} replacements in ${path.relative(frontendDir, filePath)}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Files fixed: ${totalFilesFixed}`);
  console.log(`Total replacements: ${totalReplacements}`);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

fixEncoding();
