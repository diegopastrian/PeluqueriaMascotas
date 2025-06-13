const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const { SERVICE_CODE, SERVICE_NAME_CODE, BUS_HOST, BUS_PORT } = require('./config');

const serviceSocketToBus = new net.Socket();

function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    serviceSocketToBus.write(sinitTransaction);

    const onData = (data) => {
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${data.toString()}`);
        const response = data.toString();
        try {
            const parsed = parseResponse(response);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                console.log(`[${SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
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

function connectToBus(callback) {
    serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
        sendSinit((error) => {
            if (error) {
                console.error(`[${SERVICE_NAME_CODE}] Error durante la activacion: ${error.message}`);
                serviceSocketToBus.destroy();
                callback(error);
                return;
            }
            callback(null);
        });
    });

    serviceSocketToBus.on('close', () => {
        console.log(`[${SERVICE_NAME_CODE}] Conexion cerrada con el Bus.`);
    });

    serviceSocketToBus.on('error', (err) => {
        console.error(`[${SERVICE_NAME_CODE}] Error de conexion con el Bus: ${err.message}`);
    });
}

module.exports = { serviceSocketToBus, connectToBus };