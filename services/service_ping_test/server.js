// services/service_ping_test/server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

const SERVICE_CODE = "SALDS"; 
const MY_SERVICE_LISTEN_PORT = 3001;

const serviceSocketToBus = new net.Socket();
const logPrefix = `[${SERVICE_CODE}]`;

serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`${logPrefix} Conectado al Bus en ${BUS_HOST}:${BUS_PORT}.`);
    
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    console.log(`${logPrefix} -> Registrando servicio ${SERVICE_CODE}...`);
    serviceSocketToBus.write(sinitTransaction);
});

serviceSocketToBus.on('data', (data) => {
    const rawMessageFromBus = data.toString();
    console.log(`${logPrefix} <- Recibido del Bus: ${rawMessageFromBus}`);

    try {
        const potentialStatus = rawMessageFromBus.substring(10, 12);

        if (potentialStatus === 'OK' || potentialStatus === 'NK') {
            const parsed = parseResponse(rawMessageFromBus);
            if (parsed.serviceName === "sinit" && parsed.status === "OK") {
                console.log(`${logPrefix} <- Registro Exitoso. Escuchando peticiones...`);
            } else {
                console.error(`${logPrefix} <- Falló el registro: ${parsed.data}`);
            }
        } else {
            const receivedServiceCode = rawMessageFromBus.substring(5, 10);
            
            if (receivedServiceCode === SERVICE_CODE) {
                const incomingData = rawMessageFromBus.substring(10);
                const dataParts = incomingData.split(';');
                const command = dataParts[0];
                
                console.log(`${logPrefix} <- Petición recibida con comando: '${command}'`);

                let responseData = '';

                switch (command) {
                    case "hola":
                        responseData = "Holaa!!!";
                        break;
                    case "chao":
                        responseData = "Chaoo!!!";
                        break;
                    default:
                        responseData = "Comando desconocido";
                        break;
                }
                
                // --- INICIO DE LA CORRECCIÓN ---
                // El servidor solo prepara los DATOS de la aplicación (comando;payload).
                // NO debe añadir el estado "OK" aquí. El bus lo hará.
                const applicationResponseData = `${command};${responseData}`;
                
                // Empaquetamos la respuesta para el bus.
                const transactionResponseToBus = buildTransaction(SERVICE_CODE, applicationResponseData);
                // --- FIN DE LA CORRECCIÓN ---
                
                console.log(`${logPrefix} -> Enviando respuesta al bus: ${transactionResponseToBus}`);
                serviceSocketToBus.write(transactionResponseToBus);
            }
        }
    } catch (e) {
        console.error(`${logPrefix} Error procesando datos:`, e.message, "Data:", rawMessageFromBus);
    }
});

serviceSocketToBus.on('close', () => console.log(`${logPrefix} Conexión con el Bus cerrada.`));
serviceSocketToBus.on('error', (err) => console.error(`${logPrefix} Error de conexión:`, err.message));

const express = require('express');
const healthApp = express();
healthApp.get('/health', (req, res) => res.status(200).send(`${SERVICE_CODE} service is active.`));
healthApp.listen(MY_SERVICE_LISTEN_PORT, () => console.log(`${logPrefix} Endpoint de health check en http://localhost:${MY_SERVICE_LISTEN_PORT}/health`));
