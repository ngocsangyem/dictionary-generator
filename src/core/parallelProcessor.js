const { Worker } = require('worker_threads');
const path = require('path');
const { NUM_WORKERS } = require('../config/constants');
const { createDirectories, readWordsList } = require('../utils/fileUtils');
const { loadPromptConfig, savePromptConfig } = require('../config/promptConfig');
const { mergeChunkFiles } = require('../utils/mergeUtils');

/**
 * Initialize parallel processing
 * @param {number} startIndex - Starting index in the word list
 * @param {boolean} useExistingConfig - Whether to use existing configuration
 * @param {string} apiKey - The API key for Gemini
 * @returns {Promise<void>}
 */
async function initParallel(startIndex = 0, useExistingConfig = true, apiKey) {
    try {
        createDirectories();

        // Load or create prompt configuration
        const promptConfig = useExistingConfig ?
            loadPromptConfig() :
            require('../config/constants').defaultPromptConfig;

        // Save the configuration for future use
        savePromptConfig(promptConfig);

        // Read and filter words
        const words = readWordsList();

        // Calculate chunk sizes
        const totalWords = words.length - startIndex;
        const wordsPerWorker = Math.ceil((totalWords) / NUM_WORKERS);

        console.log(`Starting parallel processing with ${NUM_WORKERS} workers`);
        console.log(`Total words: ${totalWords}, Words per worker: ${wordsPerWorker}`);

        // Create and track workers
        const workers = [];
        const workerPromises = [];

        // Start workers
        for (let i = 0; i < NUM_WORKERS; i++) {
            const workerStartIndex = startIndex + (i * wordsPerWorker);
            const workerEndIndex = Math.min(workerStartIndex + wordsPerWorker, words.length);

            const worker = new Worker(path.join(__dirname, '../workers/worker.js'), {
                workerData: {
                    startIndex: workerStartIndex,
                    endIndex: workerEndIndex,
                    chunkId: i,
                    words: words.slice(workerStartIndex, workerEndIndex),
                    apiKey: apiKey
                }
            });

            const workerPromise = new Promise((resolve, reject) => {
                worker.on('message', (message) => {
                    if (message.error) {
                        console.error(`Worker ${i} error:`, message.error);
                        reject(message.error);
                    } else {
                        console.log(`Worker ${i} completed chunk ${message.chunkId}`);
                        resolve(message);
                    }
                });

                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker ${i} stopped with exit code ${code}`));
                    }
                });
            });

            workers.push(worker);
            workerPromises.push(workerPromise);
        }

        // Wait for all workers to complete
        await Promise.all(workerPromises);
        console.log('All workers completed successfully');

        // Merge results
        console.log('Merging results...');
        mergeChunkFiles();
        console.log('Results merged successfully');

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

module.exports = initParallel; 