# Dictionary Generator

A high-performance dictionary generation tool for IELTS students that creates comprehensive dictionary entries with English definitions, Vietnamese translations, example sentences, and more.

![Version](https://img.shields.io/badge/version-1.4.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green)

## Features

- Generate detailed dictionary entries with definitions, translations, and examples
- Support for multiple AI models (Gemini and DeepSeek)
- Parallel processing using Node.js worker threads
- Smart token usage optimization
- Automatic retries and rate limit handling
- Progress tracking and resumption
- Batch processing with validation
- Detailed logging

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/dictionary-generator.git
cd dictionary-generator
npm install
```

## Configuration

1. Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

2. Add your API keys:

```
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Optional settings
MODEL_TYPE=gemini  # or deepseek
```

## Usage

### Basic Commands

```bash
# Continue from last position
npm run continue

# Start fresh
npm run reset

# Display progress statistics
npm run count

# Test batch processing with single batch
npm test

# Merge chunk results
npm run merge

# Merge all chunks
npm run mergeall

# Cleanup temporary files
npm run cleanup
```

### Advanced Options

```bash
# Specify model type at runtime
node index.js continue --model=deepseek

# Set batch size and worker count
node index.js reset --batch=30 --workers=4
```

## AI Model Support

The system supports two AI models:

### Gemini

Google's Gemini model is the default option. To use it:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/)
2. Set `GEMINI_API_KEY` in your `.env` file
3. Run with `MODEL_TYPE=gemini` or omit for default

### DeepSeek

DeepSeek provides an alternative model with OpenAI-compatible API:

1. Get an API key from [DeepSeek](https://platform.deepseek.com/)
2. Set `DEEPSEEK_API_KEY` in your `.env` file
3. Run with `MODEL_TYPE=deepseek`

### Model Comparison

Use the provided example to compare models:

```bash
node examples/model-comparison.js
```

## Output Format

Dictionary entries follow this JSON structure:

```json
{
  "word": {
    "word": "example",
    "meanings": [
      {
        "speech_part": "noun",
        "defs": [
          {
            "en_def": "A representative form or pattern",
            "tran": "một hình thức hoặc mẫu đại diện",
            "examples": [
              "She provided an **example** to clarify her point.",
              "This serves as a good **example** of the style."
            ],
            "synonyms": ["sample", "specimen"],
            "antonyms": []
          }
        ]
      }
    ],
    "phonetics": [
      {
        "type": "US",
        "ipa": "/ɪɡˈzæmpəl/"
      },
      {
        "type": "UK",
        "ipa": "/ɪɡˈzɑːmpl/"
      }
    ]
  }
}
```

## Token Optimization

The system optimizes token usage by:

1. Using full prompts for first 3 requests to establish format
2. Switching to abbreviated prompts for subsequent requests
3. Falling back to full prompts if abbreviated ones fail
4. Using smart retry mechanisms

## Performance Considerations

- DeepSeek may have different token limits and pricing than Gemini
- Batch sizes and worker counts can be adjusted for performance
- Processing speed varies by model and word complexity

## Advanced Configuration

The system supports advanced configuration through `constants.js`:

```javascript
// Model configuration settings
MODEL_CONFIG = {
  DEFAULT_MODEL: 'gemini',
  AVAILABLE_MODELS: ['gemini', 'deepseek'],
  MODEL_SETTINGS: {
    gemini: {
      model: 'gemini-pro',
      maxTokens: 2048,
      temperature: 0.7
    },
    deepseek: {
      model: 'deepseek-chat',
      maxTokens: 2000,
      temperature: 0.7
    }
  }
};
```

## Extending with New Models

To add support for additional models:

1. Create a new handler class in `src/utils/modelUtils.js`
2. Add model configuration to `MODEL_CONFIG` in `src/config/constants.js`
3. Update the factory function in `modelUtils.js`

## Troubleshooting

- **API Key Errors**: Ensure correct keys are in `.env` file
- **Rate Limiting**: Adjust `DELAY_CONFIG` in `constants.js`
- **JSON Parsing Errors**: Check model responses in logs
- **Incomplete Results**: Try with smaller batch sizes
- **Memory Issues**: Reduce worker count

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request. 