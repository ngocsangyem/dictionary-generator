const fs = require('fs');
const mockFs = require('mock-fs');
// Worker is only being imported for type hints, add a comment to explain this
// eslint-disable-next-line no-unused-vars
const { Worker } = require('worker_threads');
const { ensureChunkFinalFiles } = require('../../../src/core/parallelProcessor');

// Mock dependencies
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn()
  }))
}));

jest.mock('../../../src/utils/mergeUtils', () => ({
  mergeChunkFiles: jest.fn().mockReturnValue(true),
  mergeChunkJsonFiles: jest.fn().mockImplementation((_chunkDir, _chunkId) => {
    return { word1: {}, word2: {} };
  })
}));

jest.mock('../../../src/utils/fileUtils', () => ({
  createDirectories: jest.fn(),
  readWordsList: jest.fn().mockReturnValue(['word1', 'word2', 'word3', 'word4']),
  loadChunkProgress: jest.fn().mockReturnValue(null)
}));

jest.mock('../../../src/config/promptConfig', () => ({
  loadPromptConfig: jest.fn().mockReturnValue({ systemPrompt: 'test prompt' }),
  savePromptConfig: jest.fn()
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
  NUM_WORKERS: 2
}));

describe('parallelProcessor', () => {
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
            'progress_50.json': JSON.stringify({ word4: { data: 'data4' } }),
            'final.json': JSON.stringify({ word3: { data: 'data3' }, word4: { data: 'data4' } })
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
      },
      'src': {
        'workers': {
          'processWorker.js': 'console.log("Worker script")'
        }
      }
    });
  });

  afterEach(() => {
    // Restore the real file system
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('ensureChunkFinalFiles creates final.json for chunks that need it', async () => {
    // Call the function
    const result = ensureChunkFinalFiles();
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify final.json was created for chunk_0
    expect(fs.existsSync('./output/chunks/chunk_0/final.json')).toBe(true);
    
    // Verify existing final.json for chunk_1 wasn't modified
    const chunk1Final = JSON.parse(fs.readFileSync('./output/chunks/chunk_1/final.json', 'utf8'));
    expect(chunk1Final).toEqual({ word3: { data: 'data3' }, word4: { data: 'data4' } });
  });

  test('ensureChunkFinalFiles returns false when no chunk directories found', () => {
    // Delete chunks directory
    fs.rmdirSync('./output/chunks', { recursive: true });
    fs.mkdirSync('./output/chunks');
    
    // Call function
    const result = ensureChunkFinalFiles();
    
    // Should return false
    expect(result).toBe(false);
  });

  test('ensureChunkFinalFiles skips chunks with no progress files', () => {
    // Remove progress files from chunk_0
    fs.unlinkSync('./output/chunks/chunk_0/progress_100.json');
    
    // Call function
    const result = ensureChunkFinalFiles();
    
    // Should still return true
    expect(result).toBe(true);
    
    // But no final.json should be created for chunk_0
    expect(fs.existsSync('./output/chunks/chunk_0/final.json')).toBe(false);
  });
}); 