const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const net = require('net');

const router = express.Router();

router.post('/ssh/check', asyncHandler(async (req, res) => {
    const { ip, port, user } = req.body;
    console.log('[Server] Checking SSH connection:', { ip, port, user });

    const checkConnection = () => {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            socket.setTimeout(3000);

            socket.on('connect', () => {
                console.log(`[Server] SSH connection successful to ${ip}:${port}`);
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                console.log(`[Server] SSH connection timeout to ${ip}:${port}`);
                socket.destroy();
                resolve(false);
            });

            socket.on('error', (error) => {
                console.log(`[Server] SSH connection error to ${ip}:${port}:`, error.message);
                socket.destroy();
                resolve(false);
            });

            console.log(`[Server] Attempting SSH connection to ${ip}:${port}`);
            socket.connect({
                host: ip,
                port: port
            });
        });
    };

    const isConnected = await checkConnection();

    if (isConnected) {
        console.log(`[Server] SSH check successful: ${ip}:${port}`);
        res.json({ success: true });
    } else {
        console.log(`[Server] SSH check failed: ${ip}:${port}`);
        res.json({
            success: false,
            error: 'Connection failed'
        });
    }
}));

router.post('/ssh/command', asyncHandler(async (req, res) => {
    const { deviceId, command } = req.body;

    try {
        const checkInterface = async (iface) => {
            try {
                const { stdout } = await execAsync(`adb -s ${deviceId} shell ip addr show ${iface}`);
                if (stdout.includes('state UP')) {
                    const ipMatch = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
                    return ipMatch ? ipMatch[1] : null;
                }
                return null;
            } catch (error) {
                if (error.message.includes(`Device "${iface}" does not exist`)) {
                    console.warn(`[Server] Interface ${iface} does not exist on device ${deviceId}`);
                    return null;
                }
                throw error;
            }
        };

        const eth0IP = await checkInterface('eth0');
        const wlan0IP = await checkInterface('wlan0');

        if (!eth0IP && !wlan0IP) {
            return res.status(400).json({ success: false, error: 'No active network interfaces found' });
        }

        const activeInterface = eth0IP ? 'eth0' : 'wlan0';
        const updatedCommand = command.replace(/eth0|wlan0/, activeInterface);

        console.log('[Server] Executing SSH command:', updatedCommand);
        const { stdout, stderr } = await execAsync(updatedCommand);

        if (stderr) {
            console.warn('[Server] SSH command stderr:', stderr);
        }

        res.json({
            success: true,
            output: stdout.trim()
        });
    } catch (error) {
        console.error('[Server] SSH command failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}));

module.exports = router;