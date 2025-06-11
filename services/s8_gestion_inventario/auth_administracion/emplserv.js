const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const pool = require('./db');
const { registerUser, loginUser } = require('./auth_auxx.js');
require('dotenv').config();

// Configuración del Bus de Servicios
const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

// Código del servicio
const SERVICE_CODE = 'AUTEM';
const SERVICE_NAME_CODE = 'AUTH_EMPL';
//const JWT_SECRET = 'tu_clave_secreta_muy_segura';
 
// Conexión al Bus
const serviceSocketToBus = new net.Socket();

// ✅ Prueba inicial de conexión a la base de datos (comilla faltante corregida)
pool.query('SELECT 1 AS result')
    .then(res => console.log(`[${SERVICE_NAME_CODE}] Conexión a la base de datos exitosa: ${JSON.stringify(res.rows[0])}`))
    .catch(err => console.error(`[${SERVICE_NAME_CODE}] Error al conectar a la base de datos: ${err.message}`));

// Función para enviar SINIT
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    console.log(`[${SERVICE_NAME_CODE}] Enviando transacción de activacion: ${sinitTransaction}`);

    // ❌ Tenías comilla incorrecta aquí: serviceSocketToBus.write(sinitTransaction');
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
            console.error(`[${SERVICE_NAME_CODE}] Error durante la conexión: ${error.message}`);
            serviceSocketToBus.destroy();
            return;
        }
        console.log(`[${SERVICE_NAME_CODE}] Listo para procesar transacciones`);
    });
});

serviceSocketToBus.on('data', async (data) => {
    const rawData = data.toString();
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

    for (const message of messages) {
        if (message.length < 10) continue;
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${message}`);

        try {
            const parsed = parseResponse(message);
            console.log("esta wea es el parsedddddddddddddddddd" + parsed.serviceName);
            if (parsed.serviceName === 'sinit') continue;

            if (parsed.serviceName !== SERVICE_CODE) {
                console.log(`[${SERVICE_NAME_CODE}] Servicio desconocido: ${parsed.serviceName}`);
                const errorResponse = buildTransaction(SERVICE_CODE, `Servicio incorrecto`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const fields = parsed.data.split(';');
            console.log(`[${SERVICE_NAME_CODE}] Número de campos: ${fields.length}`);

            if (fields.length < 1) {
                const errorResponse = buildTransaction(SERVICE_CODE, `Formato invalido: Se espera operacion`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const operation = fields[0];
            console.log(`[${SERVICE_NAME_CODE}] Procesando operacion: ${operation} con datos: ${parsed.data}`);

            if (operation === 'registrar') {
                await registerUser(serviceSocketToBus, fields);
            } else if (operation === 'login') {
                await loginUser(serviceSocketToBus, fields);
            } else {
                const errorResponse = buildTransaction(SERVICE_CODE, `${operation};operacion desconocida`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error procesando: ${error.message}`);
            const errorResponse = buildTransaction(SERVICE_CODE, `error;${error.message.replace(/[^a-zA-Z0-9 ;,.]/g, '')}`);
            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
            serviceSocketToBus.write(errorResponse);
        }
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${SERVICE_NAME_CODE}] Conexión cerrada`);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${SERVICE_NAME_CODE}] Error: ${err.message}`);
});

// Healthcheck
const express = require('express');
const healthApp = express();
const HEALTH_PORT = 3003;
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${SERVICE_NAME_CODE} service is active and connected to bus`);
});
healthApp.listen(HEALTH_PORT, () => {
    console.log(`[${SERVICE_NAME_CODE}] Health check en http://localhost:${HEALTH_PORT}/health`);
});

// API HTTP (opcional si quieres exponer algo más en el futuro)
const app = express();
app.use(express.json());

app.listen(3004, () => {
    console.log(`[${SERVICE_NAME_CODE}] Autenticación escuchando en puerto 3004`);
});

console.log(`[${SERVICE_NAME_CODE}] Iniciando servicio...`);
