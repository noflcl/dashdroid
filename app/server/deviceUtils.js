const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const DeviceTypes = {
    NET: 'network',
    USB: 'usb'
};

class Device {
    constructor(identifier) {
        this.identifier = identifier;
        this.type = this.determineType(identifier);
    }

    determineType(identifier) {
        return this.isNetworkDevice(identifier) ? DeviceTypes.NET : DeviceTypes.USB;
    }

    isNetworkDevice(identifier) {
        return identifier.includes(':');
    }

    isUsbDevice(identifier) {
        return /^[A-Z0-9]{14}$/.test(identifier);
    }

    connect() {
        if (this.type === DeviceTypes.NET) {
            return `adb connect ${this.identifier}`;
        }
        return null; // USB devices don't need connect command
    }

    formatCommand(command) {
        if (this.type === DeviceTypes.NET) {
            // No quotes for network devices (ip:port)
            return `adb -s ${this.identifier} ${command}`;
        } else {
            // Keep quotes for USB serial numbers
            return `adb -s "${this.identifier}" ${command}`;
        }
    }

    formatScrcpyCommand(options = {}) {
        const baseCommand = `scrcpy -s ${this.deviceId} --window-title='${this.deviceId}'`;
        if (options.startApp) {
            return `${baseCommand} --start-app=${options.startApp}`;
        }
        return baseCommand;
    }

    async getVersionInfo() {
        try {
            const versionCmd = this.formatCommand('shell getprop ro.build.version.release');
            const patchCmd = this.formatCommand('shell getprop ro.build.version.security_patch');

            console.log('Executing commands:', {
                version: versionCmd,
                patch: patchCmd
            });

            const { stdout: version } = await execAsync(versionCmd);
            const { stdout: patch } = await execAsync(patchCmd);

            return {
                version: version.trim(),
                patch: patch.trim()
            };
        } catch (error) {
            console.error('Command execution error:', error);
            throw new Error(`Failed to get version info: ${error.message}`);
        }
    }
}

// Helper functions
function createDeviceCommand(identifier, command) {
    const device = new Device(identifier);
    return device.formatCommand(command);
}

function validateDeviceIdentifier(identifier) {
    const device = new Device(identifier);
    return {
        isValid: device.isNetworkDevice(identifier) || device.isUsbDevice(identifier),
        type: device.type
    };
}

module.exports = {
    Device,
    DeviceTypes,
    createDeviceCommand,
    validateDeviceIdentifier
};
