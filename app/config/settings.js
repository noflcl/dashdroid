const fs = require('fs');
const path = require('path');

const defaultSettings = {
    // serverPort: "3000",
    forceFullscreen: "false",
    screenSize: "auto",
    forceOrientation: "none",
    alwaysOnTop: "false",
    disableScreensaver: "false"
};

function getServerPort() {
    const configPath = path.join(__dirname, '..', 'settings.cfg');
    const config = fs.readFileSync(configPath, 'utf8');
    const portMatch = config.match(/PORT=(\d+)/);
    if (portMatch) {
        return parseInt(portMatch[1], 10);
    }
    // return 3000; // Default port if not specified in settings.cfg
}

function getAllSettings() {
    try {
        const content = fs.readFileSync(path.join(__dirname, '..', 'settings.cfg'), 'utf8');
        const settings = {};

        content.split('\n').forEach(line => {
            if (line.trim()) {
                const [key, value] = line.split('=');
                settings[key] = value.replace(/"/g, '');
            }
        });

        return settings;
    } catch (error) {
        console.warn('Failed to read settings.cfg, using defaults');
        return defaultSettings;
    }
}

function updateSettings(newSettings) {
    try {
        const configPath = path.join(__dirname, '..', 'settings.cfg');
        const currentContent = fs.readFileSync(configPath, 'utf8');
        const lines = currentContent.split('\n');

        Object.entries(newSettings).forEach(([key, value]) => {
            const lineIndex = lines.findIndex(line => line.startsWith(`${key}=`));
            if (lineIndex !== -1) {
                lines[lineIndex] = `${key}="${value}"`;
            }
        });

        fs.writeFileSync(configPath, lines.join('\n'));
        return true;
    } catch (error) {
        console.error('Failed to update settings:', error);
        return false;
    }
}

function restoreDefaults() {
    try {
        const configPath = path.join(__dirname, '..', 'settings.cfg');
        const content = Object.entries(defaultSettings)
            .map(([key, value]) => `${key}="${value}"`)
            .join('\n');

        fs.writeFileSync(configPath, content);
        return true;
    } catch (error) {
        console.error('Failed to restore defaults:', error);
        return false;
    }
}

function buildScrcpyCommand(deviceId) {
    try {
        const settings = getAllSettings();
        let command = `scrcpy -s ${deviceId}`;

        // Add flags based on settings
        if (settings.forceFullscreen === 'true') {
            command += ' --fullscreen';
        }

        if (settings.alwaysOnTop === 'true') {
            command += ' --always-on-top';
        }

        if (settings.screenSize !== 'auto') {
            const [width, height] = settings.screenSize.split('x');
            command += ` --window-width=${width} --window-height=${height}`;
        }

        if (settings.forceOrientation === 'portrait') {
            command += ' --orientation=0';
        } else if (settings.forceOrientation === 'landscape') {
            command += ' --orientation=90';
        }

        if (settings.disableScreensaver === 'true') {
            command += ' --disable-screensaver';
        }

        return command;
    } catch (error) {
        console.error('Failed to build scrcpy command:', error);
        return `scrcpy -s ${deviceId}`; // Return basic command if error
    }
}

module.exports = {
    getServerPort,
    getAllSettings,
    updateSettings,
    restoreDefaults,
    buildScrcpyCommand,
    defaultSettings
};