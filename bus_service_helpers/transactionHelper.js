
const LENGTH_PREFIX_LENGTH = 5; // Longitud de NNNNN
const SERVICE_NAME_LENGTH = 5;  // Longitud de SSSSS
const STATUS_LENGTH = 2;        // Longitud de OK/NK
const MAX_LENGTH = parseInt('9'.repeat(LENGTH_PREFIX_LENGTH), 10);

function normalizeData(text) {
    if (typeof text !== 'string') {
        return text;
    }
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildTransaction(serviceName, data) { //Formato de salida: NNNNNSSSSSDATOS
    data = normalizeData(data); 
    if (typeof serviceName !== 'string' || serviceName.length !== SERVICE_NAME_LENGTH) {
        throw new Error(`El nombre del servicio debe ser una cadena de exactamente ${SERVICE_NAME_LENGTH} caracteres. Recibido: '${serviceName}'`);
    }
    if (typeof data !== 'string') {
        throw new Error("Los datos deben ser una cadena.");
    }
    coreTransaction = serviceName + data;
    const coreLength = coreTransaction.length;
    if (coreLength > MAX_LENGTH) {
        throw new Error(`La longitud total del mensaje (NNNNN + SSSSS + DATOS) no puede exceder ${10 ** LENGTH_PREFIX_LENGTH} caracteres. Longitud recibida: ${CharactersAmount}`);
    }
    const lengthPrefix = String(coreLength).padStart(LENGTH_PREFIX_LENGTH, '0');

    transaction = lengthPrefix + coreTransaction;
    return transaction;
}

function parseResponse(rawMessage) { // Lee Respuestas (NNNNNSSSSSOKDATOS) o Solicitudes (NNNNNSSSSDATOS) del bus.
    if (typeof rawMessage !== 'string') {
        throw new Error("El mensaje crudo debe ser una cadena.");
    }

    const SERVICE_NAME_OFFSET_START = LENGTH_PREFIX_LENGTH;
    const SERVICE_NAME_OFFSET_END = SERVICE_NAME_OFFSET_START + SERVICE_NAME_LENGTH;

    const STATUS_OFFSET_START = SERVICE_NAME_OFFSET_END;
    const STATUS_OFFSET_END = STATUS_OFFSET_START + STATUS_LENGTH;

    const DATA_OFFSET_FOR_REQUEST_FORMAT = SERVICE_NAME_OFFSET_END;
    const DATA_OFFSET_FOR_RESPONSE_FORMAT = STATUS_OFFSET_END;

    if (rawMessage.length < SERVICE_NAME_OFFSET_END) {
        throw new Error(`Mensaje crudo demasiado corto. Se esperaba al menos ${SERVICE_NAME_OFFSET_END} caracteres. Recibido: '${rawMessage}' (longitud ${rawMessage.length})`);
    }

    const lengthPrefixStr = rawMessage.substring(0, LENGTH_PREFIX_LENGTH);
    const declaredContentLength = parseInt(lengthPrefixStr, 10);
    
    if (isNaN(declaredContentLength)) {
        throw new Error(`Prefijo de longitud NNNNN invalido: '${lengthPrefixStr}'. Mensaje completo: '${rawMessage}'`);
    }

    const actualContentLength = rawMessage.length - LENGTH_PREFIX_LENGTH;
    if (declaredContentLength !== actualContentLength) {
        throw new Error(`Discrepancia en la longitud del mensaje: NNNNN declara ${declaredContentLength} caracteres de contenido, pero se encontraron ${actualContentLength}. Mensaje: '${rawMessage}'`);
    }

    const serviceName = rawMessage.substring(SERVICE_NAME_OFFSET_START, SERVICE_NAME_OFFSET_END);
    if (serviceName.length !== SERVICE_NAME_LENGTH) {
        throw new Error(`Nombre de servicio con formato incorrecto. Se esperaban ${SERVICE_NAME_LENGTH} caracteres. Obtenido de '${rawMessage}'`);
    }

    let status = null;
    let data = "";

    // Intentar detectar si es un formato de respuesta (con OK/NK)
    // El contenido (despues de NNNNN) debe ser suficientemente largo para SSSSS + OK/NK
    if (actualContentLength >= SERVICE_NAME_LENGTH + STATUS_LENGTH) {
        const potentialStatus = rawMessage.substring(STATUS_OFFSET_START, STATUS_OFFSET_END);
        if (potentialStatus === "OK" || potentialStatus === "NK") { // Es una respuesta
            status = potentialStatus;
            data = rawMessage.substring(DATA_OFFSET_FOR_RESPONSE_FORMAT);
        } else { // Es una solicitud
            data = rawMessage.substring(DATA_OFFSET_FOR_REQUEST_FORMAT);
        }
    } else {
        data = rawMessage.substring(DATA_OFFSET_FOR_REQUEST_FORMAT);
    }
    
    return {
        serviceName: serviceName,
        status: status, //"OK", "NK", o null
        data: data
    };
}

module.exports = {
    buildTransaction,
    parseResponse
};