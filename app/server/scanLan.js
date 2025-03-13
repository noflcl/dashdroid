// server/scanLan.js
const net = require('net');

function scanSubnetForPort(subnet, port = 5555, callback) {
    const [subnetBase, subnetMask] = subnet.split('/');
    const subnetParts = subnetBase.split('.').map(Number);
    const mask = parseInt(subnetMask, 10);
    const maxHosts = Math.pow(2, 32 - mask) - 2;

    const openDevices = [];
    let completed = 0;

    for (let i = 1; i <= maxHosts; i++) {
        const ip = `${subnetParts[0]}.${subnetParts[1]}.${subnetParts[2]}.${subnetParts[3] + i}`;

        const socket = new net.Socket();
        socket.setTimeout(200);

        socket.on('connect', () => {
            openDevices.push(ip);
            socket.destroy();
        });

        socket.on('timeout', () => {
            socket.destroy();
        });

        socket.on('error', () => {
            socket.destroy();
        });

        socket.on('close', () => {
            completed++;
            if (completed === maxHosts) {
                callback(openDevices);
            }
        });

        socket.connect(port, ip);
    }
}

module.exports = { scanSubnetForPort };
