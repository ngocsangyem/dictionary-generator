/**
 * Class to track and report progress during processing
 */
class ProgressTracker {
    /**
     * Initialize a new progress tracker
     * @param {number} totalWords - Total number of words to process
     * @param {number} startIndex - Starting index in the word list
     * @param {number} batchSize - Size of each batch
     */
    constructor(totalWords, startIndex, batchSize) {
        this.totalWords = totalWords;
        this.startIndex = startIndex;
        this.batchSize = batchSize;
        this.processedWords = 0;
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.recentSpeeds = [];
    }

    /**
     * Update progress with the number of words processed in the last batch
     * @param {number} processedBatchSize - Number of words processed in the last batch
     * @returns {Object} - Current progress information
     */
    update(processedBatchSize) {
        this.processedWords += processedBatchSize;
        const currentTime = Date.now();
        const timeSinceLastUpdate = (currentTime - this.lastUpdateTime) / 1000; // in seconds
        
        // Calculate speed for this batch
        const speed = processedBatchSize / timeSinceLastUpdate;
        this.recentSpeeds.push(speed);
        // Keep only last 10 speed measurements
        if (this.recentSpeeds.length > 10) {
            this.recentSpeeds.shift();
        }
        
        this.lastUpdateTime = currentTime;
        return this.getProgress();
    }

    /**
     * Get current progress information
     * @returns {Object} - Progress information
     */
    getProgress() {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.startTime) / 1000; // in seconds
        const remainingWords = this.totalWords - this.processedWords;
        
        // Calculate average speed from recent measurements
        const avgSpeed = this.recentSpeeds.length > 0 
            ? this.recentSpeeds.reduce((a, b) => a + b, 0) / this.recentSpeeds.length 
            : this.processedWords / elapsedTime;
        
        // Estimate remaining time
        const estimatedRemainingTime = avgSpeed > 0 ? remainingWords / avgSpeed : 0;
        
        // Calculate progress percentage
        const progressPercent = (this.processedWords / this.totalWords) * 100;

        return {
            totalWords: this.totalWords,
            processedWords: this.processedWords,
            elapsedTime: this.formatTime(elapsedTime),
            estimatedRemainingTime: this.formatTime(estimatedRemainingTime),
            progressPercent: progressPercent.toFixed(2),
            currentSpeed: avgSpeed.toFixed(2)
        };
    }

    /**
     * Format time in seconds to readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} - Formatted time string
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }
}

module.exports = ProgressTracker; 