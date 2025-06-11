// server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const orderHandler = require('./handlers/orderHandler');

const SERVICE_CODE = 'ORDEN';
const BUS_PORT = 5000;
const BUS_HOST = 'localhost';

const serviceSocket = new net.Socket();

function connectToBus() {
    console.log(`[${SERVICE_CODE}] Intentando conectar al Bus en ${BUS_HOST}:${BUS_PORT}...`);
    serviceSocket.connect(BUS_PORT, BUS_HOST, () => {
        console.log(`[${SERVICE_CODE}] Conectado al Bus.`);
        const sinit = buildTransaction('sinit', SERVICE_CODE);
        serviceSocket.write(sinit);
    });
}

serviceSocket.on('data', async (data) => {
    const rawMessage = data.toString();
    console.log(`[${SERVICE_CODE}] Recibido: ${rawMessage}`);
    try {
        const parsed = parseResponse(rawMessage);
        // Ignorar mensajes que no sean para este servicio
        if (parsed.serviceName !== SERVICE_CODE) return;

        const fields = parsed.data.split(';');
        const operation = fields[0];
        let responseData;

        switch(operation) {
            case 'crear': // Corresponde a ORCR
                responseData = await orderHandler.handleCreateOrder(fields, serviceSocket);
                break;
            case 'obtener': // Corresponde a ORES
                responseData = await orderHandler.handleGetOrderStatus(fields);
                break;
            default:
                throw new Error(`Operación '${operation}' desconocida para el servicio ${SERVICE_CODE}`);
        }
        
        const response = buildTransaction(SERVICE_CODE, responseData, 'OK');
        serviceSocket.write(response);

    } catch (error) {
        console.error(`[${SERVICE_CODE}] Error procesando la transacción:`, error.message);
        // Construir la respuesta de error usando el mensaje de la excepción
        const response = buildTransaction(SERVICE_CODE, error.message, 'NK');
        serviceSocket.write(response);
    }
});

serviceSocket.on('error', (err) => console.error(`[${SERVICE_CODE}] Error de conexión: ${err.message}`));

serviceSocket.on('close', () => {
    console.log(`[${SERVICE_CODE}] Conexión con el Bus cerrada. Reintentando en 5 segundos...`);
    setTimeout(connectToBus, 5000);
});

// Iniciar la primera conexión
connectToBus();