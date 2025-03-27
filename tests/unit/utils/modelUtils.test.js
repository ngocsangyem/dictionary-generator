// Mock external dependencies before imports
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      text: () => '{"test": {"word": "test", "meanings": [{"speech_part": "noun"}], "phonetics": [{"type": "US"}]}}'
    }
  });
  
  const mockGenerateContentRateLimited = jest.fn().mockRejectedValue(new Error('API rate limit exceeded'));
  
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        // Return a function that can be override in specific tests
        generateContent: mockGenerateContent
      })
    })),
    mockGenerateContent,
    mockGenerateContentRateLimited
  };
}), { virtual: true };

jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: '{"test": {"word": "test", "meanings": [{"speech_part": "noun"}], "phonetics": [{"type": "US"}]}}'
        }
      }
    ]
  });
  
  const mockCreateQuotaExceeded = jest.fn().mockRejectedValue(new Error('Quota exceeded'));
  
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    })),
    mockCreate,
    mockCreateQuotaExceeded
  };
}), { virtual: true };

// Now require the modules after mocking
const { 
  createModelHandler, 
  BaseModelHandler,
  GeminiHandler, 
  DeepSeekHandler 
} = require('../../../src/utils/modelUtils');

const { MODEL_CONFIG } = require('../../../src/config/constants');

// Import the mocked functions for testing
const { mockGenerateContent, mockGenerateContentRateLimited } = require('@google/generative-ai');
const { mockCreate, mockCreateQuotaExceeded } = require('openai');

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('BaseModelHandler', () => {
  test('should be instantiable with config', () => {
    const config = { apiKey: 'test-key' };
    const handler = new BaseModelHandler(config);
    expect(handler).toBeInstanceOf(BaseModelHandler);
    expect(handler.config).toBe(config);
  });

  test('should throw error when generateContent is called directly', async () => {
    const handler = new BaseModelHandler({});
    await expect(handler.generateContent('test')).rejects.toThrow('generateContent must be implemented by subclasses');
  });
});

describe('GeminiHandler', () => {
  const config = { 
    apiKey: 'test-gemini-key',
    modelSettings: MODEL_CONFIG.MODEL_SETTINGS.gemini
  };

  test('should be instantiable with config', () => {
    const handler = new GeminiHandler(config);
    expect(handler).toBeInstanceOf(GeminiHandler);
    expect(handler).toBeInstanceOf(BaseModelHandler);
  });

  test('should call Gemini API and return response', async () => {
    const handler = new GeminiHandler(config);
    const response = await handler.generateContent('Define the word: test');
    
    expect(response).toHaveProperty('response');
    expect(response.response).toHaveProperty('text');
    expect(typeof response.response.text).toBe('function');
    
    const text = response.response.text();
    expect(text).toContain('test');
    expect(text).toContain('word');
    expect(text).toContain('meanings');
    
    // Verify the mock was called with the correct prompt
    expect(mockGenerateContent).toHaveBeenCalledWith('Define the word: test');
  });

  test('should handle errors from Gemini API', async () => {
    // Override the mock for this test to throw an error
    mockGenerateContent.mockImplementationOnce(() => {
      throw new Error('API rate limit exceeded');
    });

    const handler = new GeminiHandler(config);
    await expect(handler.generateContent('test')).rejects.toThrow('API rate limit exceeded');
  });
});

describe('DeepSeekHandler', () => {
  const config = { 
    apiKey: 'test-deepseek-key',
    modelSettings: MODEL_CONFIG.MODEL_SETTINGS.deepseek
  };

  test('should be instantiable with config', () => {
    const handler = new DeepSeekHandler(config);
    expect(handler).toBeInstanceOf(DeepSeekHandler);
    expect(handler).toBeInstanceOf(BaseModelHandler);
  });

  test('should call DeepSeek API and return response', async () => {
    const handler = new DeepSeekHandler(config);
    const response = await handler.generateContent('Define the word: test');
    
    expect(response).toHaveProperty('response');
    expect(response.response).toHaveProperty('text');
    expect(typeof response.response.text).toBe('function');
    
    const text = response.response.text();
    expect(text).toContain('test');
    expect(text).toContain('word');
    expect(text).toContain('meanings');
    
    // Verify the mock was called with the right model and messages
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: config.modelSettings.model,
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'Define the word: test'
          })
        ])
      })
    );
  });

  test('should handle errors from DeepSeek API', async () => {
    // Override the mock for this test to throw an error
    mockCreate.mockImplementationOnce(() => {
      throw new Error('Quota exceeded');
    });

    const handler = new DeepSeekHandler(config);
    await expect(handler.generateContent('test')).rejects.toThrow('Quota exceeded');
  });
});

describe('createModelHandler', () => {
  test('should create a GeminiHandler for "gemini" model type', () => {
    const handler = createModelHandler('gemini', { apiKey: 'test-key' });
    expect(handler).toBeInstanceOf(GeminiHandler);
  });

  test('should create a DeepSeekHandler for "deepseek" model type', () => {
    const handler = createModelHandler('deepseek', { apiKey: 'test-key' });
    expect(handler).toBeInstanceOf(DeepSeekHandler);
  });

  test('should handle case-insensitive model type', () => {
    const handler1 = createModelHandler('GEMINI', { apiKey: 'test-key' });
    expect(handler1).toBeInstanceOf(GeminiHandler);
    
    const handler2 = createModelHandler('DeepSeek', { apiKey: 'test-key' });
    expect(handler2).toBeInstanceOf(DeepSeekHandler);
  });

  test('should throw error for unsupported model type', () => {
    expect(() => createModelHandler('unsupported-model', { apiKey: 'test-key' }))
      .toThrow('Unsupported model type: unsupported-model');
  });
}); 