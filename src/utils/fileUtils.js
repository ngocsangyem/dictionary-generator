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
    const wordsList = fs.readFileSync(path.join(DIRECTORIES.DATA, "words_list_full.txt"), "utf8");
    return wordsList.split("\n")
        .filter(line => line.trim() !== "" && !line.trim().startsWith('#'));
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
 * Get total word count from all chunk progress files
 */
function getTotalWordCount() {
    if (!fs.existsSync(DIRECTORIES.PROGRESS)) {
        return 0;
    }

    try {
        // Read all progress files
        const progressFiles = fs.readdirSync(DIRECTORIES.PROGRESS)
            .filter(file => file.startsWith('chunk_') && file.endsWith('_progress.json'));

        // Sum up total words from all chunks
        const totalWords = progressFiles.reduce((sum, file) => {
            const progressData = JSON.parse(
                fs.readFileSync(path.join(DIRECTORIES.PROGRESS, file), 'utf8')
            );
            return sum + (progressData.totalProcessed || 0);
        }, 0);

        return totalWords;
    } catch (error) {
        console.warn('Error reading progress files:', error.message);
        return 0;
    }
}

/**
 * Clean up progress files for a chunk
 */
function cleanupProgressFiles(chunkDir, chunkId) {
    try {
        // Delete progress files in chunk directory
        const files = fs.readdirSync(chunkDir);
        files.forEach(file => {
            if (file.startsWith('progress_')) {
                fs.unlinkSync(path.join(chunkDir, file));
                console.log(`Deleted progress file: ${file}`);
            }
        });

        // Delete progress tracker file
        const progressFile = path.join(DIRECTORIES.PROGRESS, `chunk_${chunkId}_progress.json`);
        if (fs.existsSync(progressFile)) {
            fs.unlinkSync(progressFile);
            console.log(`Deleted progress tracker file: chunk_${chunkId}_progress.json`);
        }
    } catch (error) {
        console.warn(`Warning: Error cleaning up progress files for chunk ${chunkId}:`, error.message);
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
    removeAudioField
}; 