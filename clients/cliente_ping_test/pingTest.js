// clients/client_ping_test/pingTest.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const SERVICE_TO_CALL = "SALDS"; // Usamos siempre el mismo codigo de servicio

const clientSocketToBus = new net.Socket();
let testStep = 'hola';

clientSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[CLIENTE] Conectado al Bus de Servicios en ${BUS_HOST}:${BUS_PORT}`);

    // --- Inicia la prueba: Enviar comando "hola" ---
    const command = "hola";
    // El formato de datos ahora es: comando;otros_datos
    const dataForService = `${command};ClienteDePrueba`;
    const transactionRequest = buildTransaction(SERVICE_TO_CALL, dataForService);

    console.log(`[CLIENTE] 1. Enviando transaccion al servicio '${SERVICE_TO_CALL}' con comando '${command}'...`);
    clientSocketToBus.write(transactionRequest);
});

clientSocketToBus.on('data', (data) => {
    const rawResponseFromBus = data.toString();
    console.log(`[CLIENTE] <- Respuesta cruda recibida del Bus: ${rawResponseFromBus}`);
    
    try {
        const parsed = parseResponse(rawResponseFromBus);
        // La respuesta del servicio ahora viene con el comando, lo separamos
        const responseParts = parsed.data.split(';');
        const responseCommand = responseParts[0];
        const responsePayload = responseParts[1];

        if (testStep === 'hola') {
            console.log("[CLIENTE] 2. Procesando respuesta para comando 'hola'");
            if (parsed.serviceName === SERVICE_TO_CALL && parsed.status === "OK" && responseCommand === "hola" && responsePayload === "Holaa!!!") {
                console.log("   -> ¡PRUEBA HOLA EXITOSA!");
                
                // --- Procedemos a la siguiente prueba: Enviar comando "chao" ---
                testStep = 'chao';
                const command = "chao";
                const dataForService = `${command};ClienteDePrueba`;
                const transactionRequest = buildTransaction(SERVICE_TO_CALL, dataForService);
                console.log(`[CLIENTE] 3. Enviando transaccion al servicio '${SERVICE_TO_CALL}' con comando '${command}'...`);
                clientSocketToBus.write(transactionRequest);

            } else {
                console.error("   -> FALLO LA PRUEBA HOLA: La respuesta no fue la esperada.");
                clientSocketToBus.destroy();
            }

        } else if (testStep === 'chao') {
            console.log("[CLIENTE] 4. Procesando respuesta para comando 'chao'");
            if (parsed.serviceName === SERVICE_TO_CALL && parsed.status === "OK" && responseCommand === "chao" && responsePayload === "Chaoo!!!") {
                console.log("   -> ¡PRUEBA CHAOO EXITOSA!");
                console.log("\n*** ¡NUEVO MODELO VALIDADO EXITOSAMENTE! ***");
            } else {
                console.error("   -> FALLO LA PRUEBA CHAOO: La respuesta no fue la esperada.");
            }
            clientSocketToBus.destroy();
        }

    } catch (e) {
        console.error("[CLIENTE] Error parseando la respuesta del Bus:", e.message, "Raw data:", rawResponseFromBus);
        clientSocketToBus.destroy();
    }
});

clientSocketToBus.on('close', () => console.log('[CLIENTE] Conexion con el Bus cerrada.'));
clientSocketToBus.on('error', (err) => console.error('[CLIENTE] Error de conexion:', err.message));
