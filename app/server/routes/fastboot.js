const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const router = express.Router();

router.get('/fastboot/devices', async (req, res) => {
  try {
    const { stdout } = await execAsync('fastboot devices');
    const devices = stdout.trim().split('\n').map(line => line.split('\t')[0]);
    res.json({ devices });
  } catch (error) {
    console.error('Failed to get fastboot devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/fastboot/command', async (req, res) => {
  const { deviceId, command } = req.body;

  if (!deviceId || !command) {
    return res.status(400).json({ success: false, error: 'Device ID and command are required' });
  }

  try {
    const { stdout } = await execAsync(command);
    res.json({ success: true, output: stdout });
  } catch (error) {
    console.error(`Failed to execute fastboot command: ${command} for device ${deviceId}`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;