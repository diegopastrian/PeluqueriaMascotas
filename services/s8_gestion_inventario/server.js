require('dotenv').config();
const { connectToBus, serviceSocketToBus } = require('./busConnection');
const { handleOperation } = require('./operations');
const { startHealthCheck } = require('./healthCheck');
const { SERVICE_NAME_CODE } = require('./config');

console.log(`[${SERVICE_NAME_CODE}] Iniciando servicio...`);

connectToBus((error) => {
    if (error) {
        console.error(`[${SERVICE_NAME_CODE}] No se pudo conectar al bus: ${error.message}`);
        process.exit(1);
    }

    serviceSocketToBus.on('data', (data) => {
        handleOperation(data.toString(), serviceSocketToBus);
    });

    startHealthCheck();
})