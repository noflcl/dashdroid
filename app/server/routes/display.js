const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const router = express.Router();

async function checkWindowExists(deviceId) {
    try {
        const command = `wmctrl -l | grep "${deviceId}"`;
        const { stdout } = await execAsync(command);

        const windowFound = stdout.trim().length > 0;
        console.log('[Server] Window search result:', { deviceId, found: windowFound });

        return windowFound;
    } catch (error) {
        if (error.code === 1) {
            return false;
        }
        console.error('[Server] Window check failed:', error);
        return false;
    }
}

router.post('/display', async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    try {
        const windowExists = await checkWindowExists(deviceId);
        if (windowExists) {
            exec(`wmctrl -a ${deviceId}`);
            return res.json({ success: true, message: 'Window activated' });
        }

        const command = `scrcpy -s ${deviceId} --window-title='${deviceId}'`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to start display: ${stderr}`);
                return res.status(500).json({ success: false, error: stderr });
            }
            res.json({ success: true, output: stdout });
        });
    } catch (error) {
        console.error('Error handling display request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;