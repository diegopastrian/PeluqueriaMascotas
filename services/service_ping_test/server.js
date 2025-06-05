// services/service_ping_test/server.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper'); // Ajusta la ruta

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

const MY_SERVICE_NAME_CODE = "PINGG"; // El SSSSS que este servicio manejará
const MY_SERVICE_LISTEN_PORT = 3001; // Puerto en el que este servicio PINGG escuchará localmente *si el bus lo necesita*
                                   // O quizás el bus no necesita esto y solo maneja la conexión TCP.

// --- Lógica de Conexión y Activación con el Bus ---
const serviceSocketToBus = new net.Socket();

serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[${MY_SERVICE_NAME_CODE}] Conectado al Bus en ${BUS_HOST}:${BUS_PORT} para activación y recepción.`);

    // Paso 1: Enviar transacción SINIT para activar/registrar el servicio PINGG
    // SINIT es el SSSSS para la operación de "inicialización/registro de servicio".
    // Los DATOS para SINIT podrían ser el SSSSS que este servicio va a manejar (PINGG)
    // y quizás el puerto en el que este servicio escucha (si el bus necesita redirigirle tráfico).
    // Ejemplo de DATOS para SINIT: "PINGG;localhost;3001" (NombreServicio;HostDondeEscucha;PuertoDondeEscucha)
    // O quizás solo "PINGG" si el bus maneja la conexión de forma diferente.
    // VAMOS A ASUMIR DATOS = "PINGG" por simplicidad y que el bus usa la misma conexión TCP.

    const sinitServiceName = "sinit"; 
    const sinitData = MY_SERVICE_NAME_CODE; 
    const sinitTransaction = buildTransaction(sinitServiceName, sinitData);

    console.log(`[${MY_SERVICE_NAME_CODE}] Enviando transacción de activación (${sinitServiceName}) al bus: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);
});

serviceSocketToBus.on('data', (data) => {
    const rawResponseFromBus = data.toString();
    console.log(`[${MY_SERVICE_NAME_CODE}] Recibido del Bus: ${rawResponseFromBus}`);

    try {
        const parsed = parseResponse(rawResponseFromBus);

        // ¿Es una respuesta a nuestro SINIT?
        if (parsed.serviceName === "sinit" && parsed.status === "OK") { // ¡CONFIRMAR SSSSS DE RESPUESTA DE SINIT!
            console.log(`[${MY_SERVICE_NAME_CODE}] Servicio ${MY_SERVICE_NAME_CODE} activado/registrado exitosamente en el bus.`);
            console.log(`[${MY_SERVICE_NAME_CODE}] Esperando transacciones para ${MY_SERVICE_NAME_CODE} desde el bus...`);
            // Ahora este socket está listo para recibir transacciones PINGG del bus.
        }
        // ¿Es una transacción PINGG que el bus nos está reenviando?
        else if (parsed.serviceName === MY_SERVICE_NAME_CODE) { // El bus nos reenvía una petición para PINGG
            console.log(`[${MY_SERVICE_NAME_CODE}] Transacción PINGG recibida del bus para procesar.`);
            const datosEntrada = parsed.data; // Los datos que el cliente original envió para PINGG
            console.log(`[${MY_SERVICE_NAME_CODE}] Datos de entrada para ${MY_SERVICE_NAME_CODE}: ${datosEntrada}`);

            // Lógica de PINGG: simplemente devolver los datos recibidos (Echo)
            const datosRespuesta = datosEntrada;
            const statusRespuesta = "OK";

            // La respuesta se la enviamos de vuelta AL BUS por el mismo socket.
            const transactionResponseToBus = buildTransaction(MY_SERVICE_NAME_CODE, datosRespuesta);
            console.log(`[${MY_SERVICE_NAME_CODE}] Enviando respuesta (para ${MY_SERVICE_NAME_CODE}) al bus: ${transactionResponseToBus}`);
            serviceSocketToBus.write(transactionResponseToBus);
        }
        // ¿Es una respuesta del bus a una transacción que PINGG envió (si PINGG llamara a otro servicio)? No aplica aquí.
        else {
            console.log(`[${MY_SERVICE_NAME_CODE}] Mensaje no reconocido o no destinado a ${MY_SERVICE_NAME_CODE} desde el bus:`, parsed);
        }

    } catch (e) {
        console.error(`[${MY_SERVICE_NAME_CODE}] Error procesando datos del bus:`, e.message, "Data:", rawResponseFromBus);
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${MY_SERVICE_NAME_CODE}] Conexión con el Bus cerrada.`);
    // Aquí podrías intentar reconectar si es necesario.
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${MY_SERVICE_NAME_CODE}] Error de conexión con el Bus:`, err.message);
});

// Este servicio PINGG ya no necesita su propio servidor Express escuchando en un puerto
// para recibir transacciones DEL CLIENTE, porque ahora las recibe DEL BUS.
// Podrías mantener un servidor Express simple en otro puerto (ej. 3001) solo para un health check local si quieres.
const express = require('express');
const healthApp = express();
const HEALTH_PORT = MY_SERVICE_LISTEN_PORT; // Reutilizamos esta variable
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${MY_SERVICE_NAME_CODE} service is active and connected to bus (hopefully).`);
});
healthApp.listen(HEALTH_PORT, () => {
    console.log(`[${MY_SERVICE_NAME_CODE}] Endpoint de health check local disponible en http://localhost:${HEALTH_PORT}/health`);
});

console.log(`[${MY_SERVICE_NAME_CODE}] Iniciando servicio y conectando al bus...`);