const fs = require('fs');
const path = require('path');
const { DIRECTORIES, BATCH_SIZE } = require('../config/constants');
const { loadChunkProgress, saveChunkProgress } = require('../utils/fileUtils');
const { mergeChunkFiles, mergeChunkJsonFiles } = require('../utils/mergeUtils');
const ProgressTracker = require('../utils/ProgressTracker');

/**
 * Manually create final.json for all chunks and merge them
 * @param {boolean} preserveProgress - Whether to preserve progress files after merging
 * @returns {boolean} - Success status
 */
function mergeAllChunks(preserveProgress = true) {
  try {
    console.log('Merging all chunks...');
        
    // Get all chunk directories
    const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
      .filter(dir => dir.startsWith('chunk_'));
        
    if (chunkDirs.length === 0) {
      console.log('No chunk directories found');
      return false;
    }
        
    // Process each chunk directory
    for (const chunkDirName of chunkDirs) {
      const chunkId = parseInt(chunkDirName.replace('chunk_', ''));
      const chunkDir = path.join(DIRECTORIES.CHUNKS, chunkDirName);
      const finalFile = path.join(chunkDir, 'final.json');
            
      // Skip if final.json already exists
      if (fs.existsSync(finalFile)) {
        console.log(`Final file already exists for chunk ${chunkId}, skipping`);
        continue;
      }
            
      console.log(`Processing chunk ${chunkId} in directory ${chunkDir}`);
            
      // Check if there are any progress files
      const progressFiles = fs.readdirSync(chunkDir)
        .filter(file => file.endsWith('.json') && file.startsWith('progress_'));
            
      if (progressFiles.length === 0) {
        console.log(`No progress files found for chunk ${chunkId}, skipping`);
        continue;
      }
            
      // Get progress data
      const existingProgress = loadChunkProgress(chunkId);
      const startingIndex = existingProgress ? existingProgress.lastProcessedIndex : 0;
            
      // Initialize tracker with existing data
      const tracker = new ProgressTracker(
        existingProgress ? existingProgress.totalWords : 0,
        startingIndex,
        BATCH_SIZE
      );
      if (existingProgress && existingProgress.totalProcessed) {
        tracker.processedWords = existingProgress.totalProcessed;
      }
            
      // Merge progress files
      const mergedData = mergeChunkJsonFiles(chunkDir, chunkId);
      if (mergedData) {
        // Save the merged data to final.json
        fs.writeFileSync(finalFile, JSON.stringify(mergedData, null, 2));
        console.log(`Created final.json for chunk ${chunkId}`);
                
        // Update progress with actual word count
        const totalWords = Object.keys(mergedData).length;
        tracker.update(totalWords);
                
        // Save updated progress
        saveChunkProgress(chunkId, startingIndex + totalWords, totalWords, tracker);
      } else {
        console.log(`Failed to merge progress files for chunk ${chunkId}`);
      }
    }
        
    // Finally, merge all final.json files into the result
    // Preserve progress files for word count
    mergeChunkFiles(preserveProgress);
    console.log('All chunks merged successfully');
        
    return true;
  } catch (error) {
    console.error('Error merging all chunks:', error.message);
    return false;
  }
}

/**
 * Manually merge JSON files for a specific chunk
 * @param {number} chunkId - ID of the chunk to merge (-1 for all chunks)
 * @param {boolean} preserveProgress - Whether to preserve progress files after merging
 * @returns {boolean} - Success status
 */
function manualMerge(chunkId, preserveProgress = true) {
  try {
    // Set up a signal handler for graceful shutdown
    let isShuttingDown = false;
    const originalHandler = process.listeners('SIGINT')[0];
        
    // Remove any existing handlers
    process.removeAllListeners('SIGINT');
        
    // Add our custom handler
    process.on('SIGINT', () => {
      if (isShuttingDown) {
        console.log('\nForcing exit...');
        process.exit(1);
      }
            
      console.log('\nReceived SIGINT, gracefully shutting down...');
      isShuttingDown = true;
            
      // Try to finalize any ongoing processes
      if (chunkId === -1) {
        console.log('Attempting to save any progress made...');
        mergeChunkFiles(preserveProgress);
      }
            
      // Exit gracefully
      console.log('Shutdown complete.');
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.on('SIGINT', originalHandler);
      }
            
      process.exit(0);
    });
        
    // Special case: merge all chunks
    if (chunkId === -1) {
      const result = mergeAllChunks(preserveProgress);
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', originalHandler);
      }
            
      return result;
    }
        
    const chunkDir = path.join(DIRECTORIES.CHUNKS, `chunk_${chunkId}`);
        
    if (!fs.existsSync(chunkDir)) {
      console.log(`Chunk directory not found: ${chunkDir}`);
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', originalHandler);
      }
            
      return false;
    }
        
    console.log(`Merging files for chunk ${chunkId}...`);
        
    // Get existing progress data
    const existingProgress = loadChunkProgress(chunkId);
    const startingIndex = existingProgress ? existingProgress.lastProcessedIndex : 0;
        
    // Initialize tracker with existing data
    const tracker = new ProgressTracker(
      existingProgress ? existingProgress.totalWords : 0,
      startingIndex,
      BATCH_SIZE
    );
    if (existingProgress && existingProgress.progress) {
      tracker.processedWords = existingProgress.progress.processedWords;
    }
        
    const mergedData = mergeChunkJsonFiles(chunkDir, chunkId);
    if (mergedData) {
      // Update progress with actual word count
      const totalWords = Object.keys(mergedData).length;
      tracker.update(totalWords);
            
      // Save updated progress
      saveChunkProgress(chunkId, startingIndex + totalWords, totalWords, tracker);
            
      // Save to final.json
      const finalFile = path.join(chunkDir, 'final.json');
      fs.writeFileSync(finalFile, JSON.stringify(mergedData, null, 2));
            
      console.log(`Merge completed successfully. Total words: ${totalWords}`);
      console.log('Progress tracker updated');
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', originalHandler);
      }
            
      return true;
    } else {
      console.log('Merge failed');
            
      // Restore original handler if it existed
      if (originalHandler) {
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', originalHandler);
      }
            
      return false;
    }
  } catch (error) {
    console.error('Error during manual merge:', error.message);
    return false;
  }
}

module.exports = manualMerge; 