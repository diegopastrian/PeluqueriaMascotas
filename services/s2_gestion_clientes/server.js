// s2_gestion_clientes/server.js

const net = require('net');
const express = require('express');
const { parseResponse, buildTransaction } = require('../../bus_service_helpers/transactionHelper'); // Ajusta la ruta si es necesario

// --- 1. IMPORTACIONES CENTRALIZADAS ---
// Importamos la configuración y los manejadores de lógica de negocio.
const config = require('./config');
const authHandler = require('./handlers/authHandler');
const preferenceHandler = require('./handlers/preferenceHandler');
const petHandler = require('./handlers/petHandler');

const serviceSocketToBus = new net.Socket();

// --- 2. LÓGICA DE CONEXIÓN (se queda aquí) ---
/**
 * Envía la transacción SINIT al Bus para registrar el servicio y maneja la respuesta inicial.
 * @param {(err: Error | null) => void} callback - Función a llamar después de la respuesta SINIT.
 */
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', config.SERVICE_CODE);
    console.log(`[${config.SERVICE_NAME_CODE}] Enviando SINIT: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);

    // Escucha la respuesta del bus solo para SINIT, una sola vez.
    serviceSocketToBus.once('data', (data) => {
        const responseStr = data.toString();
        try {
            const parsed = parseResponse(responseStr);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                console.log(`[${config.SERVICE_NAME_CODE}] Servicio ${config.SERVICE_CODE} activado correctamente.`);
                callback(null);
            } else {
                callback(new Error(`Fallo en SINIT: ${responseStr}`));
            }
        } catch (error) {
            callback(new Error(`Error parseando respuesta SINIT: ${error.message}`));
        }
    });
}

// --- 3. LISTENER PRINCIPAL (ahora es un enrutador) ---
// Este es el corazón del servicio, escucha continuamente los mensajes del bus.
serviceSocketToBus.on('data', async (data) => {
    const rawData = data.toString();
    // El bus puede enviar múltiples mensajes concatenados, los separamos.
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

    for (const message of messages) {
        try {
            if (message.length < 10) continue; // Ignorar mensajes mal formados.
            console.log(`[${config.SERVICE_NAME_CODE}] Recibido: ${message}`);
            
            const parsed = parseResponse(message);

            // Ignorar mensajes que no son para este servicio.
            if (parsed.serviceName !== config.SERVICE_CODE) {
                continue;
            }

            const fields = parsed.data.split(';');
            const operation = fields[0];
            console.log(`[${config.SERVICE_NAME_CODE}] Enrutando operación: ${operation}`);

            // --- EL ENRUTADOR ---
            // Delega la lógica de negocio al manejador apropiado según la operación.
            switch (operation) {
                // auth
                case 'registrar':
                    authHandler.handleRegister(fields, serviceSocketToBus);
                    break;
                case 'login':
                    authHandler.handleLogin(fields, serviceSocketToBus);
                    break;
                // preferencias
                case 'PREFG': //CAMBIAR EL NOMBNRE 
                    preferenceHandler.handleSavePreference(fields, serviceSocketToBus);
                    break;
                case 'listar_pref':
                    preferenceHandler.handleListPreferences(fields, serviceSocketToBus);
                    break;
                case 'PREFD':
                    response = await preferenceHandler.handleDeletePreference(data, token);
                    break;
                // mascotas
                 case 'MASCR':
                    response = await petHandler.createPet(data);
                    break;
                case 'MASLI':
                    response = await petHandler.listPets(data);
                    break;
                case 'MASUP':
                    response = await petHandler.updatePet(data);
                    break;
                case 'MASDE':
                    response = await petHandler.deletePet(data);
                    break;
                    default:
                        console.warn(`[${config.SERVICE_NAME_CODE}] Operación desconocida: ${operation}`);
                        const response = buildTransaction(config.SERVICE_CODE, `${operation};Operacion desconocida`, 'NK');
                        serviceSocketToBus.write(response);
                        break;
                }
        } catch (error) {
            console.error(`[${config.SERVICE_NAME_CODE}] Error fatal procesando mensaje: ${error.message}`);
            // Opcional: Enviar una respuesta de error genérica al bus si es apropiado.
            const response = buildTransaction(config.SERVICE_CODE, `error;Error interno del servidor`, 'NK');
            serviceSocketToBus.write(response);
        }
    }
});



// Health check para monitoreo (ej. con Docker, Kubernetes, etc.)
const healthApp = express();
healthApp.get('/health', (req, res) => {
    // Una comprobación de salud más avanzada podría verificar la conexión a la DB.
    const status = serviceSocketToBus.writable ? 200 : 503;
    const message = serviceSocketToBus.writable ? 'Service is active and connected.' : 'Service is not connected.';
    res.status(status).send(message);
});
healthApp.listen(config.HEALTH_PORT, () => {
});

// Conectar al bus e iniciar el servicio.
serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST, () => {
    sendSinit((err) => {
        if (err) {
            console.error('Fallo CRÍTICO en la activación del servicio. Terminando.', err);
            serviceSocketToBus.destroy();
            process.exit(1); // Salir del proceso si la activación falla.
        } else {
            console.log(`[${config.SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
        }
    });
});

// Manejo de eventos de conexión del socket
serviceSocketToBus.on('close', () => {
    console.log('[AVISO] Conexión con el Bus cerrada. Intentando reconectar en 5 segundos...');
    // Lógica de reconexión opcional
    // setTimeout(() => serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST), 5000);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`Error de conexión con el Bus: ${err.message}`);
});