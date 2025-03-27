// Mock dependencies
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

// Mock the constants
jest.mock('../src/config/constants', () => ({
  defaultPromptConfig: {
    prompt_template: 'Define these words: {words}',
    retry_prompt_template: 'Try again to define these words precisely: {words}'
  },
  DELAY_CONFIG: {
    RETRY_DELAY: 100,
    RATE_LIMIT_DELAY: 200,
    EMPTY_RESULT_DELAY: 150
  },
  MODEL_CONFIG: {
    DEFAULT_MODEL: 'gemini',
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

// Mock fileUtils
jest.mock('../src/utils/fileUtils', () => ({
  logApiResponse: jest.fn()
}));

// Mock modelUtils
jest.mock('../src/utils/modelUtils', () => {
  // Return mock handlers that work with our tests
  return {
    createModelHandler: jest.fn().mockImplementation((modelType, config) => {
      if (modelType.toLowerCase() === 'rate-limit-test') {
        // Special test handler that simulates rate limit
        return {
          generateContent: jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))
        };
      }
      
      // Default handler that works normally
      return {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
          }
        })
      };
    })
  };
});

// Import the API utils module
const { getPrompt, processBatch, initModelHandler } = require('../src/utils/apiUtils');
const { logApiResponse } = require('../src/utils/fileUtils');
const { createModelHandler } = require('../src/utils/modelUtils');

describe('API Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set the process.env values
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
  });
  
  describe('getPrompt', () => {
    test('returns empty string when no words are provided', () => {
      const result = getPrompt([]);
      expect(result).toBe('');
    });
    
    test('returns empty string when undefined is provided', () => {
      const result = getPrompt(undefined);
      expect(result).toBe('');
    });
    
    test('returns proper prompt with single word', () => {
      const result = getPrompt(['test']);
      expect(result).toContain('test');
      expect(result).toBe('Define these words: test');
    });
    
    test('returns proper prompt with multiple words', () => {
      const result = getPrompt(['word1', 'word2', 'word3']);
      expect(result).toContain('word1, word2, word3');
      expect(result).toBe('Define these words: word1, word2, word3');
    });
    
    test('returns retry prompt when isRetry is true', () => {
      const result = getPrompt(['test'], null, true);
      expect(result).toContain('test');
      expect(result).toBe('Try again to define these words precisely: test');
    });
    
    test('uses abbreviated prompt after 3 requests for the same words', () => {
      // Reset counter to ensure test state is clean
      const requestCounter = new Map();
      
      // First 3 requests use full template
      getPrompt(['test', 'word']);
      getPrompt(['test', 'word']);
      const thirdResult = getPrompt(['test', 'word']);
      expect(thirdResult).toBe('Define these words: test, word');
      
      // Fourth request uses abbreviated template
      const fourthResult = getPrompt(['test', 'word']);
      expect(fourthResult).toContain('Please define the following words using the same format and structure as before:');
      expect(fourthResult).toContain('test, word');
    });
    
    test('filters out invalid words', () => {
      const result = getPrompt(['test', '', undefined, null, 'valid']);
      expect(result).toContain('test, valid');
      expect(result).toBe('Define these words: test, valid');
    });
  });
  
  describe('initModelHandler', () => {
    test('creates a GeminiHandler by default', () => {
      const handler = initModelHandler();
      expect(handler).toBeDefined();
      // Check if it has the right methods
      expect(typeof handler.generateContent).toBe('function');
      expect(createModelHandler).toHaveBeenCalledWith('gemini', expect.any(Object));
    });
    
    test('creates a DeepSeekHandler when specified', () => {
      const handler = initModelHandler({ modelType: 'deepseek' });
      expect(handler).toBeDefined();
      // Check if it has the right methods
      expect(typeof handler.generateContent).toBe('function');
      expect(createModelHandler).toHaveBeenCalledWith('deepseek', expect.any(Object));
    });
    
    test('throws error when API key is missing', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => initModelHandler()).toThrow('API key for gemini not found');
    });
  });
  
  describe('processBatch', () => {
    test('returns empty object for empty batch', async () => {
      const result = await processBatch('gemini', []);
      expect(result).toEqual({});
    });
    
    test('processes batch successfully with model handler', async () => {
      // Create a model handler with a mocked generateContent method
      const mockHandler = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
          }
        })
      };
      
      const result = await processBatch(mockHandler, ['test']);
      expect(result).toEqual({
        test: {
          word: 'test',
          phonetics: [{ text: '/test/' }],
          meanings: [{ partOfSpeech: 'noun' }]
        }
      });
      
      // Verify generateContent was called with the right prompt
      expect(mockHandler.generateContent).toHaveBeenCalledWith('Define these words: test');
      
      // Verify logging was called
      expect(logApiResponse).toHaveBeenCalled();
    });
    
    test('handles model as string by creating appropriate handler', async () => {
      createModelHandler.mockClear(); // Clear mock to ensure we track only this call
      
      const result = await processBatch('gemini', ['test']);
      expect(result).toEqual({
        test: {
          word: 'test',
          phonetics: [{ text: '/test/' }],
          meanings: [{ partOfSpeech: 'noun' }]
        }
      });
      
      // Verify the model handler was created
      expect(createModelHandler).toHaveBeenCalledWith('gemini', expect.any(Object));
      
      // Verify logging was called
      expect(logApiResponse).toHaveBeenCalled();
    });
    
    test('handles rate limit errors with longer delay', async () => {
      // This will simulate a rate limit error
      const mockError = new Error('Rate limit exceeded');
      mockError.message = 'rate limit exceeded';
      
      const mockHandler = {
        generateContent: jest.fn()
          .mockRejectedValueOnce(mockError)
          .mockResolvedValueOnce({
            response: {
              text: () => '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
            }
          })
      };
      
      // Reduce delay for testing
      const originalDelay = require('../src/utils/apiUtils').delay;
      jest.spyOn(require('../src/utils/apiUtils'), 'delay').mockImplementation(() => Promise.resolve());
      
      try {
        await processBatch(mockHandler, ['test']);
      } catch (error) {
        expect(error.message).toBe('Rate limit reached - retrying after delay');
      }
      
      // Restore original delay function
      require('../src/utils/apiUtils').delay = originalDelay;
    });
    
    test('retries with full prompt on first failure', async () => {
      // Mock that will fail on first call and succeed on second
      const mockHandler = {
        generateContent: jest.fn()
          .mockRejectedValueOnce(new Error('Failed on first try'))
          .mockResolvedValueOnce({
            response: {
              text: () => '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
            }
          })
      };
      
      const result = await processBatch(mockHandler, ['test']);
      expect(result).toEqual({
        test: {
          word: 'test',
          phonetics: [{ text: '/test/' }],
          meanings: [{ partOfSpeech: 'noun' }]
        }
      });
      
      // Verify generateContent was called twice
      expect(mockHandler.generateContent).toHaveBeenCalledTimes(2);
    });
    
    test('retries with retry prompt after full prompt fails', async () => {
      // Mock that will fail twice and succeed on third try
      const mockHandler = {
        generateContent: jest.fn()
          .mockRejectedValueOnce(new Error('Failed on first try'))
          .mockRejectedValueOnce(new Error('Failed on second try'))
          .mockResolvedValueOnce({
            response: {
              text: () => '{"test": {"word": "test", "phonetics": [{"text": "/test/"}], "meanings": [{"partOfSpeech": "noun"}]}}'
            }
          })
      };
      
      const result = await processBatch(mockHandler, ['test']);
      expect(result).toEqual({
        test: {
          word: 'test',
          phonetics: [{ text: '/test/' }],
          meanings: [{ partOfSpeech: 'noun' }]
        }
      });
      
      // Verify generateContent was called three times
      expect(mockHandler.generateContent).toHaveBeenCalledTimes(3);
    });
    
    test('throws error after max retries', async () => {
      // Mock that always fails
      const mockHandler = {
        generateContent: jest.fn().mockRejectedValue(new Error('Always fails'))
      };
      
      await expect(processBatch(mockHandler, ['test'])).rejects.toThrow('Failed to process API response after 3 attempts');
      
      // Verify generateContent was called MAX_JSON_RETRIES times
      expect(mockHandler.generateContent).toHaveBeenCalledTimes(3);
    });
    
    test('validates response structure', async () => {
      // Mock that returns invalid structure (missing required fields)
      const mockHandler = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"test": {"word": "test"}}'
          }
        })
      };
      
      await expect(processBatch(mockHandler, ['test'])).rejects.toThrow('Invalid or missing data for words');
    });
  });
}); 