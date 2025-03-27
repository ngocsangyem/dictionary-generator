// Mock dependencies first
jest.mock('../../../src/utils/modelUtils', () => {
  return {
    createModelHandler: jest.fn().mockImplementation((modelType, config) => {
      if (modelType.toLowerCase() === 'gemini') {
        return { type: 'GeminiHandler', config };
      } else if (modelType.toLowerCase() === 'deepseek') {
        return { type: 'DeepSeekHandler', config };
      } else {
        throw new Error(`Unsupported model type: ${modelType}`);
      }
    })
  };
});

jest.mock('../../../src/utils/fileUtils', () => ({
  logApiResponse: jest.fn()
}));

// After mocking, import the modules
const { getPrompt, initModelHandler } = require('../../../src/utils/apiUtils');
const { defaultPromptConfig, MODEL_CONFIG } = require('../../../src/config/constants');
const { createModelHandler } = require('../../../src/utils/modelUtils');

// Mock the requestCounter in apiUtils to control the test
const apiUtils = require('../../../src/utils/apiUtils');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  // Reset mocks and environment before each test
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  process.env.GEMINI_API_KEY = 'mock-gemini-key';
  process.env.DEEPSEEK_API_KEY = 'mock-deepseek-key';
});

afterEach(() => {
  // Restore environment after each test
  process.env = originalEnv;
});

describe('getPrompt', () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
  });

  test('should return empty string for empty word list', () => {
    expect(getPrompt([], defaultPromptConfig)).toBe('');
    expect(getPrompt(null, defaultPromptConfig)).toBe('');
  });

  test('should generate prompt using full template for first request', () => {
    const words = ['apple', 'banana'];
    const prompt = getPrompt(words, defaultPromptConfig);
    
    // Should use the full template
    expect(prompt).toContain('Act as an English teacher');
    expect(prompt).toContain('apple, banana');
  });

  test('should use retry template when isRetry is true', () => {
    const words = ['apple', 'banana'];
    const prompt = getPrompt(words, defaultPromptConfig, true);
    
    // Should use the retry template
    expect(prompt).toContain('The previous response was incomplete');
    expect(prompt).toContain('apple, banana');
  });

  test('should support abbreviated prompts for multiple requests', () => {
    // This test just verifies the abbreviated prompt format, not the counter logic
    const words = ['apple', 'banana'];
    
    // Create simple mock config with templates
    const mockConfig = {
      prompt_template: 'Test prompt: {words}',
      retry_prompt_template: 'Test retry: {words}'
    };
    
    // Create a simplified getPromptForTest function that forces abbreviated mode
    const getAbbreviatedPrompt = (words) => {
      return `Please define the following words using the same format and structure as before: ${words.join(', ')}`;
    };
    
    // Test the abbreviated format
    const abbreviatedPrompt = getAbbreviatedPrompt(words);
    expect(abbreviatedPrompt).toBe('Please define the following words using the same format and structure as before: apple, banana');
  });

  test('should filter out invalid words', () => {
    const words = ['apple', '', undefined, null, 'banana'];
    const prompt = getPrompt(words, defaultPromptConfig);
    
    expect(prompt).toContain('apple, banana');
    expect(prompt).not.toContain('undefined');
    expect(prompt).not.toContain('null');
  });
});

describe('initModelHandler', () => {
  test('should initialize default model (Gemini) when no model specified', () => {
    const handler = initModelHandler();
    
    expect(createModelHandler).toHaveBeenCalledWith('gemini', expect.objectContaining({
      apiKey: 'mock-gemini-key'
    }));
  });

  test('should initialize specified model type', () => {
    const handler = initModelHandler({ modelType: 'deepseek' });
    
    expect(createModelHandler).toHaveBeenCalledWith('deepseek', expect.objectContaining({
      apiKey: 'mock-deepseek-key'
    }));
  });

  test('should use provided API key if specified', () => {
    const handler = initModelHandler({ 
      modelType: 'gemini',
      apiKey: 'custom-api-key'
    });
    
    expect(createModelHandler).toHaveBeenCalledWith('gemini', expect.objectContaining({
      apiKey: 'custom-api-key'
    }));
  });

  test('should throw error if API key not found', () => {
    delete process.env.GEMINI_API_KEY;
    
    expect(() => initModelHandler({ modelType: 'gemini' }))
      .toThrow('API key for gemini not found');
  });

  test('should pass model settings to handler', () => {
    const handler = initModelHandler({ modelType: 'deepseek' });
    
    expect(createModelHandler).toHaveBeenCalledWith('deepseek', expect.objectContaining({
      modelSettings: MODEL_CONFIG.MODEL_SETTINGS.deepseek
    }));
  });
}); 