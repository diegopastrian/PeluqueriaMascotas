const express = require('express');
const { SERVICE_NAME_CODE, HEALTH_PORT } = require('./config');

function startHealthCheck() {
    const healthApp = express();
    healthApp.get('/health', (req, res) => {
        res.status(200).send(`${SERVICE_NAME_CODE} service is active and connected to bus.`);
    });
    healthApp.listen(HEALTH_PORT, () => {
    });
}

module.exports = { startHealthCheck };