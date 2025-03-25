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

const dataExample = `
  \`\`\`json
{
  "go": {
    "word": "go",
    "meanings": [
      {
        "speech_part": "verb",
        "defs": [
          {
            "tran": "di chuyển từ nơi này đến nơi khác",
            "en_def": "to move from one place to another",
            "examples": [
              "I **go** to school every day.",
              "They **go** to the park on weekends.",
              "She **goes** to work by bus."
            ],
            "synonyms": ["travel", "move"],
            "antonyms": ["stay", "remain"]
          },
          {
            "tran": "trở nên, trở thành",
            "en_def": "to become",
            "examples": [
              "The milk **went** bad.",
              "He **went** crazy after the accident.",
              "The lights **went** out."
            ],
            "synonyms": ["become", "turn"],
            "antonyms": []
          }
        ]
      },
      {
        "speech_part": "noun",
        "defs": [
          {
            "tran": "lượt, lần thử",
            "en_def": "a turn or attempt",
            "examples": [
              "It's your **go** now.",
              "He had a **go** at solving the puzzle.",
              "She took a **go** on the swing."
            ],
            "synonyms": ["turn", "attempt"],
            "antonyms": []
          }
        ]
      }
    ],
    "phonetics": [
      {
        "type": "US",
        "ipa": "/ɡoʊ/"
      },
      {
        "type": "UK",
        "ipa": "/ɡəʊ/"
      }
    ]
  }
}
\`\`\``

// Default prompt configuration
const defaultPromptConfig = {
  task: "dictionary_generation",
  version: "1.3.0",
  schema: {
    Meaning: {
      speech_part: "string",
      defs: {
        tran: "string",
        en_def: "string",
        examples: "string[]",
        synonyms: "string[]",
        antonyms: "string[]"
      }
    },
    Word: {
      word: "string",
      meanings: "Meaning[]",
      phonetics: {
        type: "string",
        ipa: "string"
      }
    }
  },
  instructions: {
    examples: "At least three examples per definition",
    highlighting: "Highlight the target word in examples using **word**, including inflected forms",
    empty_arrays: "Leave empty arrays for missing synonyms/antonyms",
    phonetics: "Include both US and UK pronunciations when available"
  },
  // eslint-disable-next-line camelcase
  prompt_template: `Act as an English teacher preparing materials for IELTS students. Create a comprehensive dictionary in JSON format for the given list of words. For each word, include:

- An array of meanings, where each meaning corresponds to a different part of speech (e.g., noun, verb, adjective). Each meaning should include:
  - The part of speech
  - An array of definitions, each containing:
    - A Vietnamese translation of the definition
    - A English definition
    - At least two example sentences that use the word in context, with the word highlighted using **word** (or its inflected form, e.g., **goes**) for markdown rendering
    - An array of synonyms relevant to this definition (if any, otherwise an empty array)
    - An array of antonyms relevant to this definition (if any, otherwise an empty array)
- An array of phonetics, including:
  - One entry for US pronunciation with "type": "US" and "ipa": [IPA string]
  - One entry for UK pronunciation with "type": "UK" and "ipa": [IPA string]

The JSON structure should be an object where each key is a word from the list, and the value is an object containing "meanings" and "phonetics" as described.

**Example for the word "go":**

${dataExample}

The words to be defined are: {words}.
`,
  // eslint-disable-next-line camelcase
  retry_prompt_template: `The previous response was incomplete. Please provide a complete JSON response for all words in the list. Ensure that:
- The JSON object starts with { and ends with }.
- All words are included with their full data (meanings, phonetics, etc.).
- No information is truncated.
- Follow the structure and instructions provided previously.

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