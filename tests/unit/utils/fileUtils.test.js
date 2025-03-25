const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const { 
  createDirectories, 
  loadChunkProgress, 
  saveChunkProgress, 
  getTotalWordCount,
  cleanupProgressFiles
} = require('../../../src/utils/fileUtils');

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

describe('fileUtils', () => {
  beforeEach(() => {
    // Setup mock file system
    mockFs({
      'output': {
        'chunks': {
          'chunk_0': {
            'progress_100.json': JSON.stringify({ word1: {}, word2: {} }),
            'final.json': JSON.stringify({ word1: {}, word2: {} })
          },
          'chunk_1': {
            'progress_200.json': JSON.stringify({ word3: {}, word4: {} })
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
            lastProcessedIndex: 200,
            totalProcessed: 2,
            totalWords: 2
          })
        },
        'merged': {
          'result_final.json': JSON.stringify({ word1: {}, word2: {}, word3: {}, word4: {} })
        }
      },
      'data': {
        'words_list_full.txt': 'word1\nword2\nword3\nword4\n'
      },
      'logs': {}
    });
  });

  afterEach(() => {
    // Restore the real file system
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('createDirectories creates the expected directories', () => {
    // Delete some directories to test creation
    fs.rmdirSync('./output/chunks', { recursive: true });
    fs.rmdirSync('./output/merged', { recursive: true });
    
    // Call the function
    createDirectories();
    
    // Check that directories were created
    expect(fs.existsSync('./output/chunks')).toBe(true);
    expect(fs.existsSync('./output/progress')).toBe(true);
    expect(fs.existsSync('./output/merged')).toBe(true);
    expect(fs.existsSync('./data')).toBe(true);
    expect(fs.existsSync('./logs')).toBe(true);
  });

  test('loadChunkProgress returns progress data for a chunk', () => {
    const progress = loadChunkProgress(0);
    
    expect(progress).toEqual({
      chunkId: 0,
      lastProcessedIndex: 100,
      totalProcessed: 2,
      totalWords: 2
    });
  });

  test('loadChunkProgress returns null for non-existent chunk', () => {
    const progress = loadChunkProgress(99);
    
    expect(progress).toBeNull();
  });

  test('saveChunkProgress saves progress data correctly', () => {
    // Data to save
    const chunkId = 2;
    const currentIndex = 300;
    const totalProcessed = 3;
    
    // Call the function
    saveChunkProgress(chunkId, currentIndex, totalProcessed);
    
    // Check if the file was created
    const progressFile = path.join('./output/progress', `chunk_${chunkId}_progress.json`);
    expect(fs.existsSync(progressFile)).toBe(true);
    
    // Check file contents
    const savedData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    expect(savedData.chunkId).toBe(chunkId);
    expect(savedData.lastProcessedIndex).toBe(currentIndex);
    expect(savedData.totalProcessed).toBe(totalProcessed);
  });

  test('getTotalWordCount returns correct count from progress files', () => {
    const totalWords = getTotalWordCount();
    
    // Total should be 4 (2 from chunk_0 + 2 from chunk_1)
    expect(totalWords).toBe(4);
  });

  test('getTotalWordCount falls back to merged result when no progress files', () => {
    // Delete progress files
    fs.rmdirSync('./output/progress', { recursive: true });
    
    const totalWords = getTotalWordCount();
    
    // Total should be 4 from the merged results
    expect(totalWords).toBe(4);
  });

  test('cleanupProgressFiles removes progress files for a chunk', () => {
    // Verify files exist before cleanup
    expect(fs.existsSync('./output/chunks/chunk_0/progress_100.json')).toBe(true);
    
    // Call cleanup
    const result = cleanupProgressFiles(0);
    
    // Verify result is true (success)
    expect(result).toBe(true);
    
    // Verify progress file was removed
    expect(fs.existsSync('./output/chunks/chunk_0/progress_100.json')).toBe(false);
    
    // Verify final.json was not removed
    expect(fs.existsSync('./output/chunks/chunk_0/final.json')).toBe(true);
  });
}); 