const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { Device } = require('../deviceUtils');

const router = express.Router();

router.get('/device/info/:deviceId', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const device = new Device(deviceId);
    const info = await device.getVersionInfo();
    res.json(info);
}));

router.get('/device/packages/:deviceId', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const device = new Device(deviceId);
    const command = device.formatCommand('shell "pm list packages | cut -f 2 -d :"');
    const { stdout } = await execAsync(command);
    const packages = stdout.split('\n').filter(pkg => pkg.trim());
    res.json({ packages });
}));

router.post('/device/cpu', asyncHandler(async (req, res) => {
    try {
        const { deviceId } = req.body;
        const device = new Device(deviceId);

        const loadCommand = device.formatCommand('shell dumpsys cpuinfo | head -n1 | cut -d " " -f2');
        const { stdout: loadValue } = await execAsync(loadCommand);
        console.log('[Server] CPU load:', loadValue);
        const cpuLoad = parseFloat(loadValue.trim());

        const infoCommand = device.formatCommand('shell dumpsys cpuinfo | tail -n +3 | head -n 10');
        const { stdout: infoOutput } = await execAsync(infoCommand);
        const cpuInfo = infoOutput.split('\n').filter(line => line.trim());

        res.json({
            load: cpuLoad,
            cpuInfo: cpuInfo
        });
    } catch (error) {
        console.error('[Server] CPU info failed:', error);
        res.status(500).json({ error: error.message });
    }
}));

router.post('/device/memory', asyncHandler(async (req, res) => {
    try {
        const { deviceId } = req.body;
        const device = new Device(deviceId);

        const totalCommand = device.formatCommand("shell cat /proc/meminfo | grep 'MemTotal'");
        const { stdout: totalStdout } = await execAsync(totalCommand);
        const memTotal = parseInt(totalStdout.match(/MemTotal:\s+(\d+)/)[1]);

        const availCommand = device.formatCommand("shell cat /proc/meminfo | grep 'MemAvailable'");
        const { stdout: availStdout } = await execAsync(availCommand);
        const memAvailable = parseInt(availStdout.match(/MemAvailable:\s+(\d+)/)[1]);

        console.log('[Server] Memory info:', {
            total: memTotal,
            available: memAvailable
        });

        res.json({
            total: memTotal,
            available: memAvailable
        });
    } catch (error) {
        console.error('[Server] Memory info failed:', error);
        res.status(500).json({ error: error.message });
    }
}));

router.post('/device/gpu', asyncHandler(async (req, res) => {
    try {
        const { deviceId } = req.body;
        const device = new Device(deviceId);

        const gpuCommand = device.formatCommand('shell dumpsys gpu | grep Global | cut -d " " -f3');
        const { stdout: gpuValue } = await execAsync(gpuCommand);
        const gpuMemory = parseInt(gpuValue.trim());

        console.log('[Server] GPU memory used:', gpuMemory);

        res.json({
            memory: gpuMemory
        });
    } catch (error) {
        console.error('[Server] GPU info failed:', error);
        res.status(500).json({ error: error.message });
    }
}));

module.exports = router;