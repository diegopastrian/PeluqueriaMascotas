// server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const {pool} = require('./db');

// Configuracion del Bus de Servicios
const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

// Codigo del servicio
const SERVICE_CODE = 'CATAL';
const SERVICE_NAME_CODE = 'CATAL'; // Nombre para logs

// Conexion al Bus
const serviceSocketToBus = new net.Socket();

// Funcion para enviar SINIT
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    console.log(`[${SERVICE_NAME_CODE}] Enviando transaccion de activacion: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);

    const onData = (data) => {
        const response = data.toString();
        console.log(`[${SERVICE_NAME_CODE}] Respuesta SINIT recibida: ${response}`);
        try {
            const parsed = parseResponse(response);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                console.log(`[${SERVICE_NAME_CODE}] Servicio ${SERVICE_CODE} activado correctamente`);
                serviceSocketToBus.removeListener('data', onData);
                callback(null);
            } else {
                console.error(`[${SERVICE_NAME_CODE}] Fallo en SINIT: ${response}`);
                serviceSocketToBus.removeListener('data', onData);
                callback(new Error(`Fallo en SINIT ${SERVICE_CODE}: ${response}`));
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error parseando SINIT: ${error.message}`);
            serviceSocketToBus.removeListener('data', onData);
            callback(error);
        }
    };

    serviceSocketToBus.on('data', onData);
}

serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[${SERVICE_NAME_CODE}] Conectado al Bus en ${BUS_HOST}:${BUS_PORT}`);
    sendSinit((error) => {
        if (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error durante la activacion: ${error.message}`);
            serviceSocketToBus.destroy();
            return;
        }
        console.log(`[${SERVICE_NAME_CODE}] Listo para procesar transacciones`);
    });
});

serviceSocketToBus.on('data', (data) => {
    const rawData = data.toString();
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];
    for (const message of messages) {
        if (message.length < 10) continue;
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${message}`);

        try {
            const parsed = parseResponse(message);

            if (parsed.serviceName === 'sinit') continue;

            if (parsed.serviceName !== SERVICE_CODE) {
                console.log(`[${SERVICE_NAME_CODE}] Servicio desconocido: ${parsed.serviceName}`);
                const errorResponse = buildTransaction(SERVICE_CODE, `Servicio incorrecto`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const fields = parsed.data.split(';');
            if (fields.length < 1) {
                const errorResponse = buildTransaction(SERVICE_CODE, `Formato invalido: Se espera operacion`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const operation = fields[0];
            console.log(`[${SERVICE_NAME_CODE}] Procesando operacion: ${operation}`);

            // --- Registrar Producto ---
            if (operation === 'registrar') {
                if (fields.length !== 5) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Formato invalido: registrar;nombre;descripcion;precio;stock`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const [, nombre, descripcion, precio, stock] = fields;

                if (!nombre || !descripcion || !precio || !stock) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Todos los campos son obligatorios`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                pool.query(
                    `INSERT INTO productos (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING id_producto`,
                    [nombre, descripcion, parseFloat(precio), parseInt(stock)],
                    (err, result) => {
                        if (err) {
                            const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Error al insertar producto`);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        const response = buildTransaction(SERVICE_CODE, `registrar;${result.rows[0].id_producto}`);
                        serviceSocketToBus.write(response);
                    }
                );
            }

            // --- Listar Productos ---
            else if (operation === 'listar') {
                pool.query('SELECT id_producto, nombre, precio, stock FROM productos', (err, result) => {
                    if (err) {
                        const errorResponse = buildTransaction(SERVICE_CODE, `listar;Error al obtener productos`);
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    const productos = result.rows.map(p => `${p.id_producto},${p.nombre},${p.precio},${p.stock}`).join('|');
                    const response = buildTransaction(SERVICE_CODE, `listar;${productos}`);
                    serviceSocketToBus.write(response);
                });
            }

            // --- Obtener Producto por ID ---
            else if (operation === 'obtener') {
                if (fields.length !== 2) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `obtener;Formato invalido: obtener;id_producto`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const id = parseInt(fields[1]);

                pool.query('SELECT * FROM productos WHERE id_producto = $1', [id], (err, result) => {
                    if (err || result.rows.length === 0) {
                        const errorResponse = buildTransaction(SERVICE_CODE, `obtener;Producto no encontrado`);
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    const p = result.rows[0];
                    const responseData = `obtener;${p.id_producto};${p.nombre};${p.descripcion};${p.precio};${p.stock}`;
                    const response = buildTransaction(SERVICE_CODE, responseData);
                    serviceSocketToBus.write(response);
                });
            }

            else {
                const errorResponse = buildTransaction(SERVICE_CODE, `${operation};Operacion desconocida`);
                serviceSocketToBus.write(errorResponse);
            }
        } catch (error) {
            const errorResponse = buildTransaction(SERVICE_CODE, `error;${error.message}`);
            serviceSocketToBus.write(errorResponse);
        }
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${SERVICE_NAME_CODE}] Conexion cerrada`);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${SERVICE_NAME_CODE}] Error: ${err.message}`);
});

// Health check opcional
const express = require('express');
const healthApp = express();
const HEALTH_PORT = 3007;
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${SERVICE_NAME_CODE} service is active and connected to bus`);
});
healthApp.listen(HEALTH_PORT, () => {
    console.log(`[${SERVICE_NAME_CODE}] Health check en http://localhost:${HEALTH_PORT}/health`);
});

console.log(`[${SERVICE_NAME_CODE}] Iniciando servicio...`);

// API REST opcional para debug o conexion directa
const app = express();
app.use(express.json());

app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la base de datos');
    }
});

app.listen(3007, () => {
    console.log('S3 catalogo escuchando en puerto 3004');
});
