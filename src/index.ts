import * as fs from 'fs';
import * as path from 'path';
import cliProgress from 'cli-progress';

/**
 * Recursively copies a directory from source to destination.
 * Ignores the contents of any node_modules directories but still creates empty node_modules directories.
 * @param src - Source directory path
 * @param dest - Destination directory path
 */
function copyDirectory(src: string, dest: string) {
  // Check if source exists
  if (!fs.existsSync(src)) {
    console.error(`Source directory "${src}" does not exist.`);
    process.exit(1);
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read items in the source directory
  const items = fs.readdirSync(src);

  items.forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stats = fs.lstatSync(srcPath);

    if (stats.isDirectory()) {
      if (item === 'node_modules') {
        // Create empty node_modules directory in destination
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath);
          console.log(`Created empty directory: ${destPath}`);
        }
      } else {
        // Recursively copy subdirectories
        copyDirectory(srcPath, destPath);
      }
    } else if (stats.isFile()) {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied file: ${destPath}`);
    }
    // Handle symbolic links if necessary
    // Add more conditions here if you need to handle other types (e.g., symbolic links)
  });
}

/**
 * Entry point of the application.
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: copy-project <source_directory> <destination_directory>');
    process.exit(1);
  }

  const sourceDir = args[0] ? path.resolve(args[0]) : undefined;
  const destinationDir = args[1] ? path.resolve(args[1]) : undefined;

  console.log(`Copying from "${sourceDir}" to "${destinationDir}"...`);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  function onProgress(source: string, destination: string, progress: number) {
    bar.update(progress * 100);
    console.log(`Copying: ${source} -> ${destination}`);
  }

  if (sourceDir && destinationDir) {
    bar.start(100, 0);
    copyDirectory(sourceDir, destinationDir, onProgress);
    bar.stop();
    console.log('Copy operation completed.');
  } else {
    console.error('Source or destination directory is undefined.');
  }
}

main();
