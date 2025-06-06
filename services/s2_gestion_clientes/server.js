// server.js
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/clientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes');
        res.json(result.rows);
        console.log("peticion realizada")
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la base de datos');
    }
});

app.listen(3002, () => {
    console.log('S2 autenticación escuchando en puerto 3002');
});
