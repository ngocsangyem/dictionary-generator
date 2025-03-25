const { defaultPromptConfig, DELAY_CONFIG } = require('../config/constants');
const { logApiResponse } = require('./fileUtils');

/**
 * Delay execution for the specified time
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a prompt from the word list
 */
function getPrompt(texts, config, isRetry = false) {
    // Default to empty array if texts is undefined or not an array
    const inputTexts = Array.isArray(texts) ? texts : [];
    
    // Use default config if config is invalid
    const promptConfig = (config && config.prompt_template && config.retry_prompt_template) 
        ? config 
        : defaultPromptConfig;

    // Filter out any empty or undefined words
    const validTexts = inputTexts.filter(text => text && typeof text === 'string' && text.trim() !== '');
    
    // Log warning if no valid texts found
    if (validTexts.length === 0) {
        console.warn('Warning: No valid words provided for prompt generation');
        return ''; // Return empty string to trigger empty response handling
    }

    const template = isRetry ? promptConfig.retry_prompt_template : promptConfig.prompt_template;
    return template.replace('{words}', validTexts.join(", "));
}

/**
 * Process a batch of words through the API
 */
async function processBatch(model, wordsBatch, config, tracker = null, workerData = null, isMainThread = true, words = []) {
    try {
        // Check if batch is empty
        if (!wordsBatch || wordsBatch.length === 0) {
            console.log('Empty batch received, skipping API call');
            return {};
        }

        console.log(`Processing batch of ${wordsBatch.length} words...`);
        console.log('Words in batch:', wordsBatch);
        
        let resultText;
        let isRetry = false;
        let retryCount = 0;
        const MAX_JSON_RETRIES = 3;

        while (retryCount < MAX_JSON_RETRIES) {
            try {
                // Generate content with error handling
                const response = await model.generateContent(getPrompt(wordsBatch, config, isRetry));
                if (!response || !response.response) {
                    throw new Error('Empty response from API');
                }
                
                resultText = response.response.text();
                if (!resultText) {
                    throw new Error('Empty text in API response');
                }
                
                // Log the raw response for debugging
                console.log('Raw API response:', resultText);
                
                // Log the API response to file
                const workerId = isMainThread ? 'test' : workerData.chunkId;
                const currentIndex = isMainThread ? 
                    (wordsBatch[0] ? words.indexOf(wordsBatch[0]) : 0) : 
                    workerData.startIndex;
                const progress = tracker ? tracker.getProgress() : null;
                logApiResponse(resultText, currentIndex, workerId, progress);
                
                // Extract JSON object from the response using regex
                const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No valid JSON object found in response');
                }
                
                const jsonStr = jsonMatch[0];
                console.log('Extracted JSON:', jsonStr);
                
                const parsedResult = JSON.parse(jsonStr);
                if (Object.keys(parsedResult).length === 0) {
                    throw new Error('Empty result object after parsing');
                }
                
                // Validate the structure of the response
                const invalidWords = [];
                for (const word of wordsBatch) {
                    if (!parsedResult[word] || !parsedResult[word].meanings || !parsedResult[word].phonetics) {
                        invalidWords.push(word);
                    }
                }
                
                if (invalidWords.length > 0) {
                    throw new Error(`Invalid or missing data for words: ${invalidWords.join(', ')}`);
                }
                
                return parsedResult;
            } catch (error) {
                console.error(`Processing error (attempt ${retryCount + 1}/${MAX_JSON_RETRIES}):`, error.message);
                
                // Only log response if it exists
                if (resultText) {
                    console.error('Raw response that failed to process:', resultText);
                }
                
                retryCount++;
                if (retryCount < MAX_JSON_RETRIES) {
                    isRetry = true;
                    console.log(`Retrying with modified prompt after ${DELAY_CONFIG.RETRY_DELAY/1000}s delay...`);
                    await delay(DELAY_CONFIG.RETRY_DELAY);
                    continue;
                }
                
                throw new Error(`Failed to process API response after ${MAX_JSON_RETRIES} attempts: ${error.message}`);
            }
        }
    } catch (error) {
        // Check for rate limit related errors
        if (error.message.toLowerCase().includes('rate') || 
            error.message.toLowerCase().includes('quota') ||
            error.message.toLowerCase().includes('limit')) {
            console.warn('Rate limit detected, will retry after longer delay');
            await delay(DELAY_CONFIG.RATE_LIMIT_DELAY);
            throw new Error('Rate limit reached - retrying after delay');
        }
        
        // Handle empty results
        if (error.message.includes('Empty result') || error.message.includes('Empty response')) {
            console.warn('Empty result received, will retry with delay');
            await delay(DELAY_CONFIG.EMPTY_RESULT_DELAY);
            throw new Error('Empty result - retrying after delay');
        }
        
        console.error(`Error processing batch: ${error.message}`);
        throw error; // Propagate the error for retry logic
    }
}

module.exports = {
    getPrompt,
    processBatch,
    delay
}; 