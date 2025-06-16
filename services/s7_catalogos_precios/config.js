const path = require('path');
const dotenv = require('dotenv')

dotenv.config({path: path.join(__dirname, './.env')})

module.exports = {
    BUS_HOST: process.env.BUS_HOST || 'localhost',
    BUS_PORT: process.env.BUS_PORT || 5000,
    SERVICE_CODE: process.env.SERVICE_CODE || 'CATPS',
    SERVICE_NAME_CODE: process.env.SERVICE_NAME_CODE || 'CATPS',
    SECRET_KEY: process.env.SECRET_KEY || 'tu_clave_secreta_muy_segura',
    HEALTH_PORT: process.env.HEALTH_PORT || '3001',
};