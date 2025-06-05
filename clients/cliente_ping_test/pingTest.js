// clients/client_ping_test/pingTest.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

const clientSocketToBus = new net.Socket();

clientSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[CLIENTE_PING] Conectado al Bus de Servicios en ${BUS_HOST}:${BUS_PORT}`);

    const serviceToCall = "PINGG";
    const dataForPing = "EcoDesdeCliente123";
    const transactionRequest = buildTransaction(serviceToCall, dataForPing);

    console.log(`[CLIENTE_PING] Enviando transacción al bus: ${transactionRequest}`);
    clientSocketToBus.write(transactionRequest);
});

clientSocketToBus.on('data', (data) => {
    const rawResponseFromBus = data.toString();
    console.log(`[CLIENTE_PING] Respuesta cruda recibida del Bus: ${rawResponseFromBus}`);
    try {
        const parsed = parseResponse(rawResponseFromBus);
        console.log('[CLIENTE_PING] Respuesta del Bus parseada:', parsed);

        if (parsed.serviceName === "PINGG") {
            if (parsed.status === "OK") {
                console.log(`[CLIENTE_PING] Respuesta OK del servicio PINGG a través del Bus.`);
                console.log(`[CLIENTE_PING] Datos recibidos: ${parsed.data}`);
                if (parsed.data === "EcoDesdeCliente123") {
                    console.log("¡PRUEBA PINGG EXITOSA! El servicio hizo echo correctamente.");
                } else {
                    console.error("FALLO LA PRUEBA PINGG: Los datos del echo no coinciden.");
                }
            } else if (parsed.status === "NK") {
                console.error(`[CLIENTE_PING] Respuesta NK del servicio PINGG a través del Bus: ${parsed.data}`);
            } else {
                console.error(`[CLIENTE_PING] Estado de respuesta desconocido para PINGG: ${parsed.status}`);
            }
        } else {
             console.warn(`[CLIENTE_PING] Respuesta del bus para un servicio inesperado: ${parsed.serviceName}`);
        }

    } catch (e) {
        console.error("[CLIENTE_PING] Error parseando la respuesta del Bus:", e.message);
    }
    clientSocketToBus.destroy(); // Cerramos después de la primera respuesta para esta prueba.
});

clientSocketToBus.on('close', () => {
    console.log('[CLIENTE_PING] Conexión con el Bus cerrada.');
});

clientSocketToBus.on('error', (err) => {
    console.error('[CLIENTE_PING] Error de conexión con el Bus:', err.message);
});