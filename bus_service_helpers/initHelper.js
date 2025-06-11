const { buildTransaction, parseResponse } = require('./transactionHelper');

/**
 * Envía la transacción SINIT al Bus para registrar el servicio y maneja la respuesta inicial.
 * @param {net.Socket} serviceSocketToBus - Socket activo conectado al Bus.
 * @param {object} config - Configuración del servicio (debería contener SERVICE_CODE y SERVICE_NAME_CODE).
 * @param {(err: Error | null) => void} callback - Función a llamar después de la respuesta SINIT.
 */
function sendSinit(serviceSocketToBus, config, callback) {
    const sinitTransaction = buildTransaction('sinit', config.SERVICE_CODE);
    serviceSocketToBus.write(sinitTransaction);

    // Escucha la respuesta del bus solo para SINIT, una sola vez.
    serviceSocketToBus.once('data', (data) => {
        const responseStr = data.toString();
        try {
            const parsed = parseResponse(responseStr);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                callback(null);
            } else {
                callback(new Error(`Fallo en SINIT: ${responseStr}`));
            }
        } catch (error) {
            callback(new Error(`Error parseando respuesta SINIT: ${error.message}`));
        }
    });
}

module.exports = sendSinit;