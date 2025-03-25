const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { NUM_WORKERS, DIRECTORIES } = require('../config/constants');
const { createDirectories, readWordsList } = require('../utils/fileUtils');
const { loadPromptConfig, savePromptConfig } = require('../config/promptConfig');
const { mergeChunkFiles, mergeChunkJsonFiles } = require('../utils/mergeUtils');

/**
 * Ensure all chunks have a final.json file by merging their progress files
 * @returns {boolean} - Success status
 */
function ensureChunkFinalFiles() {
  try {
    const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
      .filter(dir => dir.startsWith('chunk_'));
        
    if (chunkDirs.length === 0) {
      console.log('No chunk directories found');
      return false;
    }
        
    let allSuccess = true;
        
    for (const chunkDirName of chunkDirs) {
      const chunkId = parseInt(chunkDirName.replace('chunk_', ''));
      const chunkDir = path.join(DIRECTORIES.CHUNKS, chunkDirName);
      const finalFile = path.join(chunkDir, 'final.json');
            
      // Skip if final.json already exists
      if (fs.existsSync(finalFile)) {
        console.log(`Final file already exists for chunk ${chunkId}, skipping`);
        continue;
      }
            
      console.log(`Processing chunk ${chunkId} in directory ${chunkDir}`);
            
      // Check if there are any progress files
      const progressFiles = fs.readdirSync(chunkDir)
        .filter(file => file.endsWith('.json') && file.startsWith('progress_'));
            
      if (progressFiles.length === 0) {
        console.log(`No progress files found for chunk ${chunkId}, skipping`);
        continue;
      }
            
      // Merge progress files
      const mergedData = mergeChunkJsonFiles(chunkDir, chunkId);
      if (mergedData) {
        // Save the merged data to final.json
        fs.writeFileSync(finalFile, JSON.stringify(mergedData, null, 2));
        console.log(`Created final.json for chunk ${chunkId}`);
      } else {
        console.log(`Failed to merge progress files for chunk ${chunkId}`);
        allSuccess = false;
      }
    }
        
    return allSuccess;
  } catch (error) {
    console.error('Error ensuring chunk final files:', error);
    return false;
  }
}

/**
 * Initialize parallel processing
 * @param {number} startIndex - Starting index in the word list
 * @param {boolean} useExistingConfig - Whether to use existing configuration
 * @param {string} apiKey - The API key for Gemini
 * @returns {Promise<void>}
 */
async function initParallel(startIndex = 0, useExistingConfig = true, apiKey) {
  try {
    console.log(`Initializing parallel processing from index ${startIndex}...`);
    createDirectories();

    // Load or create prompt configuration
    const promptConfig = useExistingConfig ?
      loadPromptConfig() :
      require('../config/constants').defaultPromptConfig;

    // Save the configuration for future use
    savePromptConfig(promptConfig);

    // Read and filter words
    const words = readWordsList();
    if (!words || words.length === 0) {
      console.error('No words to process');
      return;
    }

    // Calculate chunk sizes
    const totalWords = words.length - startIndex;
    const wordsPerWorker = Math.ceil((totalWords) / NUM_WORKERS);

    console.log(`Starting parallel processing with ${NUM_WORKERS} workers`);
    console.log(`Total words: ${totalWords}, Words per worker: ${wordsPerWorker}`);
    console.log(`API Key: ${apiKey ? 'Provided' : 'Missing'}`);

    // Create and track workers
    const workers = [];
    const chunkIds = [];
        
    // Set up signal handler for graceful shutdown
    let isShuttingDown = false;
    const originalHandler = process.listeners('SIGINT')[0];
        
    // Remove any existing handlers
    process.removeAllListeners('SIGINT');
        
    // Add our custom handler
    process.on('SIGINT', () => {
      if (isShuttingDown) {
        console.log('\nForcing exit...');
        process.exit(1);
      }
            
      console.log('\nReceived SIGINT, gracefully shutting down...');
      isShuttingDown = true;
            
      // Terminate workers
      for (const worker of workers) {
        try {
          worker.terminate();
        } catch (err) {
          console.log(`Error terminating worker: ${err.message}`);
        }
      }
            
      // Try to finalize any ongoing processes
      console.log('Attempting to save any progress made...');
      ensureChunkFinalFiles();
            
      // Exit gracefully
      console.log('Shutdown complete.');
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.on('SIGINT', originalHandler);
      }
            
      process.exit(0);
    });

    // Start workers
    for (let i = 0; i < NUM_WORKERS; i++) {
      const workerStartIndex = startIndex + (i * wordsPerWorker);
      const workerEndIndex = Math.min(workerStartIndex + wordsPerWorker, words.length);
            
      // Skip if no words to process
      if (workerStartIndex >= words.length) {
        console.log(`Worker ${i}: No words to process`);
        continue;
      }
            
      chunkIds.push(i);
      console.log(`Starting worker ${i} for chunk ${i} (${workerStartIndex} to ${workerEndIndex - 1})`);

      const worker = new Worker(path.join(__dirname, '../workers/processWorker.js'), {
        workerData: {
          startIndex: workerStartIndex,
          endIndex: workerEndIndex,
          chunkId: i,
          words: words.slice(workerStartIndex, workerEndIndex),
          apiKey: apiKey
        }
      });

      // Set up message handling
      worker.on('message', (message) => {
        if (message.error) {
          console.error(`Worker ${i} error:`, message.error);
        } else if (message.success) {
          console.log(`Worker ${i} completed chunk ${message.chunkId}`);
        } else {
          console.log(`Worker ${i} message:`, message);
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });

      worker.on('exit', (code) => {
        console.log(`Worker ${i} exited with code ${code}`);
                
        // Remove from workers array
        const index = workers.indexOf(worker);
        if (index !== -1) {
          workers.splice(index, 1);
        }
                
        // If all workers are done, finalize
        if (workers.length === 0) {
          finalize(chunkIds);
        }
      });

      workers.push(worker);
    }
        
    if (workers.length === 0) {
      console.log('No workers started, nothing to process');
      return;
    }
        
    console.log(`Started ${workers.length} workers`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Finalize processing after all workers complete
 * @param {number[]} chunkIds - Array of chunk IDs
 */
// eslint-disable-next-line no-unused-vars
function finalize(chunkIds) {
  console.log('All workers finished, finalizing...');
    
  // Ensure each chunk has a final.json file before merging
  ensureChunkFinalFiles();
    
  // Merge results
  console.log('Merging results...');
  mergeChunkFiles();
  console.log('Results merged successfully');
}

function getChunkConfig(_startIndex, _chunkIds, config = {}) {
  // Default configuration
  const defaultConfig = {
    chunkSize: 200,
    maxBatchSize: 20,
    maxRetries: 3,
    maxWorkers: 3
  };

  return { ...defaultConfig, ...config };
}

module.exports = {
  initParallel,
  ensureChunkFinalFiles,
  getChunkConfig
}; 