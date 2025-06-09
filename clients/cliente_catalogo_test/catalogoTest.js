const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const SERVICE_TO_CALL = "CATPS";

const clientSocketToBus = new net.Socket();
let testStep = 'CATLP'; // Comenzamos listando productos

clientSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[CLIENTE] Conectado al Bus en ${BUS_HOST}:${BUS_PORT}`);
    sendNextTest();
});

clientSocketToBus.on('data', (data) => {
    const raw = data.toString();
    console.log(`[CLIENTE] <- Respuesta recibida: ${raw}`);

    try {
        const parsed = parseResponse(raw);
        const [command, payload] = parsed.data.split(';', 2);

        switch (testStep) {
            case 'CATLP':
                console.log("[TEST] Verificando listado de productos...");
                if (parsed.serviceName === SERVICE_TO_CALL && command === 'listar') {
                    console.log("   ✔ Productos listados correctamente.");
                    testStep = 'CATLS';
                    sendNextTest();
                } else {
                    failTest("CATLP");
                }
                break;

            case 'CATLS':
                console.log("[TEST] Verificando listado de servicios...");
                if (parsed.serviceName === SERVICE_TO_CALL && command === 'listar') {
                    console.log("   ✔ Servicios listados correctamente.");
                    testStep = 'CATPS';
                    sendNextTest();
                } else {
                    failTest("CATLS");
                }
                break;

            case 'CATPS':
                console.log("[TEST] Verificando precio de servicio...");
                if (parsed.serviceName === SERVICE_TO_CALL && command === 'CATPS') {
                    precio = payload
                    console.log("precio:", precio)
                    if (!isNaN(parseFloat(precio))) {
                        console.log("   ✔ Precio de servicio recibido correctamente.");
                        testStep = 'CATPP';
                        sendNextTest();
                    } else {
                        failTest("CATPS (precio no numérico)");
                    }
                } else {
                    failTest("CATPS");
                }
                break;

            case 'CATPP':
                console.log("[TEST] Verificando precio de producto...");
                if (parsed.serviceName === SERVICE_TO_CALL && command === 'CATPP') {
                    const [, precio] = payload.split(';');
                    if (!isNaN(parseFloat(payload))) {
                        console.log("   ✔ Precio de producto recibido correctamente.");
                        console.log("\n*** TODAS LAS PRUEBAS PASARON EXITOSAMENTE ***");
                    } else {
                        failTest("CATPP (precio no numérico)");
                    }
                } else {
                    failTest("CATPP");
                }
                clientSocketToBus.destroy();
                break;
        }

    } catch (e) {
        console.error("[CLIENTE] Error al procesar la respuesta:", e.message);
        clientSocketToBus.destroy();
    }
});

clientSocketToBus.on('close', () => console.log('[CLIENTE] Conexión cerrada'));
clientSocketToBus.on('error', (err) => console.error('[CLIENTE] Error:', err.message));

function sendNextTest() {
    let command = '';
    let data = '';

    switch (testStep) {
        case 'CATLP':
            command = 'CATLP';
            data = command;
            break;
        case 'CATLS':
            command = 'CATLS';
            data = command;
            break;
        case 'CATPS':
            command = 'CATPS';
            data = `${command};1`; // ID de ejemplo
            break;
        case 'CATPP':
            command = 'CATPP';
            data = `${command};1`; // ID de ejemplo
            break;
    }

    const transaction = buildTransaction(SERVICE_TO_CALL, data);
    console.log(`[CLIENTE] Enviando ${command}...`);
    clientSocketToBus.write(transaction);
}

function failTest(label) {
    console.error(`   ✘ Falló la prueba de ${label}`);
    clientSocketToBus.destroy();
}
