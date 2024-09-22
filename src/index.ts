// ./src/index.ts
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import cliProgress from 'cli-progress';
import { Worker } from 'worker_threads';
import os from 'os';
import { fileURLToPath } from 'url';


// ----------------------------
// 1. Variable Declarations
// ----------------------------

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    // Remove surrounding quotes if present
    const cleanedValue = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    acc[key.replace(/^--/, '')] = cleanedValue;
  }
  return acc;
}, {} as Record<string, string>);

// Normalize source and destination directories
const sourceDir = path.normalize(args.source ?? '');
const destinationDir = path.normalize(args.destination ?? '');

// Validate arguments
if (!sourceDir || !destinationDir) {
  console.error('Error: Both --source and --destination arguments are required.');
  process.exit(1);
}

console.log(`Copying from ${sourceDir} to ${destinationDir}`);
const startTime = Date.now();

// ----------------------------
// 2. Progress Bars Setup
// ----------------------------

const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
}, cliProgress.Presets.shades_classic);

const overallBar = multibar.create(100, 0, { name: 'Overall Progress' });

// ----------------------------
// 3. Ignore Patterns Setup
// ----------------------------

const ignoredPaths = [
  'node_modules',
  '.pnpm-store',
  '$RECYCLE.BIN',
  'System Volume Information',
  '.next', // Add this line to ignore the .next directory
  // Add any other problematic directories here
];



// Function to determine if a file or folder should be ignored
function shouldIgnore(filePath: string, isDirectory: boolean): boolean {
  const relativePath = path.relative(sourceDir, filePath);
  const parts = relativePath.split(path.sep);

  // Add this check at the beginning of the function
  if (parts.includes('System Volume Information')) {
    return true;
  }

  // Ignore .git directories and their contents
  if (parts.includes('.git')) {
    return true;
  }

  if (isDirectory) {
    return parts.some(part => ignoredPaths.includes(part));
  } else {
    return ignoredPaths.some(pattern => relativePath.startsWith(pattern));
  }
}

// ----------------------------
// 4. File Counting
// ----------------------------

let totalFiles = 0;
let copiedFiles = 0;
let skippedFiles = 0;

// Function to count total files for progress tracking
async function countFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldIgnore(fullPath, true)) {
        count += await countFiles(fullPath);
      }
    } else {
      if (!shouldIgnore(fullPath, false)) {
        count++;
      }
    }
  }

  return count;
}

// ----------------------------
// 5. File Collection
// ----------------------------

// Function to collect all files to copy
async function collectFiles(dir: string, base: string, result: string[]) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = path.join(base, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnore(fullPath, true)) {
        await collectFiles(fullPath, relativePath, result);
      }
    } else {
      if (!shouldIgnore(fullPath, false)) {
        result.push(relativePath);
      }
    }
  }
}

// ----------------------------
// 6. Worker Thread Handling
// ----------------------------

// Function to get the current directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to spawn a worker
function spawnWorker(chunk: string[]): Worker {
  const workerPath = path.join(__dirname, 'worker.js');
  return new Worker(workerPath, { 
    workerData: { chunk, sourceDir, destinationDir }
  });
}

// ----------------------------
// 7. Main Function with Worker Threads
// ----------------------------

async function main() {
  // Get the directory of the current module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Count total files
  totalFiles = await countFiles(sourceDir);
  overallBar.setTotal(totalFiles);

  // Collect all files to copy
  const filesToCopy: string[] = [];
  await collectFiles(sourceDir, '', filesToCopy);

  // Determine the number of worker threads (based on CPU cores)
  const numCPUs = os.cpus().length;
  const chunkSize = Math.ceil(filesToCopy.length / numCPUs);
  const chunks = Array.from({ length: numCPUs }, (_, i) =>
    filesToCopy.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  // Spawn workers
  const workers = chunks.map(chunk => spawnWorker(chunk));

  // Listen for messages from workers to update progress
  workers.forEach(worker => {
    worker.on('message', (message: { status: string, file?: string, error?: string }) => {
      if (message.status === 'copied') {
        copiedFiles++;
      } else if (message.status === 'skipped') {
        skippedFiles++;
        if (message.error) {
          console.error(message.error);
        }
      }
      overallBar.update(copiedFiles + skippedFiles);
    });

    worker.on('error', (err) => {
      console.error(`Worker error: ${err}`);
    });

    worker.on('exit', (code) => {
      if (code !== 0)
        console.error(`Worker stopped with exit code ${code}`);
    });
  });

  // Wait for all workers to finish
  await Promise.all(workers.map(worker => new Promise<void>((resolve, reject) => {
    worker.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Worker stopped with exit code ${code}`));
    });
  })));

  multibar.stop();

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // seconds

  console.log(`\nCopy completed in ${duration.toFixed(2)} seconds.`);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Copied files: ${copiedFiles}`);
  console.log(`Skipped files: ${skippedFiles}`);
}


// ----------------------------
// 8. Start the Main Function
// ----------------------------

main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
});

