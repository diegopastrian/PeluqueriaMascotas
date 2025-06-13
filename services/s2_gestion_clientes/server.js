// s2_gestion_clientes/server.js

const net = require('net');
const express = require('express');
const { parseResponse, buildTransaction } = require('../../bus_service_helpers/transactionHelper'); 

const config = require('./config');
const authHandler = require('./handlers/authHandler');
const preferenceHandler = require('./handlers/preferenceHandler');
const petHandler = require('./handlers/petHandler');

const serviceSocketToBus = new net.Socket();

function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', config.SERVICE_CODE);
    serviceSocketToBus.write(sinitTransaction);

    serviceSocketToBus.once('data', (data) => {
        const responseStr = data.toString();
        try {
            const parsed = parseResponse(responseStr);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                callback(null);
            } else {
                callback(new Error(`Fallo en SINIT: ${responseStr}`));
            }
        } catch (error) {
            callback(new Error(`Error parseando respuesta SINIT: ${error.message}`));
        }
    });
}

serviceSocketToBus.on('data', async (data) => {
    const rawData = data.toString();
    // El bus puede enviar multiples mensajes concatenados, los separamos.
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
            console.log(`[${config.SERVICE_NAME_CODE}] Enrutando operacion: ${operation}`);

            // --- EL ENRUTADOR ---
            // Delega la logica de negocio al manejador apropiado segun la operacion.
            switch (operation) {
                // auth
                case 'registrar':
                    authHandler.handleRegister(fields, serviceSocketToBus);
                    break;
                case 'login':
                    authHandler.handleLogin(fields, serviceSocketToBus);
                    break;
                case 'registrar_empleado':
                    authHandler.handleRegister_employee(fields, serviceSocketToBus);
                    break;                    
                // preferencias
                case 'guardar_pref': //CAMBIAR EL NOMBNRE 
                    preferenceHandler.handleSavePreference(fields, serviceSocketToBus);
                    break;
                case 'listar_pref':
                    preferenceHandler.handleListPreferences(fields, serviceSocketToBus);
                    break;
                case 'PREDE':
                     await preferenceHandler.handleDeletePreference(fields, serviceSocketToBus);
                    break;
                // mascotas
                 case 'MASCR':
                     await petHandler.handleCreatePet(fields,serviceSocketToBus);
                    break;
                case 'MASLI':
                     await petHandler.handleListPets(fields,serviceSocketToBus);
                    break;
                case 'MASUP':
                     await petHandler.handleUpdatePet(fields,serviceSocketToBus);
                    break;
                case 'MASDE':
                     await petHandler.handleDeletePet(fields,serviceSocketToBus);
                    break;
                case 'MASGE':
                    await petHandler.handleGetSinglePet(fields, serviceSocketToBus);
                    break;
                default:
                    console.warn(`[${config.SERVICE_NAME_CODE}] Operacion desconocida: ${operation}`);
                    const response = buildTransaction(config.SERVICE_CODE, `${operation};Operacion desconocida`, 'NK');
                    serviceSocketToBus.write(response);
                    break;
                }
        } catch (error) {
            console.error(`[${config.SERVICE_NAME_CODE}] Error fatal procesando mensaje: ${error.message}`);
            // Opcional: Enviar una respuesta de error generica al bus si es apropiado.
            const response = buildTransaction(config.SERVICE_CODE, `error;Error interno del servidor`, 'NK');
            serviceSocketToBus.write(response);
        }
    }
});



// Health check para monitoreo (ej. con Docker, Kubernetes, etc.)
const healthApp = express();
healthApp.get('/health', (req, res) => {
    // Una comprobacion de salud mas avanzada podria verificar la conexion a la DB.
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
            console.error('Fallo CRITICO en la activacion del servicio. Terminando.', err);
            serviceSocketToBus.destroy();
            process.exit(1); // Salir del proceso si la activacion falla.
        } else {
            console.log(`[${config.SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
        }
    });
});

// Manejo de eventos de conexion del socket
serviceSocketToBus.on('close', () => {
    console.log('[AVISO] Conexion con el Bus cerrada. Intentando reconectar en 5 segundos...');
    // Logica de reconexion opcional
    // setTimeout(() => serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST), 5000);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`Error de conexion con el Bus: ${err.message}`);
});
