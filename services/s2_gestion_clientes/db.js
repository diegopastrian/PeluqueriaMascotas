// db.js
const { Pool } = require('pg');
require('dotenv').config()

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
    password: 'Monita315@',
    port: 5432,
});

module.exports = { pool };