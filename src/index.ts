import * as fs from 'fs-extra';
import * as path from 'path';
import cliProgress from 'cli-progress';

const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
}, cliProgress.Presets.shades_classic);

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

let totalFiles = 0;
let copiedFiles = 0;
let skippedFiles = 0;
const overallBar = multibar.create(100, 0);
const fileBar = multibar.create(100, 0);

let ignoreFolders: Set<string> = new Set();
let ignoreFiles: Set<string> = new Set();

async function loadIgnoreFile(ignoreFilePath: string) {
  try {
    const content = await fs.readFile(ignoreFilePath, 'utf-8');
    content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .forEach(pattern => {
        if (pattern.endsWith('/')) {
          ignoreFolders.add(pattern.slice(0, -1));
        } else {
          ignoreFiles.add(pattern);
        }
      });
  } catch (error) {
    console.warn(`Warning: Unable to read .copyignore file. Proceeding without ignore patterns.`);
  }
}

function shouldIgnore(filePath: string, isDirectory: boolean): boolean {
  const relativePath = path.relative(sourceDir, filePath);
  const parts = relativePath.split(path.sep);

  if (isDirectory) {
    return parts.some(part => ignoreFolders.has(part));
  } else {
    return ignoreFiles.has(relativePath) || parts.some(part => ignoreFolders.has(part));
  }
}

async function copyDirectory(src: string, dest: string) {
  let entries;
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch (error) {
    console.warn(`Warning: Unable to read directory ${src}. Skipping...`);
    return;
  }

  await fs.ensureDir(dest);
  
  const totalItems = entries.length;
  progressBar.start(totalItems, 0);
  let processedItems = 0;

  for (const entry of entries) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldIgnore(sourcePath, entry.isDirectory())) {
      progressBar.increment();
      processedItems++;
      skippedFiles++;
      overallBar.increment();
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else {
      try {
        await fs.copy(sourcePath, destPath);
        console.log(`Copied: ${sourcePath}`);
        copiedFiles++;
        overallBar.increment();
      } catch (error) {
        console.warn(`Warning: Unable to copy ${sourcePath}. Skipping...`);
        skippedFiles++;
        overallBar.increment();
      }
    }

    progressBar.increment();
    processedItems++;
  }

  if (src === sourceDir) {
    progressBar.stop();
  }
}

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key] = value;
  }
  return acc;
}, {} as Record<string, string>);

const sourceDir = path.normalize(args.source ?? '');
const destinationDir = path.normalize(args.destination ?? '');

console.log(`Copying from ${sourceDir} to ${destinationDir}`);
const startTime = Date.now();

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldIgnore(path.join(dir, entry.name), true)) {
        count += await countFiles(path.join(dir, entry.name));
      }
    } else {
      if (!shouldIgnore(path.join(dir, entry.name), false)) {
        count++;
      }
    }
  }

  return count;
}

async function main() {
  const ignoreFilePath = path.join(sourceDir, '.copyignore');
  await loadIgnoreFile(ignoreFilePath);

  // Count total files
  totalFiles = await countFiles(sourceDir);
  overallBar.setTotal(totalFiles);

  // Start copying
  await copyDirectory(sourceDir, destinationDir);

  multibar.stop();

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // Convert to seconds

  console.log(`\nCopy completed in ${duration.toFixed(2)} seconds.`);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Copied files: ${copiedFiles}`);
  console.log(`Skipped files: ${skippedFiles}`);
}

// Call the main function
main().catch(console.error);
