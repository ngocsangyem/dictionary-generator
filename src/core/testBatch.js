const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { DIRECTORIES, BATCH_SIZE } = require('../config/constants');
const { loadPromptConfig } = require('../config/promptConfig');
const { createDirectories, readWordsList } = require('../utils/fileUtils');
const { processBatch } = require('../utils/apiUtils');
const ProgressTracker = require('../utils/ProgressTracker');

/**
 * Test processing a single batch of words
 * @param {number} startIndex - Starting index in the word list
 * @param {number} batchSize - Size of the batch to test
 * @returns {Promise<Object>} - Processed results
 */
async function testSingleBatch(startIndex, batchSize = BATCH_SIZE, apiKey) {
  try {
    createDirectories();
        
    // Load configuration
    const promptConfig = loadPromptConfig();
        
    // Read words
    const words = readWordsList();
        
    console.log(`Testing batch at index ${startIndex} with ${batchSize} words`);
    console.log('Words to process:', words.slice(startIndex, startIndex + batchSize));
        
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
    // Initialize tracker for test mode
    const tracker = new ProgressTracker(batchSize, startIndex, batchSize);
        
    // Process single batch
    const batch = words.slice(startIndex, startIndex + batchSize);
    const result = await processBatch(model, batch, promptConfig, tracker, null, true, words);
        
    // Save test result
    const testFile = path.join(DIRECTORIES.TEST, `test_${startIndex}.json`);
    fs.writeFileSync(testFile, JSON.stringify(result, null, 2));
        
    console.log(`Test completed. Results saved to ${testFile}`);
    return result;
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
}

module.exports = testSingleBatch; 