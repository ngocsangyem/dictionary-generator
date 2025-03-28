# Changelog

All notable changes to the Dictionary Generation Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-04-01

### Added
- Added support for DeepSeek model as an alternative to Gemini
- Created model handler system with base class and specific implementations
- Added model configuration settings for different AI providers
- Implemented response format normalization across different models
- Added comprehensive unit tests for multi-model support
- Added integration tests for token optimization strategy
- Created detailed documentation for model integration
- Created comprehensive test suite for model handlers with coverage for all model types
- Added robust tests for API utilities including prompt generation and retry mechanisms
- Added npm scripts for running specific test suites: `test:model-utils` and `test:api-utils`
- Added dedicated unit test scripts: `test:unit:model-utils`, `test:unit:api-utils`, `test:unit:all`
- Added integration test script: `test:integration:all`
- Improved test mocking for API utilities to ensure proper isolation between tests
- Fixed state persistence issues in integration tests by implementing proper reset functions

### Changed
- Refactored API interaction to use a modular model handler system
- Updated configuration to support multiple AI models
- Enhanced error handling for different API providers
- Added axios dependency for DeepSeek API integration
- Restructured tests to better validate model switching
- Improved test coverage for model handlers and API utilities
- Enhanced test reliability by implementing better mock isolation
- Fixed test failures due to shared state between test runs

## [1.3.5] - 2025-04-01

### Added
- Optimized prompt handling to reduce token usage after initial requests
- Added tracking of request counts to determine when to use abbreviated prompts
- Implemented smart fallback mechanism to use full prompt if abbreviated version fails

### Changed
- After first 3 successful requests, system now uses abbreviated prompts for token efficiency
- Enhanced error handling to gracefully handle failures with abbreviated prompts
- Improved logging to show which prompt type is being used

## [1.3.4] - 2025-04-01

### Changed
- Simplified API response validation to only check top-level structure
- Removed detailed validation of definition fields to allow more flexible responses

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