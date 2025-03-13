const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const settings = require('../../config/settings');
const fs = require('fs').promises;

const router = express.Router();

router.get('/settings', asyncHandler(async (req, res) => {
    const currentSettings = await fs.readFile('settings.cfg', 'utf8');
    const settings = {};

    currentSettings.split('\n').forEach(line => {
        if (line.trim()) {
            const [key, value] = line.split('=');
            settings[key] = value.replace(/"/g, '');
        }
    });

    res.json(settings);
}));

router.post('/settings', asyncHandler(async (req, res) => {
    const success = await settings.updateSettings(req.body);
    if (success) {
        res.json({ success: true });
    } else {
        throw new Error('Failed to update settings');
    }
}));

router.post('/settings/restore', asyncHandler(async (req, res) => {
    const success = await settings.restoreDefaults();
    if (success) {
        res.json({ success: true });
    } else {
        throw new Error('Failed to restore defaults');
    }
}));

module.exports = router;