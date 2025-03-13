const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { scanSubnetForPort } = require('../scanLan');

const router = express.Router();

router.post('/scan', asyncHandler(async (req, res) => {
    const { subnet, port } = req.body;
    if (!subnet || !port) {
        return res.status(400).json({ error: 'Missing subnet or port' });
    }
    const devices = await new Promise((resolve) => {
        scanSubnetForPort(subnet, port, (openDevices) => {
            resolve(openDevices);
        });
    });
    res.json({ devices });
}));

module.exports = router;