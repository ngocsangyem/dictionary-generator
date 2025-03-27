require('dotenv').config();
const { processBatch, initModelHandler } = require('../src/utils/apiUtils');
const { defaultPromptConfig } = require('../src/config/constants');

/**
 * Example demonstrating comparison between Gemini and DeepSeek models
 */
async function runModelComparison() {
  try {
    console.log('Model Comparison Example');
    console.log('------------------------');
    
    // Check for required API keys
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY not set in .env file');
    }
    
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn('Warning: DEEPSEEK_API_KEY not set in .env file');
    }
    
    // Words to define
    const testWords = ['explore', 'adventure'];
    
    // Test with Gemini
    console.log('\n1. Testing with Gemini model:');
    console.log('----------------------------');
    try {
      if (process.env.GEMINI_API_KEY) {
        const geminiHandler = initModelHandler({ modelType: 'gemini' });
        const geminiStart = Date.now();
        const geminiResult = await processBatch(geminiHandler, testWords, defaultPromptConfig);
        const geminiTime = Date.now() - geminiStart;
        
        console.log(`\nGemini response time: ${geminiTime}ms`);
        console.log('Gemini result sample:');
        console.log(JSON.stringify(geminiResult, null, 2).substring(0, 500) + '...');
      } else {
        console.log('Skipped Gemini test due to missing API key');
      }
    } catch (error) {
      console.error('Error with Gemini:', error.message);
    }
    
    // Test with DeepSeek
    console.log('\n2. Testing with DeepSeek model:');
    console.log('------------------------------');
    try {
      if (process.env.DEEPSEEK_API_KEY) {
        const deepseekHandler = initModelHandler({ modelType: 'deepseek' });
        const deepseekStart = Date.now();
        const deepseekResult = await processBatch(deepseekHandler, testWords, defaultPromptConfig);
        const deepseekTime = Date.now() - deepseekStart;
        
        console.log(`\nDeepSeek response time: ${deepseekTime}ms`);
        console.log('DeepSeek result sample:');
        console.log(JSON.stringify(deepseekResult, null, 2).substring(0, 500) + '...');
      } else {
        console.log('Skipped DeepSeek test due to missing API key');
      }
    } catch (error) {
      console.error('Error with DeepSeek:', error.message);
    }
    
    // Alternative method using processBatch with string model type
    console.log('\n3. Using processBatch with model type string:');
    console.log('------------------------------------------');
    try {
      if (process.env.DEEPSEEK_API_KEY) {
        const result = await processBatch('deepseek', testWords, defaultPromptConfig);
        console.log('Successfully processed batch using model type string');
      } else {
        console.log('Skipped this test due to missing API key');
      }
    } catch (error) {
      console.error('Error with string model type:', error.message);
    }
    
  } catch (error) {
    console.error('General error:', error.message);
  }
}

// Run example
runModelComparison(); 