# CopyFiles

CopyFiles is a Node.js utility for efficiently copying directories while skipping the `node_modules` folder. It features a progress bar to visualize the copying process.

## Features

- Recursively copies directories and files
- Skips `node_modules` folder to save time and space
- Displays a progress bar during the copy process
- Supports custom source and destination paths

## Prerequisites

- Node.js (version 18 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/copyfiles.git
   cd copyfiles
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

### Development Mode

To run the script in :

```bash
npx tsx src/index.ts source="add_directory_here" destination="add_directory_here"
```
