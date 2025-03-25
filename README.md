# Dictionary Generation Tool

![Node.js Tests](https://github.com/USERNAME/REPO_NAME/workflows/Node.js%20Tests/badge.svg)
![Code Quality](https://github.com/USERNAME/REPO_NAME/workflows/Code%20Quality/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/USERNAME/REPO_NAME/badge.svg?branch=main)](https://coveralls.io/github/USERNAME/REPO_NAME?branch=main)

A parallel processing tool for generating dictionary entries using Google's Gemini AI API.

## Features

- Parallel processing using Node.js worker threads
- Automatic progress tracking and resumption
- Rate limit handling with configurable delays
- Detailed logging of API responses
- Progress monitoring with time estimates
- Batch processing with automatic retries
- JSON validation and error handling

## Prerequisites

1. Node.js installed
2. Google Gemini AI API key
3. Required npm packages
4. Word list file (words_list_full.txt)

## Installation

1. Install required packages:
```bash
npm install
```

2. Create and set up your environment file:
```bash
touch .env
echo "GEMINI_API_KEY=your_api_key_here" >> .env
echo ".env" >> .gitignore
```

3. Add your words list file to the data directory:
```bash
# Create a file with your words
touch data/words_list_full.txt
```
Add your words to the file, one word per line. Example:
```
# Dictionary Generation Word List
# Lines starting with # are comments and will be ignored

apple
banana
computer
```

A template file `data/words_list_template.txt` is provided for reference.

Note: Start with a small test list before processing a large vocabulary.

## Usage

The script supports several modes of operation which can be run using Node.js directly or npm scripts.

### Using npm scripts

```bash
# Start from beginning (index 0)
npm start

# Continue from last processed position
npm run continue

# Start fresh with default configuration 
npm run reset

# Count total words processed
npm run count

# Run a test batch (requires additional parameters)
npm run test -- 0 10

# Merge all chunks and recover progress
npm run mergeall

# Ensure all chunks have final.json files
npm run complete

# Clean up progress files for all chunks
npm run cleanup
```

For commands that require additional parameters, use the `--` separator as shown in the test example above.

### Using Node.js directly

### Default Mode (Start from Beginning)

```bash
node index.js
```

- Starts processing from the beginning (index 0)
- Creates new directories if they don't exist
- Uses existing configuration if available
- Distributes work among available CPU cores
- Saves progress for each chunk separately

### Continue Processing

```bash
node index.js continue [startIndex]
```

- Resumes processing from the last saved position
- If no `startIndex` is provided:
  1. Checks all progress files in `./chunks/progress/`
  2. Finds the highest processed index
  3. Resumes processing from that point
- If `startIndex` is provided, continues from that specific index
- Preserves existing progress and results

### Reset Processing

```bash
node index.js reset [startIndex]
```

- Starts a fresh processing run with default configuration
- If `startIndex` is provided, starts from that index
- If no `startIndex` is provided, starts from 0
- Does not attempt to load or use existing progress

### Merge Files

```bash
node index.js merge <chunkId>
```

- Merges all JSON files in the specified chunk directory
- Removes duplicate entries, keeping the latest version
- Updates progress tracking with actual word count
- Saves the merged result as `final.json`
- Automatically cleans up:
  - Individual JSON files after successful merge
  - Progress files in the chunk directory
  - Progress tracker file in `./chunks/progress/`

### Merge All Chunks

```bash
node index.js mergeall
```

- Merges all chunks in the output directory
- Useful for recovery after interruptions or failures
- Creates `final.json` for each chunk by merging progress files
- Finally merges all `final.json` files into one result file
- Handles cases where workers didn't complete successfully

### Complete Chunks

```bash
node index.js complete
```

- Ensures all chunks have `final.json` files
- Processes any chunks that have progress files but no final file
- Useful for recovering from interruptions or crashes
- Does not overwrite existing `final.json` files

### Clean Up Progress Files

```bash
node index.js cleanup [chunkId]
```

- Cleans up progress files after successful merging
- Can target a specific chunk or all chunks
- If `chunkId` is provided, cleans up that specific chunk
- If no `chunkId` is provided, cleans up all chunks
- Useful for freeing up disk space after merging

### Count Words

```bash
node index.js count
```

- Shows the total number of words processed across all chunks
- Calculates the sum by checking these sources in order:
  1. Progress files in `./output/progress/` directory
  2. The merged result file in `./output/merged/result_final.json`
  3. Individual `final.json` files in chunk directories

### Test Processing

```bash
node index.js test <startIndex> [batchSize]
```

- Tests processing on a single batch of words
- `startIndex`: Required, specifies where to start
- `batchSize`: Optional, defaults to 28 words
- Saves results in `./tests/results/`

## Output Files and Directories

All processing results and intermediate files are stored in the `./output/` directory:

```
output/
├── chunks/             # Individual chunk processing directories
│   ├── chunk_0/        # Chunk 0 processing directory
│   │   ├── progress_*.json  # Intermediate progress files
│   │   └── final.json  # Final merged result for this chunk
│   ├── chunk_1/        # Chunk 1 processing directory
│   │   └── ...
│   └── ...
├── progress/           # Progress tracking information
│   ├── chunk_0_progress.json
│   ├── chunk_1_progress.json
│   └── ...
└── merged/             # Final merged results
    └── result_final.json  # Complete dictionary with all processed words
```

### Key Files:

1. **Progress Files** (`./output/chunks/chunk_N/progress_*.json`):
   - Intermediate result files created during processing
   - Each contains processed words up to a certain index
   - Used for recovery if processing is interrupted

2. **Chunk Final Files** (`./output/chunks/chunk_N/final.json`):
   - Complete results for a specific chunk
   - Created when a chunk finishes processing or when using the `complete` command
   - Used as input for the final merge

3. **Progress Tracking** (`./output/progress/chunk_N_progress.json`):
   - Contains metadata about processing status
   - Includes information like last processed index, processing speed, etc.
   - Used for resuming interrupted processing

4. **Final Result** (`./output/merged/result_final.json`):
   - The complete merged dictionary
   - Contains all successfully processed words
   - This is the main output file you'll want to use

## Progress Tracking

The tool maintains detailed progress information:

- Each chunk has its own progress file in `./output/progress/`
- Progress files contain:
  - Last processed index
  - Total words processed
  - Processing speed
  - Time estimates
  - Actual word count

## Managing Long-Running Processes

1. **Monitoring Progress**
   - Check progress files in `./output/progress/`
   - Use `node index.js count` to see total processed words
   - Monitor log files in `./logs/` directory

2. **Stopping and Resuming**
   - Safely stop with Ctrl+C
   - Resume using `node index.js continue`
   - Progress is automatically saved per chunk

3. **Merging Results**
   - Periodically merge chunk results using `node index.js merge <chunkId>`
   - Final results are saved in `./output/merged/result_final.json`
   - Progress is preserved and updated after merging

4. **Recovery from Failures**
   - Each chunk saves progress independently
   - Failed chunks can be reprocessed separately
   - Use `node index.js complete` to ensure all chunks have final files
   - Use `node index.js mergeall preserve` to merge all chunks while preserving progress data
   - Use merge command to consolidate partial results

## Improved Error Handling

The tool includes robust error handling mechanisms:

1. **Worker Process Recovery**
   - Individual worker failures don't affect other workers
   - Progress is saved continuously during processing
   - Interrupted processes can be recovered

2. **SIGINT Handling**
   - Graceful shutdown on Ctrl+C interruptions
   - Attempts to save progress before exiting
   - Ensures chunks are finalized when possible

3. **Recovery Commands**
   - `complete`: Creates final.json files from progress files
   - `mergeall`: Merges all progress across all chunks
   - `mergeall preserve`: Merges while preserving progress information
   - `cleanup`: Removes temporary files after successful merging

4. **Progress Preservation**
   - All progress is continuously saved during processing
   - Merging preserves progress information
   - Recovery tools ensure no work is lost due to interruptions

## File Structure

The project follows a clean, organized directory structure:

```
.
├── config/             # Configuration files
│   └── prompt_config.json
├── data/               # Input data
│   └── words_list_full.txt
├── logs/               # API response and error logs
├── output/             # All output files
│   ├── chunks/         # Individual chunk processing directories
│   │   └── chunk_N/    # One directory per worker
│   ├── progress/       # Progress tracking files
│   └── merged/         # Final merged results
│       └── result_final.json
├── tests/              # Test-related files
│   └── results/        # Test output results
├── .env                # Environment configuration
├── index.js            # Main application
└── README.md           # Documentation
```

This structure separates:
- Input data (`data/`)
- Configuration files (`config/`)
- Processing outputs (`output/`)
- Logs and debugging information (`logs/`)
- Test results (`tests/results/`)

Each worker processes a portion of the word list in its own chunk directory, with progress tracked in the progress directory. Final results are stored in the merged directory.

## Configuration

### Delay Settings

The application uses configurable delays to handle rate limits and errors:

```javascript
const DELAY_CONFIG = {
    INITIAL_DELAY: 15000,        // 15 seconds between normal requests
    RETRY_DELAY: 45000,         // 45 seconds after an error
    RATE_LIMIT_DELAY: 120000,   // 2 minutes if we hit rate limit
    EMPTY_RESULT_DELAY: 30000,  // 30 seconds if we get empty result
    MAX_RETRIES: 7              // Maximum retry attempts
};
```

### Batch Processing

- Default batch size: 28 words
- Number of workers: Automatically set to CPU core count

## Output Format

The dictionary entries follow this JSON structure:

```javascript
{
    "word": {
        "word": string,
        "meanings": [{
            "speech_part": string,
            "defs": {
                "tran": string,
                "examples": string[],
                "synonyms": string[],
                "antonyms": string[]
            }
        }],
        "phonetics": [{
            "type": string,
            "ipa": string
        }]
    }
}
```

## Error Handling

The application handles several types of errors:
- Rate limiting
- Empty responses
- Invalid JSON
- Missing word data
- API errors

Each error type has specific retry logic and delay times.

## Resuming Progress

If processing is interrupted, you can resume by:

1. Check progress of chunks:
```bash
ls -l ./output/progress/
```

2. View specific chunk progress:
```bash
cat ./output/progress/chunk_0_progress.json
```

3. Resume processing:
```bash
node index.js continue
```

The application will automatically:
- Load progress for each chunk
- Resume from the last processed position
- Preserve completed results

## Monitoring

Progress information includes:
- Words processed/total
- Elapsed time
- Estimated remaining time
- Current processing speed
- Progress percentage

## Limitations

- Free tier API rate limits
- Maximum batch size of 28 words
- Processing time varies based on API response times

## Tips

1. For long runs:
   - Monitor progress files regularly
   - Keep track of log files for debugging
   - Consider using smaller batch sizes if encountering frequent errors
   - Use Ctrl+C to safely stop processing - the script will save progress before exiting
   - Resume anytime with `node index.js continue` - it will pick up from the last saved state

2. For testing:
   - Use test mode with small batches first
   - Check API responses in logs
   - Verify output format in test results

3. For rate limits:
   - Adjust delay settings in `DELAY_CONFIG`
   - Monitor API response errors
   - Consider increasing delays if hitting limits frequently

## Managing Long-Running Processes

### Default Behavior
When running `node index.js continue`:
1. The script reads the total word list from `words_list_full.txt`
2. Scans all progress files to find the latest processed index
3. Starts processing from that index, ensuring no words are skipped
4. Divides work among available CPU cores (one chunk per core)
5. Each worker maintains its own progress and can be resumed independently

### Stopping and Resuming
1. **Safe Stopping**:
   - Use Ctrl+C to stop the process
   - The script saves progress before exiting
   - Each worker saves its state independently
   - Progress files track the exact position of each chunk

2. **Automatic Resumption**:
   - Running `node index.js continue` will:
     - Scan all progress files to find the latest processed index
     - Start from that position to ensure no words are skipped
     - Distribute work among available workers
     - Preserve all previously processed results

3. **Progress Monitoring**:
   - Each worker logs its progress independently
   - Progress files in `./output/progress/` show exact position in each chunk
   - Progress files in `./output/chunks/chunk_N/` contain intermediate results
   - Logs in `./logs/` contain detailed processing information
   - Real-time progress updates in console

### Recovery from Failures
- If a worker fails, it saves partial results in its chunk directory
- Other workers continue processing their chunks independently
- Resume the failed chunk by running with its last saved index
- Merged results combine successful outputs from all chunks 
- Use `node index.js complete` to create final.json files from progress
- Use `node index.js mergeall preserve` to recover and merge while preserving progress
- Final merged dictionary is available at `./output/merged/result_final.json` 

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes, including:
- New features
- Bug fixes
- Improvements
- Breaking changes

## License

MIT 

## Testing

The project includes a comprehensive test suite built with Jest to ensure the reliability and correctness of the core functionality.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

The tests are organized in the following directory structure:

```
tests/
└── unit/
    ├── config/           # Tests for configuration modules
    ├── core/             # Tests for core processing modules
    └── utils/            # Tests for utility functions
```

### What's Being Tested

The test suite covers several key components:

1. **Core Processing**
   - Parallel processing functionality
   - Chunk management
   - Manual merge operations
   - Batch processing

2. **Utilities**
   - File operations
   - Progress tracking
   - Merge operations
   - JSON handling

3. **Configuration**
   - Prompt template loading and validation

### Continuous Integration

The project uses GitHub Actions for continuous integration, with workflows for:

1. **Node.js Tests**: Runs tests on multiple Node.js versions
2. **Code Quality**: Ensures code meets the style guidelines using ESLint
3. **Coverage Badge**: Updates the coverage badge based on test results

To set up your own CI, update the GitHub workflow files in the `.github/workflows/` directory with your repository details. 