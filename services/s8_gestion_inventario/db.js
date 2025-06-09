const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'peluqueria_db',
    password: 'miholi123',
    port: 5432,
});

// Prueba de conexión al iniciar
pool.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error al conectar con PostgreSQL:', err.message);
    });

module.exports = pool;
