# Changelog

All notable changes to the Dictionary Generation Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.3] - 2025-04-01

### Fixed
- Added validation check to ensure API responses include the `en_def` field for all definitions
- Enhanced validation logic to verify complete definition structure with all required fields
- Fixed issue where incomplete definitions were being accepted without required fields

## [1.3.2] - 2025-04-01

### Added
- Emphasized the `en_def` field in the schema to ensure all dictionary entries include English definitions
- Enhanced prompt instructions to prioritize English definitions along with translations

## [1.3.1] - 2025-04-01

### Changed
- Improved prompt template for english definition

## [1.3.0] - 2025-04-01

### Added
- Added `getProgress()` method to ProgressTracker class to fix "tracker.getProgress is not a function" error

### Changed
- Improved prompt template for better dictionary generation results
- Enhanced prompt instructions for more accurate word definitions
- Updated example format in prompt to improve result consistency
- Fixed inconsistencies in prompt configuration

## [1.2.0] - 2025-03-30

### Added
- CI/CD integration with GitHub Actions
  - Automated test workflows for Node.js 14.x, 16.x, and 18.x
  - Code quality checks with ESLint
  - Code coverage reporting with Coveralls
  - Status badges in README
- Comprehensive unit tests for all major modules
- ESLint configuration for standardized code style
- New npm scripts:
  - `lint`: Run ESLint to check code quality
  - `lint:fix`: Automatically fix ESLint issues
  - `test:coverage`: Generate coverage reports in lcov format

### Changed
- Updated test coverage configuration to include lcov reports
- Enhanced documentation with testing information and badges
- Package.json updates to support CI/CD workflows

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