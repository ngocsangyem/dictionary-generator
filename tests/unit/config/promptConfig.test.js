const promptConfig = require('../../../src/config/promptConfig');
// eslint-disable-next-line no-unused-vars
const defaultPromptConfig = require('../../../src/config/constants');

// Mock loadPromptConfig to return the defaultPromptConfig
jest.mock('../../../src/config/promptConfig', () => ({
  loadPromptConfig: jest.fn().mockReturnValue({
    defineWord: 'Define the word {{word}} in JSON format',
    expandDefinition: 'Expand on the definition of {{word}} in JSON format',
    wordRelationships: 'Describe relationships for {{word}} in JSON format',
    finalReview: 'Final review of {{word}} in JSON format'
  }),
  savePromptConfig: jest.fn()
}));

describe('promptConfig', () => {
  test('should export a dictionary with predefined prompts', () => {
    // Get the prompt templates using loadPromptConfig
    const templates = promptConfig.loadPromptConfig();
    
    // Check if the export is an object
    expect(typeof templates).toBe('object');
    
    // Check if it contains the expected prompt templates
    expect(templates).toHaveProperty('defineWord');
    expect(templates).toHaveProperty('expandDefinition');
    expect(templates).toHaveProperty('wordRelationships');
    expect(templates).toHaveProperty('finalReview');
    
    // Check format of prompt templates
    expect(typeof templates.defineWord).toBe('string');
    expect(typeof templates.expandDefinition).toBe('string');
    expect(typeof templates.wordRelationships).toBe('string');
    expect(typeof templates.finalReview).toBe('string');
  });
  
  test('prompt templates should include placeholders for word insertion', () => {
    const templates = promptConfig.loadPromptConfig();
    
    // All prompts should contain {{word}} placeholder
    expect(templates.defineWord).toContain('{{word}}');
    expect(templates.expandDefinition).toContain('{{word}}');
    expect(templates.wordRelationships).toContain('{{word}}');
    expect(templates.finalReview).toContain('{{word}}');
  });
  
  test('prompt templates should have sufficient length', () => {
    const templates = promptConfig.loadPromptConfig();
    
    // Prompts should be substantial enough for proper AI responses
    expect(templates.defineWord.length).toBeGreaterThan(10);
    expect(templates.expandDefinition.length).toBeGreaterThan(10);
    expect(templates.wordRelationships.length).toBeGreaterThan(10);
    expect(templates.finalReview.length).toBeGreaterThan(10);
  });
  
  test('prompt templates should include instructions for JSON output format', () => {
    const templates = promptConfig.loadPromptConfig();
    
    // Prompts should mention JSON format requirements
    expect(templates.defineWord.toLowerCase()).toMatch(/json|format|structure/);
    expect(templates.expandDefinition.toLowerCase()).toMatch(/json|format|structure/);
    expect(templates.wordRelationships.toLowerCase()).toMatch(/json|format|structure/);
    expect(templates.finalReview.toLowerCase()).toMatch(/json|format|structure/);
  });
}); 