// server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const orderHandler = require('./handlers/orderHandler');

let isServiceReady = false;
const SERVICE_CODE = 'ORDEN';
const BUS_PORT = 5000;
const BUS_HOST = 'localhost';

const serviceSocket = new net.Socket();

function connectToBus() {
    serviceSocket.connect(BUS_PORT, BUS_HOST, () => {
        const sinit = buildTransaction('sinit', SERVICE_CODE);
        serviceSocket.write(sinit);
    });
}

serviceSocket.on('data', async (data) => {
    const rawMessage = data.toString();
    console.log(`[${SERVICE_CODE}] Recibido: ${rawMessage}`);
    try {

        const parsed = parseResponse(rawMessage);
        if( !isServiceReady) {
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                isServiceReady = true;
                console.log(`[${SERVICE_CODE}] Servicio listo para procesar transacciones.`);
            } else {
                console.error(`[${SERVICE_CODE}] Error: Fallo en la inicialización con el bus. Respuesta recibida: ${rawMessage}`);
                serviceSocket.destroy(); // Cerramos la conexión.
                return;
            }
        }
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
            case 'obtener_one_or_all': // Corresponde a ORES
                responseData = await orderHandler.handleGetALLOrder(fields);
                break;
            case 'reporte': // Corresponde a ORES
                responseData = await orderHandler.handleGetOrderReport(fields);
                break;
            default:
                throw new Error(`Operación '${operation}' desconocida para el servicio ${SERVICE_CODE}`);
        }
        
        const response = buildTransaction(SERVICE_CODE, responseData);
        console.log(response)
        serviceSocket.write(response);

    } catch (error) {
        console.error(`[${SERVICE_CODE}] Error procesando la transacción:`, error.message);
        // Construir la respuesta de error usando el mensaje de la excepción
        const response = buildTransaction(SERVICE_CODE, error.message);
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
