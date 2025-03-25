const fs = require('fs');
const path = require('path');
const { DIRECTORIES } = require('../config/constants');

/**
 * Merge all final.json files from each chunk into a single result file
 * @param {boolean} preserveProgress - Whether to preserve progress files after merging
 * @returns {boolean} - Success status
 */
function mergeChunkFiles(preserveProgress = false) {
    const mergedData = {};
    const successfulChunks = [];

    // Read all chunk directories
    const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
        .filter(dir => dir.startsWith('chunk_'))
        .map(dir => path.join(DIRECTORIES.CHUNKS, dir));

    console.log(`Found ${chunkDirs.length} chunk directories to merge`);
    
    if (chunkDirs.length === 0) {
        console.log('No chunk directories found to merge');
        return false;
    }

    // Merge final.json from each chunk
    chunkDirs.forEach(chunkDir => {
        const finalFile = path.join(chunkDir, 'final.json');
        if (fs.existsSync(finalFile)) {
            try {
                const chunkData = JSON.parse(fs.readFileSync(finalFile, 'utf8'));
                const wordCount = Object.keys(chunkData).length;
                
                if (wordCount > 0) {
                    Object.assign(mergedData, chunkData);
                    successfulChunks.push(chunkDir);
                    console.log(`Merged chunk ${path.basename(chunkDir)} with ${wordCount} words`);
                } else {
                    console.warn(`Skipping empty chunk: ${path.basename(chunkDir)}`);
                }
            } catch (error) {
                console.error(`Error reading final.json from ${chunkDir}: ${error.message}`);
            }
        } else {
            console.log(`No final.json found in ${chunkDir}, skipping`);
        }
    });
    
    const totalWords = Object.keys(mergedData).length;
    
    if (totalWords === 0) {
        console.log('No words were merged from any chunks');
        return false;
    }
    
    console.log(`Total words merged: ${totalWords}`);

    // Ensure merged directory exists
    if (!fs.existsSync(DIRECTORIES.MERGED)) {
        fs.mkdirSync(DIRECTORIES.MERGED, { recursive: true });
    }

    // Save merged result
    const resultFile = path.join(DIRECTORIES.MERGED, 'result_final.json');
    fs.writeFileSync(resultFile, JSON.stringify(mergedData, null, 2));
    console.log(`Merged result saved to ${resultFile}`);
    
    // Only delete the chunk directories after successful merge
    if (successfulChunks.length > 0) {
        console.log(`Cleaning up ${successfulChunks.length} successful chunk directories...`);
        
        successfulChunks.forEach(chunkDir => {
            try {
                fs.rmSync(chunkDir, { recursive: true, force: true });
                console.log(`Cleaned up chunk directory: ${chunkDir}`);
            } catch (error) {
                console.warn(`Warning: Could not delete chunk directory ${chunkDir}: ${error.message}`);
            }
        });
    }
    
    // Clean up the progress directory as well
    if (!preserveProgress && fs.existsSync(DIRECTORIES.PROGRESS)) {
        try {
            fs.rmSync(DIRECTORIES.PROGRESS, { recursive: true, force: true });
            console.log('Cleaned up progress directory');
        } catch (error) {
            console.warn(`Warning: Could not delete progress directory: ${error.message}`);
        }
    } else if (preserveProgress) {
        console.log('Preserving progress directory as requested');
    }
    
    return true;
}

/**
 * Merge JSON files in a specific chunk directory
 * @param {string} chunkDir - Path to the chunk directory 
 * @param {number} chunkId - ID of the chunk
 * @returns {Object|null} - Merged data object or null if error
 */
function mergeChunkJsonFiles(chunkDir, chunkId) {
    try {
        let mergedData = {};
        
        // Check if final.json already exists
        const finalFile = path.join(chunkDir, 'final.json');
        if (fs.existsSync(finalFile)) {
            console.log(`Final.json already exists for chunk ${chunkId}, using it`);
            return JSON.parse(fs.readFileSync(finalFile, 'utf8'));
        }
        
        // Get all JSON files in the chunk directory
        const files = fs.readdirSync(chunkDir)
            .filter(file => file.endsWith('.json') && !file.startsWith('final'));
        
        if (files.length === 0) {
            console.log(`No JSON files found in chunk ${chunkId} directory`);
            return null;
        }
        
        console.log(`Merging ${files.length} JSON files in chunk ${chunkId}`);
        
        // Sort files to process them in order
        files.sort((a, b) => {
            const indexA = parseInt(a.match(/\d+/)?.[0] || 0);
            const indexB = parseInt(b.match(/\d+/)?.[0] || 0);
            return indexA - indexB;
        });
        
        // Merge all JSON files
        let processedCount = 0;
        files.forEach(file => {
            const filePath = path.join(chunkDir, file);
            try {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const wordCount = Object.keys(fileData).length;
                console.log(`Read ${file} with ${wordCount} words`);
                mergedData = { ...mergedData, ...fileData };
                processedCount++;
            } catch (error) {
                console.warn(`Warning: Could not parse JSON file ${file}: ${error.message}`);
            }
        });

        if (processedCount === 0) {
            console.log(`Failed to process any files in chunk ${chunkId}`);
            return null;
        }

        const totalWords = Object.keys(mergedData).length;
        if (totalWords === 0) {
            console.log(`No words found in merged data for chunk ${chunkId}`);
            return null;
        }
        
        console.log(`Total words in merged data: ${totalWords}`);

        // Get the latest index from progress file
        const progressFile = path.join(DIRECTORIES.PROGRESS, `chunk_${chunkId}_progress.json`);
        let latestIndex = 0;
        if (fs.existsSync(progressFile)) {
            const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
            latestIndex = progressData.lastProcessedIndex;
        }

        // Update progress file with word count
        const updatedProgressData = {
            chunkId,
            lastProcessedIndex: latestIndex,
            totalProcessed: totalWords,
            totalWords: totalWords,
            timestamp: new Date().toISOString()
        };
        
        // Ensure the progress directory exists
        if (!fs.existsSync(DIRECTORIES.PROGRESS)) {
            fs.mkdirSync(DIRECTORIES.PROGRESS, { recursive: true });
        }
        
        fs.writeFileSync(progressFile, JSON.stringify(updatedProgressData, null, 2));

        // Save merged data to new progress file and final.json
        const progressMergedFile = path.join(chunkDir, `progress_${latestIndex}.json`);
        fs.writeFileSync(progressMergedFile, JSON.stringify(mergedData, null, 2));
        
        // Also save to final.json to mark this chunk as completed
        fs.writeFileSync(finalFile, JSON.stringify(mergedData, null, 2));
        
        console.log(`Merged ${files.length} files into progress file and final.json for chunk ${chunkId}`);

        // Delete all old JSON files in the chunk directory
        const allFiles = fs.readdirSync(chunkDir)
            .filter(file => file.endsWith('.json') && !file.startsWith('final'));
        
        allFiles.forEach(file => {
            const filePath = path.join(chunkDir, file);
            // Don't delete the file we just created
            if (filePath !== progressMergedFile) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old file: ${file}`);
                } catch (error) {
                    console.warn(`Warning: Could not delete file ${file}: ${error.message}`);
                }
            }
        });

        return mergedData;
    } catch (error) {
        console.error(`Error merging JSON files in chunk ${chunkId}: ${error.message}`);
        return null;
    }
}

module.exports = {
    mergeChunkFiles,
    mergeChunkJsonFiles
}; 