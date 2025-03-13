const express = require('express');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));
app.use(express.static('public'));

// Import routes
const settingsRoutes = require('./routes/settings');
const adbRoutes = require('./routes/adb');
const deviceRoutes = require('./routes/device');
const displayRoutes = require('./routes/display');
const fastbootRoutes = require('./routes/fastboot');
const scanRoutes = require('./routes/scan');
const installRoutes = require('./routes/install');
const sshRoutes = require('./routes/ssh');

// Use routes
app.use('/api', settingsRoutes);
app.use('/api', adbRoutes);
app.use('/api', deviceRoutes);
app.use('/api', displayRoutes);
app.use('/api', fastbootRoutes); 
app.use('/api', scanRoutes);
app.use('/api', installRoutes);
app.use('/api', sshRoutes);

app.use(errorHandler);

module.exports = app;