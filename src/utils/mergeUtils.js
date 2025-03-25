const fs = require('fs');
const path = require('path');
const { DIRECTORIES } = require('../config/constants');
const { cleanupProgressFiles, saveChunkProgress } = require('./fileUtils');

/**
 * Merge all final.json files from each chunk into a single result file
 */
function mergeChunkFiles() {
    const mergedData = {};

    // Read all chunk directories
    const chunkDirs = fs.readdirSync(DIRECTORIES.CHUNKS)
        .filter(dir => dir.startsWith('chunk_'))
        .map(dir => path.join(DIRECTORIES.CHUNKS, dir));

    // Merge final.json from each chunk
    chunkDirs.forEach(chunkDir => {
        const finalFile = path.join(chunkDir, 'final.json');
        if (fs.existsSync(finalFile)) {
            const chunkData = JSON.parse(fs.readFileSync(finalFile, 'utf8'));
            Object.assign(mergedData, chunkData);
            
            // After successful merge, delete the chunk directory
            try {
                fs.rmSync(chunkDir, { recursive: true, force: true });
                console.log(`Cleaned up chunk directory: ${chunkDir}`);
            } catch (error) {
                console.warn(`Warning: Could not delete chunk directory ${chunkDir}:`, error.message);
            }
        }
    });

    // Save merged result
    fs.writeFileSync(
        path.join(DIRECTORIES.MERGED, 'result_final.json'),
        JSON.stringify(mergedData, null, 2)
    );
    
    // Clean up the progress directory as well
    if (fs.existsSync(DIRECTORIES.PROGRESS)) {
        try {
            fs.rmSync(DIRECTORIES.PROGRESS, { recursive: true, force: true });
            console.log('Cleaned up progress directory');
        } catch (error) {
            console.warn('Warning: Could not delete progress directory:', error.message);
        }
    }
}

/**
 * Merge JSON files in a specific chunk directory
 */
function mergeChunkJsonFiles(chunkDir, chunkId) {
    try {
        let mergedData = {};
        
        // Get all JSON files in the chunk directory
        const files = fs.readdirSync(chunkDir)
            .filter(file => file.endsWith('.json') && !file.startsWith('final'));
        
        // Sort files to process them in order
        files.sort((a, b) => {
            const indexA = parseInt(a.match(/\d+/)?.[0] || 0);
            const indexB = parseInt(b.match(/\d+/)?.[0] || 0);
            return indexA - indexB;
        });
        
        // Merge all JSON files
        files.forEach(file => {
            const filePath = path.join(chunkDir, file);
            try {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                mergedData = { ...mergedData, ...fileData };
            } catch (error) {
                console.warn(`Warning: Could not parse JSON file ${file}:`, error.message);
            }
        });

        // Get the latest index from progress file
        const progressFile = path.join(DIRECTORIES.PROGRESS, `chunk_${chunkId}_progress.json`);
        let latestIndex = 0;
        if (fs.existsSync(progressFile)) {
            const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
            latestIndex = progressData.lastProcessedIndex;
        }

        // Count total words in merged data
        const totalWords = Object.keys(mergedData).length;
        console.log(`Total words in merged data: ${totalWords}`);

        // Update progress file with word count
        const updatedProgressData = {
            chunkId,
            lastProcessedIndex: latestIndex,
            totalProcessed: totalWords,
            totalWords: totalWords,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(progressFile, JSON.stringify(updatedProgressData, null, 2));

        // Save merged data to new file
        const mergedFile = path.join(chunkDir, `progress_${latestIndex}.json`);
        fs.writeFileSync(mergedFile, JSON.stringify(mergedData, null, 2));
        console.log(`Merged ${files.length} files into ${mergedFile}`);

        // Delete all old JSON files in the chunk directory
        const allFiles = fs.readdirSync(chunkDir)
            .filter(file => file.endsWith('.json') && !file.startsWith('final'));
        
        allFiles.forEach(file => {
            const filePath = path.join(chunkDir, file);
            // Don't delete the file we just created
            if (filePath !== mergedFile) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old file: ${file}`);
                } catch (error) {
                    console.warn(`Warning: Could not delete file ${file}:`, error.message);
                }
            }
        });

        return mergedData;
    } catch (error) {
        console.error(`Error merging JSON files in chunk ${chunkId}:`, error.message);
        return null;
    }
}

module.exports = {
    mergeChunkFiles,
    mergeChunkJsonFiles
}; 