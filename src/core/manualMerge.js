const fs = require('fs');
const path = require('path');
const { DIRECTORIES, BATCH_SIZE } = require('../config/constants');
const { loadChunkProgress, saveChunkProgress } = require('../utils/fileUtils');
const { mergeChunkJsonFiles } = require('../utils/mergeUtils');
const ProgressTracker = require('../utils/ProgressTracker');

/**
 * Manually merge JSON files for a specific chunk
 * @param {number} chunkId - ID of the chunk to merge
 * @returns {boolean} - Success status
 */
function manualMerge(chunkId) {
    try {
        const chunkDir = path.join(DIRECTORIES.CHUNKS, `chunk_${chunkId}`);
        
        if (!fs.existsSync(chunkDir)) {
            console.log(`Chunk directory not found: ${chunkDir}`);
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
            
            console.log(`Merge completed successfully. Total words: ${totalWords}`);
            console.log('Progress tracker updated');
            return true;
        } else {
            console.log('Merge failed');
            return false;
        }
    } catch (error) {
        console.error('Error during manual merge:', error.message);
        return false;
    }
}

module.exports = manualMerge; 