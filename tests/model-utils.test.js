// This is a simplified test for modelUtils
// We'll mock dependencies first
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}')
        }
      })
    })
  }))
}), { virtual: true });

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
              }
            }
          ]
        })
      }
    }
  }))
}), { virtual: true });

// Mock the constants first to avoid dependency issues
jest.mock('../src/config/constants', () => ({
  MODEL_CONFIG: {
    MODEL_SETTINGS: {
      gemini: {
        model: 'gemini-pro',
        maxTokens: 2048,
        temperature: 0.7
      },
      deepseek: {
        model: 'deepseek-chat',
        maxTokens: 2000,
        temperature: 0.7
      }
    }
  }
}));

// Simple test of a mocked BaseModelHandler class
describe('BaseModelHandler Test', () => {
  test('should be instantiable', () => {
    // Create a mock class
    class MockBaseModelHandler {
      constructor(config) {
        this.config = config;
      }
    }
    
    const handler = new MockBaseModelHandler({ apiKey: 'test' });
    expect(handler.config.apiKey).toBe('test');
  });
});

// Now test the real ModelUtils
describe('Real ModelUtils Test', () => {
  // Import the actual module after mocks are set up
  const { 
    BaseModelHandler,
    GeminiHandler,
    DeepSeekHandler,
    createModelHandler
  } = require('../src/utils/modelUtils');
  
  // Get references to the mocked modules
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const { OpenAI } = require('openai');
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('BaseModelHandler', () => {
    test('should be defined', () => {
      expect(BaseModelHandler).toBeDefined();
    });
    
    test('should be instantiable', () => {
      const handler = new BaseModelHandler({ apiKey: 'test-key' });
      expect(handler).toBeInstanceOf(BaseModelHandler);
      expect(handler.config).toEqual({ apiKey: 'test-key' });
    });
    
    test('generateContent should throw error', async () => {
      const handler = new BaseModelHandler({});
      await expect(handler.generateContent('test')).rejects.toThrow();
    });
  });
  
  describe('GeminiHandler', () => {
    test('should be instantiable', () => {
      const handler = new GeminiHandler({ apiKey: 'test-key' });
      expect(handler).toBeInstanceOf(GeminiHandler);
      expect(handler).toBeInstanceOf(BaseModelHandler);
    });
    
    test('should call Gemini API', async () => {
      const handler = new GeminiHandler({ apiKey: 'test-key' });
      
      // Setup the mock implementation
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => '{"test": "response"}'
        }
      });
      
      // Replace the mocked implementation for this test
      handler.model.generateContent = mockGenerateContent;
      
      const result = await handler.generateContent('test prompt');
      
      // Check the result structure
      expect(result).toHaveProperty('response');
      expect(result.response).toHaveProperty('text');
      expect(typeof result.response.text).toBe('function');
      
      // Verify the mock was called with the right arguments
      expect(mockGenerateContent).toHaveBeenCalledWith('test prompt');
    });
    
    test('should handle API errors gracefully', async () => {
      const handler = new GeminiHandler({ apiKey: 'test-key' });
      
      // Setup error mock
      const mockError = new Error('API rate limit exceeded');
      const mockGenerateContent = jest.fn().mockRejectedValue(mockError);
      
      // Replace the mock implementation for this test
      handler.model.generateContent = mockGenerateContent;
      
      await expect(handler.generateContent('test')).rejects.toThrow('API rate limit exceeded');
    });
  });
  
  describe('DeepSeekHandler', () => {
    test('should be instantiable', () => {
      const handler = new DeepSeekHandler({ apiKey: 'test-key' });
      expect(handler).toBeInstanceOf(DeepSeekHandler);
      expect(handler).toBeInstanceOf(BaseModelHandler);
    });
    
    test('should call DeepSeek API', async () => {
      const handler = new DeepSeekHandler({ apiKey: 'test-key' });
      
      // Setup mocks
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"test": "response"}'
            }
          }
        ]
      });
      
      // Replace the mocked implementation
      handler.client.chat.completions.create = mockCreate;
      
      const result = await handler.generateContent('test prompt');
      
      // Check the result structure
      expect(result).toHaveProperty('response');
      expect(result.response).toHaveProperty('text');
      expect(typeof result.response.text).toBe('function');
      
      // Verify create was called with correct model and prompt
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'deepseek-chat',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'test prompt'
          })
        ])
      }));
    });
    
    test('should handle API errors gracefully', async () => {
      const handler = new DeepSeekHandler({ apiKey: 'test-key' });
      
      // Setup error mock
      const mockError = new Error('Quota exceeded');
      const mockCreate = jest.fn().mockRejectedValue(mockError);
      
      // Replace the mock implementation
      handler.client.chat.completions.create = mockCreate;
      
      await expect(handler.generateContent('test')).rejects.toThrow('Quota exceeded');
    });
  });
  
  describe('createModelHandler', () => {
    test('should create GeminiHandler for "gemini" type', () => {
      const handler = createModelHandler('gemini', { apiKey: 'test-key' });
      expect(handler).toBeInstanceOf(GeminiHandler);
    });
    
    test('should create DeepSeekHandler for "deepseek" type', () => {
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
      expect(() => createModelHandler('unknown', { apiKey: 'test-key' }))
        .toThrow('Unsupported model type: unknown');
    });
  });
}); 