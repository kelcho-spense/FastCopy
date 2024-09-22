# FastCopy

FastCopy is a high-performance, multi-threaded file copying utility built with Node.js and TypeScript. It's designed to efficiently copy large directories while providing real-time progress feedback.

## Features

- **Multi-threaded Copying**: Utilizes worker threads to parallelize the copying process, significantly improving performance on multi-core systems.
- **Progress Tracking**: Displays a real-time progress bar to visualize the copying process.
- **Selective Copying**: Intelligently skips certain directories (e.g., `node_modules`, `.git`) to focus on essential files.
- **Large File Optimization**: Uses different copying strategies for large and small files to optimize performance.
- **Windows Long Path Support**: Automatically handles long file paths on Windows systems.
- **Detailed Logging**: Provides comprehensive error logging for troubleshooting.

## Prerequisites

- Node.js (version 18.0.0 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/fastcopy.git
   cd fastcopy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Usage

Run the FastCopy utility using the following command:

```
node dist/index.js --source="/path/to/source" --destination="/path/to/destination"
```

Replace `/path/to/source` with the directory you want to copy from, and `/path/to/destination` with the directory where you want to copy the files to.

## Configuration

You can customize the behavior of FastCopy by modifying the following constants in `src/worker.ts`:

- `LARGE_FILE_THRESHOLD`: The size threshold (in bytes) for considering a file as "large". Default is 10MB.
- `BATCH_SIZE`: The number of files processed in each batch by a worker thread. Default is 100.

To ignore additional directories, add them to the `ignoredPaths` array in `src/index.ts`.

## How It Works

1. The main process scans the source directory and counts the total number of files to be copied.
2. Files are divided into chunks and distributed among worker threads.
3. Each worker thread processes its chunk of files, copying them to the destination.
4. The main process displays overall progress and handles worker communication.
5. Upon completion, a summary of the copying process is displayed.

## Performance Considerations

- The number of worker threads is automatically set to the number of CPU cores available on the system.
- Large files are copied using `fs.copy`, while smaller files use `fs.copyFile` for optimized performance.
- The progress bar updates in real-time, providing accurate feedback on the copying process.

## Error Handling

- Errors during the copying process are logged with detailed information.
- Skipped files are reported, allowing for easy identification of problematic files.

## Contributing

Contributions to FastCopy are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
