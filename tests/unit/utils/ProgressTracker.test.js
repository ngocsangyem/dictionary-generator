const ProgressTracker = require('../../../src/utils/ProgressTracker');
const { EventEmitter } = require('events');

describe('ProgressTracker', () => {
  let progressTracker;
  let mockConsole;
  
  beforeEach(() => {
    // Mock console.log
    mockConsole = {
      log: jest.fn()
    };
    global.console = mockConsole;
    
    // Create a new ProgressTracker instance
    progressTracker = new ProgressTracker('Test Progress', 100);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with correct properties', () => {
    expect(progressTracker.title).toBe('Test Progress');
    expect(progressTracker.total).toBe(100);
    expect(progressTracker.processedWords).toBe(0);
    expect(progressTracker.startTime).toBeInstanceOf(Date);
    expect(progressTracker.lastUpdateTime).toBeInstanceOf(Date);
    expect(progressTracker.updateInterval).toBe(1000); // Default interval
    expect(progressTracker.finished).toBe(false);
    expect(progressTracker).toBeInstanceOf(EventEmitter);
  });

  test('should update progress count properly', () => {
    // Update progress by 10
    progressTracker.update(10);
    expect(progressTracker.processedWords).toBe(10);
    
    // Update progress by another 25
    progressTracker.update(25);
    expect(progressTracker.processedWords).toBe(35);
  });

  test('should calculate remaining time correctly', () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockStartTime = 1000;
    
    Date.now = jest.fn()
      .mockReturnValueOnce(mockStartTime) // For constructor
      .mockReturnValueOnce(mockStartTime) // For constructor
      .mockReturnValueOnce(mockStartTime + 10000); // For _calculateRemainingTime (10 seconds later)
    
    const tracker = new ProgressTracker('Test Progress', 100);
    tracker.processedWords = 20; // 20% complete
    
    // At 20% complete after 10 seconds, it should take 40 more seconds to complete
    const remaining = tracker._calculateRemainingTime();
    expect(remaining).toBeCloseTo(40, 0); // Approximately 40 seconds
    
    // Restore original Date.now
    Date.now = originalNow;
  });

  test('should emit events when progress updates', () => {
    // Setup event listener
    const mockUpdateListener = jest.fn();
    progressTracker.on('update', mockUpdateListener);
    
    // Update progress
    progressTracker.update(50);
    
    // Check if event was emitted
    expect(mockUpdateListener).toHaveBeenCalledWith({
      processed: 50,
      total: 100,
      percentage: 50
    });
  });

  test('should emit finish event when complete', () => {
    // Setup event listener
    const mockFinishListener = jest.fn();
    progressTracker.on('finish', mockFinishListener);
    
    // Update progress to completion
    progressTracker.update(100);
    
    // Check if finish event was emitted
    expect(mockFinishListener).toHaveBeenCalled();
    expect(progressTracker.finished).toBe(true);
  });

  test('should log progress at appropriate intervals', () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const startTime = 1000;
    
    Date.now = jest.fn()
      .mockReturnValueOnce(startTime) // Start time in constructor
      .mockReturnValueOnce(startTime) // Last update time in constructor
      .mockReturnValueOnce(startTime + 1500); // Current time in _logProgress (1.5s after start)
    
    progressTracker.update(30);
    
    // Should log progress since more than 1s (default interval) has passed
    expect(mockConsole.log).toHaveBeenCalled();
    expect(mockConsole.log.mock.calls[0][0]).toContain('Test Progress');
    expect(mockConsole.log.mock.calls[0][0]).toContain('30/100');
    
    // Restore original Date.now
    Date.now = originalNow;
  });

  test('should not log progress if interval has not passed', () => {
    // Mock Date.now to return the same time
    const originalNow = Date.now;
    const fixedTime = 1000;
    
    Date.now = jest.fn().mockReturnValue(fixedTime);
    
    progressTracker.update(10);
    
    // Should not log progress since no time has passed
    expect(mockConsole.log).not.toHaveBeenCalled();
    
    // Restore original Date.now
    Date.now = originalNow;
  });

  test('should handle zero total correctly', () => {
    const zeroTracker = new ProgressTracker('Zero Test', 0);
    
    // Update should not throw errors
    zeroTracker.update(0);
    
    // Percentage should be 100% when total is 0
    expect(zeroTracker._calculatePercentage()).toBe(100);
  });

  test('should return correct formatted time string', () => {
    // Test various time durations
    expect(progressTracker._formatTime(65)).toBe('1m 5s');
    expect(progressTracker._formatTime(3661)).toBe('1h 1m 1s');
    expect(progressTracker._formatTime(86400)).toBe('24h 0m 0s');
    expect(progressTracker._formatTime(30)).toBe('30s');
  });
}); 