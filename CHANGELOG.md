# Changelog

All notable changes to the Dictionary Generation Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-03-25

### Added
- New command `mergeall preserve` to merge chunks while preserving progress information
- New command `complete` to ensure all chunks have final.json files
- New command `cleanup` to remove temporary files
- Enhanced `getTotalWordCount()` to check multiple sources for word count:
  - Progress files in output/progress/
  - Merged result file in output/merged/
  - Individual final.json files in chunks
- Better signal handling (SIGINT) for graceful shutdowns
- Improved recovery mechanisms for interrupted processes

### Fixed
- Fixed bug where chunk directories were deleted before merge completion
- Fixed issue with progress files not being properly saved
- Fixed path inconsistencies in file handling
- Fixed race condition in worker thread termination
- Added missing checks for directory existence

### Changed
- Standardized all file paths to use output/ directory
- Improved error reporting and logging
- Better progress tracking with more detailed statistics
- More robust merging process with validation
- Updated documentation to reflect new file structure

## [1.0.0] - 2025-03-25

### Added
- Initial release
- Parallel processing using Node.js worker threads
- Rate limit handling with configurable delays
- Progress tracking and resumption
- Batch processing with automatic retries
- JSON validation
- Detailed logging
- Command-line interface with multiple modes:
  - continue: Resume from last position
  - reset: Start fresh
  - merge: Combine chunk results
  - count: Display progress statistics
  - test: Process a single batch 