// db.js
const { Pool } = require('pg');
require('dotenv').config()

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
<<<<<<< HEAD
    password: '1302',
=======
    password: '@password',
>>>>>>> 14bbab3 (poner datos de sus bases)
    port: 5432,
});

module.exports = { pool };