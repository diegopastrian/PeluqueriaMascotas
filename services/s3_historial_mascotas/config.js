// services/s3_historial_mascotas/config.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.global') });

module.exports = {
    SERVICE_CODE: 'HISTR',
    SERVICE_NAME_CODE: 'HISTR',
    BUS_HOST: 'localhost',
    BUS_PORT: 5000,
    HEALTH_PORT: 3004,
    SECRET_KEY: process.env.JWT_SECRET
};