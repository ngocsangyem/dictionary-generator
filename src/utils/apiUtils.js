const { defaultPromptConfig, DELAY_CONFIG } = require('../config/constants');
const { logApiResponse } = require('./fileUtils');

// Track request counts per session to optimize prompts
const requestCounter = new Map();

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

  // Get request count for optimization
  const sessionKey = validTexts.join(',').substring(0, 50); // Use portion of words as key
  const requestCount = requestCounter.get(sessionKey) || 0;
  
  // For retry always use retry template
  if (isRetry) {
    return promptConfig.retry_prompt_template.replace('{words}', validTexts.join(', '));
  }
  
  // For first 3 requests use full template, after that use abbreviated version
  if (requestCount < 3) {
    requestCounter.set(sessionKey, requestCount + 1);
    return promptConfig.prompt_template.replace('{words}', validTexts.join(', '));
  } else {
    requestCounter.set(sessionKey, requestCount + 1);
    console.log(`Using abbreviated prompt for request #${requestCount + 1}`);
    return `Please define the following words using the same format and structure as before: ${validTexts.join(', ')}`;
  }
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
    let useFullPrompt = false;
    const MAX_JSON_RETRIES = 3;

    while (retryCount < MAX_JSON_RETRIES) {
      try {
        // Generate content with error handling
        const prompt = getPrompt(wordsBatch, config, isRetry);
        console.log(`Using ${isRetry ? 'retry' : (useFullPrompt ? 'full' : 'standard')} prompt, attempt: ${retryCount + 1}`);
        
        const response = await model.generateContent(prompt);
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
          // Check if the word entry exists with required top-level fields
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
        
        // If we're using an abbreviated prompt and it failed, switch to full prompt
        if (retryCount === 1 && !isRetry && !useFullPrompt) {
          // First try to use full prompt before using retry prompt
          console.log('Abbreviated prompt failed, falling back to full prompt...');
          useFullPrompt = true;
          
          // Force full prompt on next request by temporarily resetting the counter
          const sessionKey = wordsBatch.join(',').substring(0, 50);
          requestCounter.set(sessionKey, 0);
          
          // Add delay before retry
          await delay(DELAY_CONFIG.RETRY_DELAY / 2);
          continue;
        }
        
        if (retryCount < MAX_JSON_RETRIES) {
          isRetry = true;
          console.log(`Retrying with retry prompt after ${DELAY_CONFIG.RETRY_DELAY/1000}s delay...`);
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