require('dotenv').config();
const { connectToBus, serviceSocketToBus } = require('./busConnection');
const { handleOperation } = require('./operations');
const { startHealthCheck } = require('./healthCheck');
const { SERVICE_NAME_CODE } = require('./config');


connectToBus((error) => {
    if (error) {
        console.error(`[${SERVICE_NAME_CODE}] No se pudo conectar al bus: ${error.message}`);
        process.exit(1);
    }

    serviceSocketToBus.on('data', (data) => {
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${data.toString()}`);
        handleOperation(data.toString(), serviceSocketToBus);
    });

    startHealthCheck();
})