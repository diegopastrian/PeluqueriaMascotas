// db.js
const { Pool } = require('pg');
require('dotenv').config()

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
    password: '1302',
    port: 5432,
});

module.exports = { pool };