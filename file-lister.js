/**
 * file-lister-recursive.js
 *
 * Recursively scans a directory (provided as a command-line argument) and
 * writes Type, Path, Name, Extension as CSV to ./output/file-list.csv
 *
 * Type values:
 *   D  – Directory
 *   F  – File
 *
 * Usage:
 *   node file-lister-recursive.js "C:\Users\YourName\Documents"
 *
 * Node.js built-ins used:
 *   - fs   : https://nodejs.org/api/fs.html
 *   - path : https://nodejs.org/api/path.html
 */

const fs   = require('fs');
const path = require('path');

// ── 1. Validate the input argument ──────────────────────────────────────────

const inputArg = process.argv[2];

if (!inputArg) {
  console.error('Error: No directory path provided.\n');
  console.error('Usage: node file-lister-recursive.js "C:\\path\\to\\folder"');
  process.exit(1);
}

// path.resolve normalises the supplied path (handles relative paths and
// Windows back-slash separators).
// https://nodejs.org/api/path.html#pathresolvepaths
const rootDir = path.resolve(inputArg);

if (!fs.existsSync(rootDir)) {
  console.error(`Error: Path does not exist → ${rootDir}`);
  process.exit(1);
}

if (!fs.statSync(rootDir).isDirectory()) {
  console.error(`Error: Path is not a directory → ${rootDir}`);
  process.exit(1);
}

// ── 2. RFC 4180 CSV field escaping ──────────────────────────────────────────
// Wrap in double-quotes when the value contains a comma, double-quote, or
// newline; escape any embedded double-quotes by doubling them.

function escapeField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildRow(type, filePath, name, ext) {
  return [type, filePath, name, ext].map(escapeField).join(',');
}

// ── 3. Recursive scan ───────────────────────────────────────────────────────
// Uses a stack (iterative depth-first) instead of recursion to avoid hitting
// Node's call-stack limit on very deep directory trees.
//
// fs.readdirSync with { withFileTypes: true } returns Dirent objects, giving
// us .isFile() / .isDirectory() without an extra stat call per entry.
// https://nodejs.org/api/fs.html#fsreaddirsyncpath-options

const rows = [];

function scan(dir) {
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // Permission errors etc. – log and skip rather than aborting the whole run
    console.warn(`Warning: Cannot read directory "${dir}" – ${err.message}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // path.extname returns '' for directories, which is correct
      rows.push(buildRow('D', fullPath, entry.name, ''));
      scan(fullPath);                          // recurse
    } else if (entry.isFile()) {
      // path.extname includes the leading dot, e.g. ".txt"; returns '' if none
      // https://nodejs.org/api/path.html#pathextnamepath
      const ext = path.extname(entry.name);
      rows.push(buildRow('F', fullPath, entry.name, ext));
    }
    // Symlinks, block devices, etc. are intentionally skipped
  }
}

scan(rootDir);

// ── 4. Write output ─────────────────────────────────────────────────────────

const outputDir  = path.join(process.cwd(), 'output');
const outputFile = path.join(outputDir, 'file-list.csv');

// { recursive: true } is a no-op when the folder already exists – no error thrown
// https://nodejs.org/api/fs.html#fsmkdirsyncpath-options
fs.mkdirSync(outputDir, { recursive: true });

const header  = 'type,path,name,extension';
const csvBody = [header, ...rows].join('\n');

// writeFileSync overwrites any existing file-list.csv
// https://nodejs.org/api/fs.html#fswritefilesyncfile-data-options
fs.writeFileSync(outputFile, csvBody, { encoding: 'utf8' });

// ── 5. Summary ───────────────────────────────────────────────────────────────

const dirCount  = rows.filter(r => r.startsWith('D')).length;
const fileCount = rows.filter(r => r.startsWith('F')).length;

console.log(`✔  Scanned      : ${rootDir}`);
console.log(`✔  Directories  : ${dirCount}`);
console.log(`✔  Files        : ${fileCount}`);
console.log(`✔  Output       : ${outputFile}`);