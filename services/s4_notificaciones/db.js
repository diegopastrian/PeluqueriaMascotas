// db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
    password: '1234', // Tu contraseña de PostgreSQL
    port: 5432,
});

module.exports = pool;