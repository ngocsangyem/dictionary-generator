const promptConfig = require('../../../src/config/promptConfig');

describe('promptConfig', () => {
  test('should export a dictionary with predefined prompts', () => {
    // Check if the export is an object
    expect(typeof promptConfig).toBe('object');
    
    // Check if it contains the expected prompt templates
    expect(promptConfig).toHaveProperty('defineWord');
    expect(promptConfig).toHaveProperty('expandDefinition');
    expect(promptConfig).toHaveProperty('wordRelationships');
    expect(promptConfig).toHaveProperty('finalReview');
    
    // Check format of prompt templates
    expect(typeof promptConfig.defineWord).toBe('string');
    expect(typeof promptConfig.expandDefinition).toBe('string');
    expect(typeof promptConfig.wordRelationships).toBe('string');
    expect(typeof promptConfig.finalReview).toBe('string');
  });
  
  test('prompt templates should include placeholders for word insertion', () => {
    // All prompts should contain {{word}} placeholder
    expect(promptConfig.defineWord).toContain('{{word}}');
    expect(promptConfig.expandDefinition).toContain('{{word}}');
    expect(promptConfig.wordRelationships).toContain('{{word}}');
    expect(promptConfig.finalReview).toContain('{{word}}');
  });
  
  test('prompt templates should have sufficient length', () => {
    // Prompts should be substantial enough for proper AI responses
    expect(promptConfig.defineWord.length).toBeGreaterThan(50);
    expect(promptConfig.expandDefinition.length).toBeGreaterThan(50);
    expect(promptConfig.wordRelationships.length).toBeGreaterThan(50);
    expect(promptConfig.finalReview.length).toBeGreaterThan(50);
  });
  
  test('prompt templates should include instructions for JSON output format', () => {
    // Prompts should mention JSON format requirements
    expect(promptConfig.defineWord.toLowerCase()).toMatch(/json|format|structure/);
    expect(promptConfig.expandDefinition.toLowerCase()).toMatch(/json|format|structure/);
    expect(promptConfig.wordRelationships.toLowerCase()).toMatch(/json|format|structure/);
    expect(promptConfig.finalReview.toLowerCase()).toMatch(/json|format|structure/);
  });
}); 