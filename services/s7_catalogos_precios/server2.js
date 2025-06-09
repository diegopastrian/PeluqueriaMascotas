const config = require('./config'); // importamos variables de entorno
const sendSinit = require('../../bus_service_helpers/initHelper'); // función para activación del bus
const net = require('net');
const express = require('express');
const pool = require('./../../bus_service_helpers/db');
const app = express();

// Conexión al Bus
const serviceSocketToBus = new net.Socket();

sendSinit(serviceSocketToBus, config, (err) => {
    if (err) {
        console.error('Fallo CRÍTICO en la activación del servicio. Terminando.', err);
        serviceSocketToBus.destroy();
        process.exit(1);
    } else {
        console.log(`[${config.SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
    }
});
