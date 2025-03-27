# Model Integration Guide

This guide explains how to integrate new AI models into the dictionary generator. The system is designed with a modular architecture that makes it easy to add support for additional AI providers.

## Architecture Overview

The dictionary generator uses a factory-based approach with the following components:

1. **Model Handlers** - Classes that handle specific AI model APIs
2. **Model Configuration** - Settings for each supported model
3. **Factory Function** - Creates appropriate handlers based on configuration

## Adding a New Model

### Step 1: Create a Model Handler Class

Add a new handler class in `src/utils/modelUtils.js` that extends the `BaseModelHandler` class:

```javascript
/**
 * Handler for YourNewModel
 */
class YourNewModelHandler extends BaseModelHandler {
  constructor(config) {
    super(config);
    // Initialize your model's client/API
    this.client = new YourModelClient({
      apiKey: config.apiKey,
      // Other required initialization
    });
    this.modelSettings = config.modelSettings || {};
  }

  async generateContent(prompt) {
    try {
      // Call your model's API
      const result = await this.client.generate({
        prompt: prompt,
        temperature: this.modelSettings.temperature || 0.7,
        maxTokens: this.modelSettings.maxTokens || 2000,
        // Other model-specific parameters
      });

      // Transform the response to match the expected format
      return {
        response: {
          text: () => result.content || result.generated_text || result.output
        }
      };
    } catch (error) {
      console.error('YourNewModel API error:', error.message);
      throw error;
    }
  }
}
```

### Step 2: Update Model Configuration

Add your model's configuration to `MODEL_CONFIG` in `src/config/constants.js`:

```javascript
// Model configuration
const MODEL_CONFIG = {
  DEFAULT_MODEL: 'gemini',
  AVAILABLE_MODELS: ['gemini', 'deepseek', 'your-model-name'],
  MODEL_SETTINGS: {
    // Existing models...
    'your-model-name': {
      model: 'your-model-specific-id',
      maxTokens: 2000,
      temperature: 0.7,
      // Add any other model-specific settings
    }
  }
};
```

### Step 3: Update the Factory Function

Modify the `createModelHandler` function in `src/utils/modelUtils.js` to include your new model:

```javascript
function createModelHandler(modelType, config) {
  switch (modelType.toLowerCase()) {
    case 'gemini':
      return new GeminiHandler(config);
    case 'deepseek':
      return new DeepSeekHandler(config);
    case 'your-model-name':
      return new YourNewModelHandler(config);
    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }
}
```

### Step 4: Export Your Handler

Add your new handler class to the module exports:

```javascript
module.exports = {
  createModelHandler,
  BaseModelHandler,
  GeminiHandler,
  DeepSeekHandler,
  YourNewModelHandler
};
```

## Adding Required Dependencies

Update `package.json` to include any required dependencies for your model:

```json
"dependencies": {
  "@google/generative-ai": "^0.1.3",
  "openai": "^4.20.0",
  "your-model-client": "^1.0.0"
}
```

## Environment Configuration

Update `.env.example` to include your model's API key variable:

```
# Your New Model API Key
# YOUR_MODEL_API_KEY=your_api_key_here
```

## Response Format Requirements

For any new model integration, ensure the `generateContent` method returns an object with this structure:

```javascript
{
  response: {
    text: () => "your model's text response as a string"
  }
}
```

This format ensures compatibility with the existing processing pipeline.

## Creating an Example

Create an example file to demonstrate your model's integration:

```javascript
// examples/your-model-example.js
require('dotenv').config();
const { createModelHandler } = require('../src/utils/modelUtils');
const { MODEL_CONFIG } = require('../src/config/constants');

async function main() {
  if (!process.env.YOUR_MODEL_API_KEY) {
    console.error('Error: YOUR_MODEL_API_KEY environment variable is not set');
    process.exit(1);
  }

  try {
    const modelHandler = createModelHandler('your-model-name', {
      apiKey: process.env.YOUR_MODEL_API_KEY,
      modelSettings: MODEL_CONFIG.MODEL_SETTINGS['your-model-name']
    });

    const prompt = 'Define the following words: hello, world';
    const result = await modelHandler.generateContent(prompt);
    
    console.log('\nResponse from Your Model:');
    console.log(result.response.text());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Testing Your Integration

1. Update your `.env` file with your model's API key
2. Run your example to verify the integration works:
   ```bash
   node examples/your-model-example.js
   ```
3. Test with the model comparison script to compare with other models:
   ```bash
   node examples/model-comparison.js
   ```

## Common Integration Challenges

### Response Format Differences

Different AI models may return results in various formats. Common structures include:

1. **OpenAI-compatible APIs** (like DeepSeek):
   ```javascript
   {
     choices: [{ message: { content: "response text" } }]
   }
   ```

2. **Gemini-style APIs**:
   ```javascript
   {
     response: { text: function() { return "response text"; } }
   }
   ```

3. **Direct string responses**:
   ```javascript
   "response text"
   ```

Always normalize these different formats to match the expected interface.

### Error Handling

Different APIs have different error patterns. Make sure to:

1. Log specific error details for debugging
2. Translate model-specific errors into standard formats
3. Handle rate limiting and token limit errors appropriately

### Authentication Methods

Models may use different authentication methods:

1. API keys in headers
2. Bearer tokens
3. Client/secret combinations

Configure your handler to support the appropriate method for your model.

## Updating Documentation

After adding a new model:

1. Update `README.md` to mention the new model
2. Add any model-specific configuration or usage notes
3. Update `CHANGELOG.md` with your addition
4. Increment the version number in `package.json` and `src/config/constants.js`

## Conclusion

The modular design makes it straightforward to add new models to the dictionary generator. By following this guide, you can integrate virtually any text generation API with minimal code changes to the core system. 