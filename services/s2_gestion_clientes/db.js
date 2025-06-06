// db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
    password: 'Araya123',
    port: 5432,
});

module.exports = pool;
