const fs = require('fs');
const path = require('path');
const { CONFIG_FILE, DIRECTORIES, defaultPromptConfig } = require('./constants');

/**
 * Save prompt configuration to file
 */
function savePromptConfig(config) {
    const configPath = path.join(DIRECTORIES.CONFIG, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Load prompt configuration from file or use default
 */
function loadPromptConfig() {
    const configPath = path.join(DIRECTORIES.CONFIG, CONFIG_FILE);
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        console.log('No existing config found, using default configuration');
    }
    return defaultPromptConfig;
}

module.exports = {
    savePromptConfig,
    loadPromptConfig
}; 