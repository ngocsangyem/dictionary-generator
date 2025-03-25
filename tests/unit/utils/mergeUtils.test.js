const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const { mergeChunkFiles, mergeChunkJsonFiles } = require('../../../src/utils/mergeUtils');

// Mock fileUtils functions that are used in mergeUtils
jest.mock('../../../src/utils/fileUtils', () => ({
  // Implementation is mocked below as needed
}));

// Mock the DIRECTORIES constant
jest.mock('../../../src/config/constants', () => ({
  DIRECTORIES: {
    ROOT: '.',
    OUTPUT: './output',
    CHUNKS: './output/chunks',
    PROGRESS: './output/progress',
    MERGED: './output/merged',
    DATA: './data',
    LOGS: './logs',
    TEST: './tests/results'
  }
}));

describe('mergeUtils', () => {
  beforeEach(() => {
    // Setup mock file system
    mockFs({
      'output': {
        'chunks': {
          'chunk_0': {
            'progress_100.json': JSON.stringify({ word1: { data: 'data1' }, word2: { data: 'data2' } }),
            'final.json': JSON.stringify({ word1: { data: 'data1' }, word2: { data: 'data2' } })
          },
          'chunk_1': {
            'progress_0.json': JSON.stringify({ word3: { data: 'data3' } }),
            'progress_50.json': JSON.stringify({ word4: { data: 'data4' } })
          }
        },
        'progress': {
          'chunk_0_progress.json': JSON.stringify({
            chunkId: 0,
            lastProcessedIndex: 100,
            totalProcessed: 2,
            totalWords: 2
          }),
          'chunk_1_progress.json': JSON.stringify({
            chunkId: 1,
            lastProcessedIndex: 50,
            totalProcessed: 2,
            totalWords: 2
          })
        },
        'merged': {}
      }
    });
  });

  afterEach(() => {
    // Restore the real file system
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('mergeChunkJsonFiles correctly merges progress files', () => {
    const chunkDir = path.join('./output/chunks', 'chunk_1');
    const chunkId = 1;
    
    // Call the function
    const mergedData = mergeChunkJsonFiles(chunkDir, chunkId);
    
    // Verify merged data contains both words
    expect(Object.keys(mergedData).length).toBe(2);
    expect(mergedData.word3).toBeDefined();
    expect(mergedData.word4).toBeDefined();
    
    // Verify a progress file was created
    expect(fs.existsSync(path.join(chunkDir, 'progress_50.json'))).toBe(true);
    
    // Verify a final.json file was created
    expect(fs.existsSync(path.join(chunkDir, 'final.json'))).toBe(true);
    
    // Verify final.json content
    const finalContent = JSON.parse(fs.readFileSync(path.join(chunkDir, 'final.json'), 'utf8'));
    expect(Object.keys(finalContent).length).toBe(2);
  });

  test('mergeChunkJsonFiles returns existing final.json if it already exists', () => {
    const chunkDir = path.join('./output/chunks', 'chunk_0');
    const chunkId = 0;
    
    // Call the function
    const mergedData = mergeChunkJsonFiles(chunkDir, chunkId);
    
    // Verify data matches existing final.json
    expect(Object.keys(mergedData).length).toBe(2);
    expect(mergedData.word1).toEqual({ data: 'data1' });
    expect(mergedData.word2).toEqual({ data: 'data2' });
  });

  test('mergeChunkFiles merges all final.json files', () => {
    // First ensure chunk_1 has a final.json
    const chunkDir = path.join('./output/chunks', 'chunk_1');
    fs.writeFileSync(
      path.join(chunkDir, 'final.json'), 
      JSON.stringify({ word3: { data: 'data3' }, word4: { data: 'data4' } })
    );
    
    // Call the function
    const result = mergeChunkFiles();
    
    // Verify result is true (success)
    expect(result).toBe(true);
    
    // Verify merged result file was created
    const resultFile = path.join('./output/merged', 'result_final.json');
    expect(fs.existsSync(resultFile)).toBe(true);
    
    // Verify merged content
    const mergedContent = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    expect(Object.keys(mergedContent).length).toBe(4);
    expect(mergedContent.word1).toBeDefined();
    expect(mergedContent.word2).toBeDefined();
    expect(mergedContent.word3).toBeDefined();
    expect(mergedContent.word4).toBeDefined();
    
    // Verify chunk directories were cleaned up
    expect(fs.existsSync('./output/chunks/chunk_0')).toBe(false);
    expect(fs.existsSync('./output/chunks/chunk_1')).toBe(false);
  });

  test('mergeChunkFiles preserves progress when option is true', () => {
    // First ensure chunk_1 has a final.json
    const chunkDir = path.join('./output/chunks', 'chunk_1');
    fs.writeFileSync(
      path.join(chunkDir, 'final.json'), 
      JSON.stringify({ word3: { data: 'data3' }, word4: { data: 'data4' } })
    );
    
    // Call the function with preserveProgress = true
    const result = mergeChunkFiles(true);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify merged file was created
    expect(fs.existsSync(path.join('./output/merged', 'result_final.json'))).toBe(true);
    
    // Verify chunk directories were still cleaned up
    expect(fs.existsSync('./output/chunks/chunk_0')).toBe(false);
    expect(fs.existsSync('./output/chunks/chunk_1')).toBe(false);
    
    // But progress directory should still exist
    expect(fs.existsSync('./output/progress')).toBe(true);
    expect(fs.existsSync('./output/progress/chunk_0_progress.json')).toBe(true);
    expect(fs.existsSync('./output/progress/chunk_1_progress.json')).toBe(true);
  });

  test('mergeChunkFiles returns false when no chunks found', () => {
    // Remove all chunks
    fs.rmdirSync('./output/chunks', { recursive: true });
    fs.mkdirSync('./output/chunks');
    
    // Call function
    const result = mergeChunkFiles();
    
    // Should return false
    expect(result).toBe(false);
  });

  test('mergeChunkFiles returns false when no words are merged', () => {
    // Replace final.json files with empty objects
    fs.writeFileSync(path.join('./output/chunks/chunk_0', 'final.json'), JSON.stringify({}));
    
    // Remove chunk_1
    fs.rmdirSync('./output/chunks/chunk_1', { recursive: true });
    
    // Call function
    const result = mergeChunkFiles();
    
    // Should return false
    expect(result).toBe(false);
  });
}); 