const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const { Device } = require('../deviceUtils');

const router = express.Router();

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.originalname.match(/\.(apk|apex)$/)) {
        cb(null, true);
    } else {
        cb(new Error('Only .apk and .apex files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

router.post('/install', upload.single('apk'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new Error('No file uploaded or invalid file type');
    }

    const { deviceId } = req.body;
    const device = new Device(deviceId);

    const fullPath = path.join(process.cwd(), req.file.path);
    const command = device.formatCommand(`install "${fullPath}"`);
    console.log('[Server] Install command:', command);

    const { stdout, stderr } = await execAsync(command);

    await fs.unlink(fullPath);

    if (stderr && !stderr.includes('Success')) {
        throw new Error(stderr);
    }

    res.json({ success: true });
}));

module.exports = router;