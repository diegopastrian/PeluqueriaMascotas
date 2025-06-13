// services/s3_historial_mascotas/server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const historialHandler = require('./handlers/historialHandler');
const config = require('./config');
const SERVICE_CODE = config.SERVICE_CODE;
let isServiceReady = false;
const serviceSocket = new net.Socket();

function connectToBus() {
    serviceSocket.connect(config.BUS_PORT, config.BUS_HOST, () => {
        serviceSocket.write(buildTransaction('sinit', config.SERVICE_CODE));
    });
}

serviceSocket.on('data', async (data) => {
    const rawMessage = data.toString();
    console.log(`[${config.SERVICE_NAME_CODE}] Recibido: ${rawMessage}`);
    try {
        const parsed = parseResponse(rawMessage);
        if (!isServiceReady) {
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                isServiceReady = true;
                console.log(`[${SERVICE_CODE}] Servicio listo para procesar transacciones.`);
            } else {
                console.error(`[${SERVICE_CODE}] Error: Fallo en la inicialización con el bus. Respuesta recibida: ${rawMessage}`);
                serviceSocket.destroy(); // Cerramos la conexión.
                return;
            }
        }
        if (parsed.serviceName !== config.SERVICE_CODE) return; // Aseguramos que el mensaje es para este servicio

        const fields = parsed.data.split(';');
        const operation = fields[0];
        let responseData;

        switch(operation) {
            case 'registrar': // Corresponde a HIRE
                responseData = await historialHandler.handleRegisterHistory(fields);
                break;
            case 'obtener': // Corresponde a HICO
                responseData = await historialHandler.handleGetHistory(fields);
                break;
            default:
                throw new Error(`Operación '${operation}' desconocida para el servicio ${config.SERVICE_CODE}`);
        }
        
        const response = buildTransaction(config.SERVICE_CODE, responseData, 'OK');
        serviceSocket.write(response);

    } catch (error) {
        console.error(`[${config.SERVICE_NAME_CODE}] Error:`, error.message);
        const response = buildTransaction(config.SERVICE_CODE, error.message, 'NK');
        serviceSocket.write(response);
    }
});

serviceSocket.on('error', (err) => {
    console.error(`[${config.SERVICE_NAME_CODE}] Error de conexión: ${err.message}`);
    // Añadimos una lógica de reconexión aquí también
    if (!serviceSocket.connecting) {
        setTimeout(connectToBus, 5000);
    }
});

serviceSocket.on('close', () => {
    console.log(`[${config.SERVICE_NAME_CODE}] Conexión con el Bus cerrada. Reintentando en 5 segundos...`);
    setTimeout(connectToBus, 5000);
});

// Iniciar la primera conexión
connectToBus();