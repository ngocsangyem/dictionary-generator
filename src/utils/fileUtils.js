const fs = require('fs');
const path = require('path');
const { DIRECTORIES } = require('../config/constants');

/**
 * Create all required directories
 */
function createDirectories() {
  Object.values(DIRECTORIES).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Log API response to file with progress information
 */
function logApiResponse(response, index, workerId = 'test', progress = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(DIRECTORIES.LOGS, `api_response_${workerId}_${index}_${timestamp}.log`);
    
  let progressInfo = '';
  if (progress) {
    progressInfo = `\nProgress:
Processed: ${progress.processedWords}/${progress.totalWords} words (${progress.progressPercent}%)
Elapsed Time: ${progress.elapsedTime}
Estimated Remaining: ${progress.estimatedRemainingTime}
Current Speed: ${progress.currentSpeed} words/sec`;
  }
    
  const logContent = `Timestamp: ${new Date().toISOString()}
Index: ${index}
Worker: ${workerId}${progressInfo}
Raw Response:
${response}
----------------------------------------
`;
  fs.writeFileSync(logFile, logContent);
  console.log(`API response logged to ${logFile}`);
}

/**
 * Read words from the word list file
 */
function readWordsList() {
  const wordsList = fs.readFileSync(path.join(DIRECTORIES.DATA, 'words_list_full.txt'), 'utf8');
  return wordsList.split('\n')
    .filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
}

/**
 * Save chunk progress information
 */
function saveChunkProgress(chunkId, currentIndex, totalProcessed, tracker = null) {
  if (!fs.existsSync(DIRECTORIES.PROGRESS)) {
    fs.mkdirSync(DIRECTORIES.PROGRESS, { recursive: true });
  }
    
  const progressData = {
    chunkId,
    lastProcessedIndex: currentIndex,
    totalProcessed,
    timestamp: new Date().toISOString()
  };

  // Add tracker information if available
  if (tracker) {
    const progress = tracker.getProgress();
    progressData.progress = {
      totalWords: progress.totalWords,
      processedWords: progress.processedWords,
      progressPercent: progress.progressPercent,
      elapsedTime: progress.elapsedTime,
      estimatedRemainingTime: progress.estimatedRemainingTime,
      currentSpeed: progress.currentSpeed,
      actualWordCount: totalProcessed // Add actual word count from merged data
    };
  }
    
  const progressFile = path.join(DIRECTORIES.PROGRESS, `chunk_${chunkId}_progress.json`);
  fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
}

/**
 * Load chunk progress information
 */
function loadChunkProgress(chunkId) {
  const progressFile = path.join(DIRECTORIES.PROGRESS, `chunk_${chunkId}_progress.json`);
  try {
    if (fs.existsSync(progressFile)) {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    }
  } catch (error) {
    console.log(`No progress file found for chunk ${chunkId}`);
  }
  return null;
}

/**
 * Find the latest processed index across all chunks
 */
function findLatestProcessedIndex() {
  if (!fs.existsSync(DIRECTORIES.PROGRESS)) {
    return 0;
  }

  let latestIndex = 0;
  try {
    // Read all progress files
    const progressFiles = fs.readdirSync(DIRECTORIES.PROGRESS)
      .filter(file => file.startsWith('chunk_') && file.endsWith('_progress.json'));

    // Find the latest processed index across all chunks
    progressFiles.forEach(file => {
      const progressData = JSON.parse(
        fs.readFileSync(path.join(DIRECTORIES.PROGRESS, file), 'utf8')
      );
      latestIndex = Math.max(latestIndex, progressData.lastProcessedIndex);
    });

    console.log(`Found latest processed index: ${latestIndex}`);
    return latestIndex;
  } catch (error) {
    console.warn('Error reading progress files:', error.message);
    return 0;
  }
}

/**
 * Get total word count from all chunk progress files or merged result
 */
function getTotalWordCount() {
  let totalWords = 0;
    
  // First try to get count from progress files
  if (fs.existsSync(DIRECTORIES.PROGRESS)) {
    try {
      // Read all progress files
      const progressFiles = fs.readdirSync(DIRECTORIES.PROGRESS)
        .filter(file => file.startsWith('chunk_') && file.endsWith('_progress.json'));

      if (progressFiles.length > 0) {
        // Sum up total words from all chunks
        totalWords = progressFiles.reduce((sum, file) => {
          const progressData = JSON.parse(
            fs.readFileSync(path.join(DIRECTORIES.PROGRESS, file), 'utf8')
          );
          return sum + (progressData.totalProcessed || 0);
        }, 0);
                
        console.log(`Found ${totalWords} words from progress files`);
        return totalWords;
      }
    } catch (error) {
      console.warn('Error reading progress files:', error.message);
    }
  }
    
  // If no progress files or error reading them, check merged result
  const mergedFile = path.join(DIRECTORIES.MERGED, 'result_final.json');
  if (fs.existsSync(mergedFile)) {
    try {
      const mergedData = JSON.parse(fs.readFileSync(mergedFile, 'utf8'));
      totalWords = Object.keys(mergedData).length;
      console.log(`Found ${totalWords} words from merged result file`);
      return totalWords;
    } catch (error) {
      console.warn('Error reading merged result file:', error.message);
    }
  }
    
  // If neither progress files nor merged result available, check chunk directories
  if (fs.existsSync(DIRECTORIES.CHUNKS)) {
    try {
      const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
        .filter(dir => dir.startsWith('chunk_'));
                
      for (const chunkDir of chunkDirs) {
        const finalFile = path.join(DIRECTORIES.CHUNKS, chunkDir, 'final.json');
        if (fs.existsSync(finalFile)) {
          try {
            const chunkData = JSON.parse(fs.readFileSync(finalFile, 'utf8'));
            totalWords += Object.keys(chunkData).length;
          } catch (error) {
            console.warn(`Error reading ${finalFile}:`, error.message);
          }
        }
      }
            
      if (totalWords > 0) {
        console.log(`Found ${totalWords} words from chunk final.json files`);
        return totalWords;
      }
    } catch (error) {
      console.warn('Error reading chunk directories:', error.message);
    }
  }
    
  console.log('No word count information found');
  return 0;
}

/**
 * Clean up progress files for a given chunk
 * @param {number} chunkId - ID of the chunk to clean
 * @returns {boolean} - Success status
 */
function cleanupProgressFiles(chunkId) {
  try {
    const chunkDir = path.join(DIRECTORIES.CHUNKS, `chunk_${chunkId}`);
        
    if (!fs.existsSync(chunkDir)) {
      console.log(`Chunk directory not found: ${chunkDir}`);
      return false;
    }
        
    const progressFiles = fs.readdirSync(chunkDir)
      .filter(file => file.endsWith('.json') && file.startsWith('progress_'));
        
    if (progressFiles.length === 0) {
      console.log(`No progress files found for chunk ${chunkId}`);
      return true;
    }
        
    console.log(`Cleaning up ${progressFiles.length} progress files for chunk ${chunkId}`);
    let successCount = 0;
        
    for (const file of progressFiles) {
      try {
        fs.unlinkSync(path.join(chunkDir, file));
        successCount++;
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error.message);
      }
    }
        
    console.log(`Successfully deleted ${successCount}/${progressFiles.length} progress files`);
    return successCount === progressFiles.length;
  } catch (error) {
    console.error('Error cleaning up progress files:', error.message);
    return false;
  }
}

/**
 * Clean up progress files for all chunks
 * @returns {boolean} - Success status
 */
function cleanupAllProgressFiles() {
  try {
    const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
      .filter(dir => dir.startsWith('chunk_'));
        
    if (chunkDirs.length === 0) {
      console.log('No chunk directories found');
      return true;
    }
        
    let allSuccess = true;
        
    for (const chunkDirName of chunkDirs) {
      const chunkId = parseInt(chunkDirName.replace('chunk_', ''));
      const success = cleanupProgressFiles(chunkId);
            
      if (!success) {
        allSuccess = false;
      }
    }
        
    return allSuccess;
  } catch (error) {
    console.error('Error cleaning up all progress files:', error.message);
    return false;
  }
}

/**
 * Remove audio field from API response data
 */
function removeAudioField(data) {
  const processedData = {};
  for (const [key, value] of Object.entries(data)) {
    const wordEntry = { ...value };
    if (wordEntry.phonetics) {
      wordEntry.phonetics = wordEntry.phonetics.map(phonetic => {
        // eslint-disable-next-line no-unused-vars
        const { audio, ...rest } = phonetic;
        return rest;
      });
    }
    processedData[key] = wordEntry;
  }
  return processedData;
}

module.exports = {
  createDirectories,
  logApiResponse,
  readWordsList,
  saveChunkProgress,
  loadChunkProgress,
  findLatestProcessedIndex,
  getTotalWordCount,
  cleanupProgressFiles,
  cleanupAllProgressFiles,
  removeAudioField
}; 