const express = require('express');
const pool = require('./../../bus_service_helpers/db'); // importa conexión
const app = express();
const PORT = process.env.PORT || 3001;

// Probar conexión a la base de datos al iniciar
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error al conectar a la base de datos:', err.stack);
    }
    console.log('Conexión a la base de datos exitosa');
    release(); // liberar cliente de la pool
});

// Middleware y rutas
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servicio funcionando correctamente');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servicio escuchando en el puerto ${PORT}`);
});
