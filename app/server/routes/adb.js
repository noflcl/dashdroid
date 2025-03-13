const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { Device } = require('../deviceUtils');

const router = express.Router();

let adbInitialized = false;

router.get('/adb/status', asyncHandler(async (req, res) => {
    if (!adbInitialized) {
        await execAsync('adb start-server');
        adbInitialized = true;
    }
    res.json({ success: true, initialized: adbInitialized });
}));

router.get('/adb/devices', asyncHandler(async (req, res) => {
    const { stdout } = await execAsync('adb devices');
    const devices = stdout.split('\n')
        .filter(line => line && !line.includes('List of devices'))
        .map(line => line.trim())
        .filter(Boolean);

    res.json({ devices });
}));

router.post('/adb/connect', asyncHandler(async (req, res) => {
    const { command } = req.body;
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
        console.warn(`[Server] Device connection stderr:`, stderr);
    }
    res.json({ success: true, output: stdout });
}));

router.post('/adb/command', (req, res) => {
    const { deviceId, command } = req.body;

    if (!deviceId || !command) {
        return res.status(400).json({ success: false, error: 'Missing deviceId or command' });
    }

    const adbCommand = `adb -s ${deviceId} ${command}`;
    exec(adbCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`ADB command failed: ${stderr}`);
            return res.status(500).json({ success: false, error: stderr });
        }
        res.json({ success: true, output: stdout });
    });
});

router.post('/adb/package/start', asyncHandler(async (req, res) => {
    const { device, pkg, activity } = req.body;

    const startCommand = `adb -s ${device} shell am start -n ${pkg}/${activity}`;

    console.log('[Server] Starting package:', { device, pkg, activity });
    const { stdout, stderr } = await execAsync(startCommand);

    if (stderr) {
        console.warn('[Server] Package start stderr:', stderr);
    }

    res.json({ success: true, output: stdout });
}));

router.post('/adb/package/source', asyncHandler(async (req, res) => {
    const { deviceId, command } = req.body;
    console.log('[Server] Checking package source:', { deviceId, command });

    try {
        const { stdout } = await execAsync(command);
        console.log('[Server] Package found in Play Store');
        res.json({
            success: true,
            output: stdout,
            error: null
        });
    } catch (error) {
        if (error.code === 1) {
            console.log('[Server] Package not found in Play Store');
            res.json({
                success: true,
                output: '',
                error: null
            });
        } else {
            throw error;
        }
    }
}));

module.exports = router;