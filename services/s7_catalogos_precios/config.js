const path = require('path');
const dotenv = require('dotenv')

dotenv.config({path: path.join(__dirname, './.env')})

module.exports = {
    BUS_HOST: process.env.BUS_HOST || 'localhost',
    BUS_PORT: process.env.BUS_PORT,
    SERVICE_CODE: process.env.SERVICE_CODE || '',
    SERVICE_NAME_CODE: process.env.SERVICE_NAME_CODE || '',
    SECRET_KEY: process.env.SECRET_KEY || '',
    HEALTH_PORT: process.env.HEALTH_PORT || '',
};