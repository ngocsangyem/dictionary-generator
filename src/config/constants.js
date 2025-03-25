// eslint-disable-next-line no-unused-vars
const path = require('path');
const os = require('os');

// Directory structure
const DIRECTORIES = {
  ROOT: '.',
  DATA: './data',
  OUTPUT: './output',
  CHUNKS: './output/chunks',
  PROGRESS: './output/progress',
  MERGED: './output/merged',
  CONFIG: './config',
  LOGS: './logs',
  TEST: './tests/results'
};

// Processing configuration
const CONFIG_FILE = 'prompt_config.json';
const NUM_WORKERS = os.cpus().length;
const BATCH_SIZE = 28;

// Delay configuration for API calls
const DELAY_CONFIG = {
  INITIAL_DELAY: 15000,        // 15 seconds between normal requests
  RETRY_DELAY: 45000,          // 45 seconds after an error
  RATE_LIMIT_DELAY: 120000,    // 2 minutes if we hit rate limit
  EMPTY_RESULT_DELAY: 30000,   // 30 seconds if we get empty result
  MAX_RETRIES: 7               // Increase max retries
};

// Default prompt configuration
const defaultPromptConfig = {
  task: 'dictionary_generation',
  version: '1.0',
  schema: {
    Meaning: {
      // eslint-disable-next-line camelcase
      speech_part: 'string',
      defs: {
        tran: 'string',
        examples: 'string[]',
        synonyms: 'string[]',
        antonyms: 'string[]'
      }
    },
    Word: {
      word: 'string',
      meanings: 'Meaning[]',
      phonetics: {
        type: 'string',
        ipa: 'string'
      }
    }
  },
  instructions: {
    examples: 'More than two examples per definition',
    highlighting: 'Use **word** format in examples',
    // eslint-disable-next-line camelcase
    empty_arrays: 'Leave empty arrays for missing synonyms/antonyms'
  },
  // eslint-disable-next-line camelcase
  prompt_template: `Create a comprehensive dictionary in JSON format, detailing the words provided. For each word, include its full part of speech (e.g., adjective, verb, noun, word form), IPA pronunciation (both US and UK), and a set of meanings. Each meaning should have a Vietnamese translation and example sentences. The JSON structure should adhere to the following schema:
interface Meaning {
    speech_part: string;
    defs: {
        tran: string;
        examples: string[]; // More than two examples
       synonyms: string[];
       antonyms: string[]
    }[];
}

interface Word {
    [key: string]: {
        word: string;
        meanings: Meaning[];
        phonetics: {
           type: string;
           ipa: string;
      }[];
    };
}

Note: If can not find any antonyms or synonyms, just leave it empty array. In each example sentence, you should use the word in context (definition and speech part), and highlight the word in **word** to render it in markdown. Ex: **go** is a noun.

IMPORTANT: Please ensure your response is a complete, valid JSON object. Do not truncate or cut off the response. The response should start with { and end with }. Include all words in the list with their complete data.

The words to be defined are: {words}.`,
  // eslint-disable-next-line camelcase
  retry_prompt_template: `I notice the previous response was incomplete. Please provide a complete JSON response for the following words. Make sure to:
1. Start with { and end with }
2. Include all words in the list
3. Provide complete data for each word
4. Do not truncate the response

The words to be defined are: {words}.`
};

module.exports = {
  DIRECTORIES,
  CONFIG_FILE,
  NUM_WORKERS,
  BATCH_SIZE,
  DELAY_CONFIG,
  defaultPromptConfig
}; 