const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parentPort, workerData } = require('worker_threads');
const { DIRECTORIES, DELAY_CONFIG, BATCH_SIZE } = require('../config/constants');
const { loadPromptConfig } = require('../config/promptConfig');
const { saveChunkProgress, loadChunkProgress, cleanupProgressFiles, removeAudioField } = require('../utils/fileUtils');
const { processBatch, delay } = require('../utils/apiUtils');
const { mergeChunkJsonFiles } = require('../utils/mergeUtils');
const ProgressTracker = require('../utils/ProgressTracker');

/**
 * Process a chunk of words in a worker thread
 * @param {Object} workerData - Data for the worker
 */
async function processChunk(workerData) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { startIndex, _endIndex, chunkId, words, apiKey } = workerData;
    let mergedResults = {};
    const chunkDir = path.join(DIRECTORIES.CHUNKS, `chunk_${chunkId}`);

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    // Load existing progress and results
    const progress = loadChunkProgress(chunkId);
    const startingIndex = progress ? progress.lastProcessedIndex : 0;
        
    if (progress) {
      console.log(`Resuming chunk ${chunkId} from index ${startingIndex}`);
      // Load existing results
      const progressFile = path.join(chunkDir, `progress_${startingIndex}.json`);
      if (fs.existsSync(progressFile)) {
        mergedResults = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        console.log(`Loaded ${Object.keys(mergedResults).length} existing results`);
      }
    }

    // Initialize progress tracker
    const tracker = new ProgressTracker(words.length, startIndex + startingIndex, BATCH_SIZE);
    if (progress) {
      tracker.processedWords = progress.totalProcessed;
    }

    // Get API configuration
    const promptConfig = loadPromptConfig();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Process each batch in the chunk
    for (let i = startingIndex; i < words.length; i += BATCH_SIZE) {
      let retryCount = 0;
      let success = false;
      let lastError = null;

      while (!success && retryCount < DELAY_CONFIG.MAX_RETRIES) {
        try {
          const batch = words.slice(i, Math.min(i + BATCH_SIZE, words.length));
                    
          // Skip if batch is empty
          if (!batch || batch.length === 0) {
            console.log(`Worker ${chunkId}: Skipping empty batch at index ${i}`);
            success = true;
            continue;
          }
                    
          console.log(`Worker ${chunkId}: Processing batch ${i} of ${words.length} with ${batch.length} words`);
          console.log('Words in batch:', batch);
                    
          const batchResult = await processBatch(model, batch, promptConfig, tracker, workerData, false);
                    
          // Additional validation of batch result
          const processedBatchResult = removeAudioField(batchResult);
          if (Object.keys(processedBatchResult).length === 0) {
            throw new Error('Processed batch result is empty');
          }
                    
          // Update progress and log
          const progress = tracker.update(batch.length);
          console.log(`\nProgress Report (Worker ${chunkId}):
Processed: ${progress.processedWords}/${progress.totalWords} words (${progress.progressPercent}%)
Elapsed Time: ${progress.elapsedTime}
Estimated Remaining: ${progress.estimatedRemainingTime}
Current Speed: ${progress.currentSpeed} words/sec\n`);
                    
          // Save chunk progress
          saveChunkProgress(chunkId, i + BATCH_SIZE, progress.processedWords, tracker);
                    
          // Verify each word in the batch has a result
          const missingWords = batch.filter(word => !processedBatchResult[word]);
          if (missingWords.length > 0) {
            console.warn(`Missing results for words: ${missingWords.join(', ')}`);
          }

          mergedResults = { ...mergedResults, ...processedBatchResult };

          // Merge and save progress periodically (e.g., every 5 batches)
          if (i % (BATCH_SIZE * 5) === 0) {
            console.log(`Worker ${chunkId}: Merging progress files at batch index ${i}`);
            mergedResults = mergeChunkJsonFiles(chunkDir, chunkId) || mergedResults;
          } else {
            // Save progress file for this batch
            const progressFile = path.join(chunkDir, `progress_${i}.json`);
            fs.writeFileSync(progressFile, JSON.stringify(processedBatchResult, null, 2));
            console.log(`Worker ${chunkId}: Saved progress to ${progressFile}`);
          }

          success = true;
          console.log(`Worker ${chunkId}: Waiting ${DELAY_CONFIG.INITIAL_DELAY/1000}s before next batch...`);
          await delay(DELAY_CONFIG.INITIAL_DELAY);
        } catch (error) {
          lastError = error;
          retryCount++;
          const isRateLimit = error.message.toLowerCase().includes('rate limit');
          const isEmptyResult = error.message.toLowerCase().includes('empty');
                    
          let delayTime = DELAY_CONFIG.RETRY_DELAY;
          if (isRateLimit) delayTime = DELAY_CONFIG.RATE_LIMIT_DELAY;
          else if (isEmptyResult) delayTime = DELAY_CONFIG.EMPTY_RESULT_DELAY;
                    
          console.error(`Worker ${chunkId}: Error (attempt ${retryCount}/${DELAY_CONFIG.MAX_RETRIES}): ${error.message}`);
                    
          if (retryCount === DELAY_CONFIG.MAX_RETRIES) {
            // Save the last successful results before exiting
            if (Object.keys(mergedResults).length > 0) {
              const finalChunkFile = path.join(chunkDir, `final_partial_${i}.json`);
              fs.writeFileSync(finalChunkFile, JSON.stringify(mergedResults, null, 2));
              console.log(`Saved partial results up to index ${i} in ${finalChunkFile}`);
            }
                        
            parentPort.postMessage({ 
              error: `Failed at index ${i} after ${DELAY_CONFIG.MAX_RETRIES} attempts: ${lastError.message}`,
              lastProcessedIndex: i,
              lastError: lastError.message
            });
            return;
          }
                    
          console.log(`Worker ${chunkId}: Waiting ${delayTime/1000}s before retry...`);
          await delay(delayTime);
        }
      }
    }

    // After processing all batches, merge all JSON files before saving final result
    console.log(`Worker ${chunkId}: Merging all JSON files...`);
    const finalMergedResults = mergeChunkJsonFiles(chunkDir, chunkId) || mergedResults;
        
    if (!finalMergedResults || Object.keys(finalMergedResults).length === 0) {
      throw new Error(`Failed to merge results for chunk ${chunkId}`);
    }

    // Save final result
    const finalChunkFile = path.join(chunkDir, 'final.json');
    fs.writeFileSync(finalChunkFile, JSON.stringify(finalMergedResults, null, 2));
    console.log(`Worker ${chunkId}: Saved final result to ${finalChunkFile}`);
        
    // Clean up progress files after successful completion
    cleanupProgressFiles(chunkId);
        
    // Send success message to parent
    parentPort.postMessage({ success: true, chunkId });
    console.log(`Worker ${chunkId}: Processing complete`);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
}

module.exports = processChunk; 

// Execute the processChunk function when loaded as a worker
if (parentPort && workerData) {
  console.log(`Worker started with data for chunk ${workerData.chunkId}, processing ${workerData.words.length} words`);
  processChunk(workerData).catch(error => {
    console.error(`Unhandled error in worker: ${error.message}`);
    parentPort.postMessage({ error: error.message });
  });
} 