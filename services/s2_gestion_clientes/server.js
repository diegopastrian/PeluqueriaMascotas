// s2_gestion_clientes/server.js
// Su única misión es 
const net = require('net');
const express = require('express');
const { parseResponse, buildTransaction } = require('../../bus_service_helpers/transactionHelper'); // Ajusta la ruta

// --- 1. IMPORTACIONES CENTRALIZADAS ---
const config = require('./config');
const authHandler = require('./handlers/authHandler');
const preferenceHandler = require('./handlers/preferenceHandler');

const serviceSocketToBus = new net.Socket();

// --- 2. LÓGICA DE CONEXIÓN (se queda aquí) ---
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', config.SERVICE_CODE);
    console.log(`[${config.SERVICE_NAME_CODE}] Enviando SINIT: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);

    serviceSocketToBus.once('data', (data) => {
        // ... (La lógica de SINIT no cambia, solo usa 'config.')
        // ...
        callback(null);
    });
}

// --- 3. LISTENER PRINCIPAL (ahora es un enrutador) ---
serviceSocketToBus.on('data', (data) => {
    const rawData = data.toString();
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

    for (const message of messages) {
        try {
            if (message.length < 10) continue;
            console.log(`[${config.SERVICE_NAME_CODE}] Recibido: ${message}`);
            
            const parsed = parseResponse(message);
            if (parsed.serviceName !== config.SERVICE_CODE) continue;

            const fields = parsed.data.split(';');
            const operation = fields[0];
            console.log(`[${config.SERVICE_NAME_CODE}] Enrutando operación: ${operation}`);

            // --- EL ENRUTADOR ---
            switch (operation) {
                case 'registrar':
                    authHandler.handleRegister(fields, serviceSocketToBus);
                    break;
                case 'login':
                    authHandler.handleLogin(fields, serviceSocketToBus);
                    break;
                case 'PREFG':
                    preferenceHandler.handleSavePreference(fields, serviceSocketToBus);
                    break;
                case 'PREFL':
                    preferenceHandler.handleListPreferences(fields, serviceSocketToBus);
                    break;
                default:
                    console.warn(`[${config.SERVICE_NAME_CODE}] Operación desconocida: ${operation}`);
                    const response = buildTransaction(config.SERVICE_CODE, `${operation};Operacion desconocida`, 'NK');
                    serviceSocketToBus.write(response);
                    break;
            }
        } catch (error) {
            console.error(`[${config.SERVICE_NAME_CODE}] Error fatal procesando mensaje: ${error.message}`);
        }
    }
});


// --- 4. INICIO DEL SERVICIO (se queda aquí) ---
console.log(`[${config.SERVICE_NAME_CODE}] Iniciando servicio...`);
const healthApp = express();
healthApp.get('/health', (req, res) => res.status(200).send('OK'));
healthApp.listen(config.HEALTH_PORT, () => console.log(`Health check en http://localhost:${config.HEALTH_PORT}/health`));

serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST, () => {
    console.log(`[${config.SERVICE_NAME_CODE}] Conectado al Bus`);
    sendSinit((err) => {
        if (err) {
            console.error('Fallo en la activación del servicio.', err);
            serviceSocketToBus.destroy();
        } else {
            console.log(`[${config.SERVICE_NAME_CODE}] Listo para procesar transacciones.`);
        }
    });
});
serviceSocketToBus.on('close', () => console.log('Conexión con el Bus cerrada.'));
serviceSocketToBus.on('error', (err) => console.error('Error de conexión con el Bus:', err.message));