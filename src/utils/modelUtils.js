const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

/**
 * Base class for AI model handlers
 */
class BaseModelHandler {
  constructor(config) {
    this.config = config;
  }

  async generateContent(prompt) {
    throw new Error('generateContent must be implemented by subclasses');
  }
}

/**
 * Handler for Google's Gemini model
 */
class GeminiHandler extends BaseModelHandler {
  constructor(config) {
    super(config);
    this.model = new GoogleGenerativeAI(config.apiKey).getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateContent(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      return result;
    } catch (error) {
      console.error('Gemini API error:', error.message);
      throw error;
    }
  }
}

/**
 * Handler for DeepSeek model using OpenAI-compatible API
 */
class DeepSeekHandler extends BaseModelHandler {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: config.apiKey
    });
    this.modelSettings = config.modelSettings || {};
  }

  async generateContent(prompt) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.modelSettings.model || 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'You are an English teacher preparing materials for IELTS students. Create comprehensive dictionary entries in JSON format.'
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: this.modelSettings.temperature || 0.7,
        max_tokens: this.modelSettings.maxTokens || 2000
      });

      // Transform DeepSeek OpenAI-compatible response to match Gemini format
      return {
        response: {
          text: () => completion.choices[0].message.content
        }
      };
    } catch (error) {
      console.error('DeepSeek API error:', error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create appropriate model handler
 */
function createModelHandler(modelType, config) {
  switch (modelType.toLowerCase()) {
    case 'gemini':
      return new GeminiHandler(config);
    case 'deepseek':
      return new DeepSeekHandler(config);
    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }
}

module.exports = {
  createModelHandler,
  BaseModelHandler,
  GeminiHandler,
  DeepSeekHandler
}; 