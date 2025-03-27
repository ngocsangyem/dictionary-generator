require('dotenv').config();
const { createModelHandler } = require('../src/utils/modelUtils');
const { MODEL_CONFIG } = require('../src/config/constants');

/**
 * Example demonstrating the use of DeepSeek model
 */
async function main() {
  // Check if DeepSeek API key is available
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('Error: DEEPSEEK_API_KEY environment variable is not set');
    console.log('Please add it to your .env file: DEEPSEEK_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // Create a model handler for DeepSeek
    const modelHandler = createModelHandler('deepseek', {
      apiKey: process.env.DEEPSEEK_API_KEY,
      modelSettings: MODEL_CONFIG.MODEL_SETTINGS.deepseek
    });

    // Simple prompt for testing
    const prompt = 'Define the following words: hello, world';
    
    console.log('Sending request to DeepSeek API...');
    const result = await modelHandler.generateContent(prompt);
    
    // Extract and display the result
    const responseText = result.response.text();
    console.log('\nResponse from DeepSeek:');
    console.log('------------------------');
    console.log(responseText);
    
  } catch (error) {
    console.error('Error using DeepSeek API:', error.message);
  }
}

// Run the example
main(); 