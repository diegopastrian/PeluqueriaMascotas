// server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const comprobanteHandler = require('./handlers/comprobanteHandler');
let isServiceReady = false;
const SERVICE_CODE = 'COMPR'; // S6
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
        if (parsed.serviceName !== SERVICE_CODE) return;

        const fields = parsed.data.split(';');
        const operation = fields[0];
        let responseData;

        switch(operation) {
            case 'generar': // Corresponde a GEBO
                responseData = comprobanteHandler.handleGenerateComprobante(fields, serviceSocket);
                break;
            case 'generarADM': // Corresponde a GEBO
                responseData = comprobanteHandler.handleGenerateComprobanteAdmin(fields, serviceSocket);
                break;
            default:
                throw new Error(`Operación '${operation}' desconocida para el servicio ${SERVICE_CODE}`);
        }
        
        // Este servicio no envía una respuesta de vuelta al que lo invocó (S5),
        // ya que es parte de un flujo "fire-and-forget". Si se necesitara confirmación,
        // se debería construir y enviar una respuesta. Por simplicidad, aquí no lo hacemos.
        console.log(`[${SERVICE_CODE}] Proceso finalizado para la operación '${operation}'.`);


    } catch (error) {
        console.error(`[${SERVICE_CODE}] Error procesando la transacción:`, error.message);
        // Opcional: Podríamos enviar una notificación de error a un servicio de logging.
    }
});

serviceSocket.on('error', (err) => console.error(`[${SERVICE_CODE}] Error de conexión: ${err.message}`));
serviceSocket.on('close', () => {
    console.log(`[${SERVICE_CODE}] Conexión con el Bus cerrada. Reintentando en 5 segundos...`);
    setTimeout(connectToBus, 5000);
});

connectToBus();
