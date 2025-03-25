require('dotenv').config();

const testSingleBatch = require('./src/core/testBatch');
const manualMerge = require('./src/core/manualMerge');
const { findLatestProcessedIndex, getTotalWordCount, cleanupAllProgressFiles, cleanupProgressFiles } = require('./src/utils/fileUtils');
const { mergeChunkFiles } = require('./src/utils/mergeUtils');
const { loadPromptConfig } = require('./src/config/promptConfig');
const { ensureChunkFinalFiles, initParallel } = require('./src/core/parallelProcessor');

// Get API key from environment variable
const API_KEY = process.env.GEMINI_API_KEY;

// Main entry point for command line mode
if (require.main === module) {
    const args = process.argv.slice(2);
    const mode = args[0];
    let startIndex = parseInt(args[1]);

    switch (mode) {
        case 'help':
            // Display help information
            console.log(`
Dictionary Generation Tool - Usage:
----------------------------------
node index.js [command] [options]

Commands:
  continue [startIndex]  Continue processing from the latest index or specified index
  reset [startIndex]     Reset and start processing from beginning or specified index
  merge <chunkId>        Manually merge files for a specific chunk
  mergeall               Manually merge all chunks, useful for recovery
  complete               Ensure all chunks have final.json files using progress files
  cleanup [chunkId]      Clean up progress files (for all chunks or specific chunk)
  count                  Display total processed word count across all chunks
  test <startIndex> [batchSize]  Test processing for a specific batch
  help                   Display this help information

Examples:
  node index.js continue     Continue from the latest processed index
  node index.js reset 100    Start processing from index 100
  node index.js merge 2      Merge all files for chunk 2
  node index.js mergeall     Merge all chunks using progress files
  node index.js complete     Ensure all chunks have final.json files
  node index.js cleanup      Clean up all progress files
  node index.js cleanup 2    Clean up progress files for chunk 2
  node index.js count        Show total processed words
  node index.js test 500 20  Test processing 20 words starting from index 500`);
            break;
        case 'continue':
            // If no startIndex provided, find the latest processed index
            if (isNaN(startIndex)) {
                startIndex = findLatestProcessedIndex();
            }
            initParallel(startIndex, true, API_KEY);
            break;
        case 'reset':
            // For reset, use provided index or start from beginning
            startIndex = isNaN(startIndex) ? 0 : startIndex;
            initParallel(startIndex, false, API_KEY);
            break;
        case 'merge':
            // Merge mode for manually merging chunk files
            const chunkId = parseInt(args[1]);
            if (isNaN(chunkId)) {
                console.log('Please provide a valid chunk ID for merge mode');
                console.log('Usage: node index.js merge <chunkId>');
                process.exit(1);
            }
            const success = manualMerge(chunkId);
            if (!success) {
                process.exit(1);
            }
            break;
        case 'mergeall':
            // Merge all chunks
            const mergeAllSuccess = manualMerge(-1);
            if (!mergeAllSuccess) {
                process.exit(1);
            }
            break;
        case 'complete':
            // Ensure all chunks have final.json files
            console.log('Ensuring all chunks have final.json files...');
            const completeSuccess = ensureChunkFinalFiles();
            if (!completeSuccess) {
                console.log('Failed to complete all chunks');
                process.exit(1);
            }
            console.log('All chunks completed successfully');
            break;
        case 'cleanup':
            // Clean up progress files
            if (isNaN(startIndex)) {
                console.log('Cleaning up progress files for all chunks...');
                const cleanupSuccess = cleanupAllProgressFiles();
                if (!cleanupSuccess) {
                    console.log('Failed to clean up all progress files');
                    process.exit(1);
                }
                console.log('All progress files cleaned up successfully');
            } else {
                console.log(`Cleaning up progress files for chunk ${startIndex}...`);
                const cleanupSuccess = cleanupProgressFiles(startIndex);
                if (!cleanupSuccess) {
                    console.log(`Failed to clean up progress files for chunk ${startIndex}`);
                    process.exit(1);
                }
                console.log(`Progress files for chunk ${startIndex} cleaned up successfully`);
            }
            break;
        case 'count':
            // Count total words across all chunks
            const totalWords = getTotalWordCount();
            console.log(`Total words processed across all chunks: ${totalWords}`);
            break;
        case 'test':
            // Test mode for specific index
            if (isNaN(startIndex)) {
                console.log('Please provide a valid index for test mode');
                process.exit(1);
            }
            const batchSize = parseInt(args[2]) || null;
            testSingleBatch(startIndex, batchSize, API_KEY)
                .then(result => {
                    console.log('Test result preview:');
                    console.log(JSON.stringify(result, null, 2));
                })
                .catch(error => {
                    console.error('Test failed:', error);
                    process.exit(1);
                });
            break;
        default:
            // Default behavior: start from beginning
            console.log('No command specified, starting from the beginning...');
            initParallel(0, true, API_KEY);
            break;
    }
}

// Export the public API
module.exports = {
    initParallel,
    mergeChunkFiles,
    getPromptConfig: loadPromptConfig,
    testSingleBatch,
    mergeChunkJsonFiles: require('./src/utils/mergeUtils').mergeChunkJsonFiles,
    ensureChunkFinalFiles,
    cleanupProgressFiles,
    cleanupAllProgressFiles
};