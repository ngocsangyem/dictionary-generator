const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const manualMerge = require('../../../src/core/manualMerge');

// Mock dependencies
jest.mock('../../../src/utils/mergeUtils', () => ({
  mergeChunkFiles: jest.fn().mockReturnValue(true),
  mergeChunkJsonFiles: jest.fn().mockImplementation((chunkDir, chunkId) => {
    return { word1: {}, word2: {} };
  })
}));

const mockProgressTracker = {
  update: jest.fn(),
  processedWords: 0
};

jest.mock('../../../src/utils/ProgressTracker', () => 
  jest.fn().mockImplementation(() => mockProgressTracker)
);

jest.mock('../../../src/utils/fileUtils', () => ({
  loadChunkProgress: jest.fn().mockReturnValue({
    lastProcessedIndex: 100,
    totalWords: 2
  }),
  saveChunkProgress: jest.fn()
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
  },
  BATCH_SIZE: 28
}));

describe('manualMerge', () => {
  beforeEach(() => {
    // Setup mock file system
    mockFs({
      'output': {
        'chunks': {
          'chunk_0': {
            'progress_100.json': JSON.stringify({ word1: { data: 'data1' }, word2: { data: 'data2' } })
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
    
    // Mock process event emitter behavior
    process.listeners = jest.fn().mockReturnValue([]);
    process.on = jest.fn();
    process.removeAllListeners = jest.fn();
    process.exit = jest.fn();
  });

  afterEach(() => {
    // Restore the real file system
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('manualMerge for specific chunk merges and saves final.json', () => {
    // Call the function with a specific chunk ID
    const result = manualMerge(0);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify final.json was created
    expect(fs.existsSync('./output/chunks/chunk_0/final.json')).toBe(true);
    
    // Check that mergeChunkJsonFiles was called with the right parameters
    expect(require('../../../src/utils/mergeUtils').mergeChunkJsonFiles).toHaveBeenCalledWith(
      expect.stringContaining('chunk_0'),
      0
    );
  });

  test('manualMerge returns false for non-existent chunk', () => {
    // Call the function with a non-existent chunk ID
    const result = manualMerge(99);
    
    // Verify result
    expect(result).toBe(false);
  });

  test('manualMerge with -1 calls mergeAllChunks', () => {
    // Spy on mergeChunkFiles
    const mergeChunkFilesSpy = require('../../../src/utils/mergeUtils').mergeChunkFiles;
    
    // Call the function with -1 (all chunks)
    const result = manualMerge(-1);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify that mergeChunkFiles was called
    expect(mergeChunkFilesSpy).toHaveBeenCalled();
    
    // Both chunks should have final.json files
    expect(fs.existsSync('./output/chunks/chunk_0/final.json')).toBe(true);
    expect(fs.existsSync('./output/chunks/chunk_1/final.json')).toBe(true);
  });

  test('manualMerge with preserveProgress=true preserves progress files', () => {
    // Spy on mergeChunkFiles to check if preserveProgress is passed
    const mergeChunkFilesSpy = require('../../../src/utils/mergeUtils').mergeChunkFiles;
    
    // Call the function with -1 and preserveProgress=true
    manualMerge(-1, true);
    
    // Verify that mergeChunkFiles was called with preserveProgress=true
    expect(mergeChunkFilesSpy).toHaveBeenCalledWith(true);
  });

  test('manualMerge sets up SIGINT handlers', () => {
    // Call the function
    manualMerge(0);
    
    // Check that process.on was called to handle SIGINT
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    
    // Check that process.removeAllListeners was called
    expect(process.removeAllListeners).toHaveBeenCalled();
  });
}); 