// ./src/worker.ts
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs-extra';
import * as path from 'path';

interface WorkerData {
  chunk: string[];
  sourceDir: string;
  destinationDir: string;
}

const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB
const BATCH_SIZE = 100; // Number of files to process in a batch

// Utility function to handle long paths
function normalizePath(filePath: string): string {
  const normalized = path.normalize(filePath);
  if (process.platform === 'win32') {
    // Prepend \\?\ to the path for Windows long path support
    return normalized.startsWith('\\\\?\\') ? normalized : `\\\\?\\${normalized}`;
  }
  return normalized;
}

// Function to Copy a Single File with Optimization for Large Files
async function copyFile(src: string, dest: string): Promise<void> {
  try {
    const normalizedSrc = normalizePath(src);
    const normalizedDest = normalizePath(dest);
    const stats = await fs.stat(normalizedSrc);
    if (stats.size > LARGE_FILE_THRESHOLD) {
      await fs.copy(normalizedSrc, normalizedDest);
    } else {
      await fs.copyFile(normalizedSrc, normalizedDest);
    }
  } catch (error: any) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}

// Function to Copy a Batch of Files
async function copyBatch(files: string[], sourceDir: string, destDir: string): Promise<void> {
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    try {
      await fs.ensureDir(normalizePath(path.dirname(destPath)));
      await copyFile(sourcePath, destPath);
      parentPort?.postMessage({ status: 'copied', file });
    } catch (error: any) {
      const errorMessage = `Error copying ${file}: ${error.message}`;
      console.error(errorMessage);
      parentPort?.postMessage({ status: 'skipped', file, error: errorMessage });
    }
  }
}

(async () => {
  const { chunk, sourceDir, destinationDir } = workerData as WorkerData;

  for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
    const batch = chunk.slice(i, i + BATCH_SIZE);
    await copyBatch(batch, sourceDir, destinationDir);
  }

  parentPort?.postMessage({ status: 'done' });
  process.exit(0);
})().catch(error => {
  console.error('Worker encountered an error:', error);
  parentPort?.postMessage({ status: 'error', error: error.message });
  process.exit(1);
});
