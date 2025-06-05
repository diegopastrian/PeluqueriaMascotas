// Este archivo es para crear los helpers de las transacciones de bus_service.  
/**

/**
 * Construye una solicitud en el formato NNNNNSSSSSDATOS
 * donde NNNNN es la longitud de SSSSS + DATOS
 * @param {string} serviceCode - Código de servicio de 5 caracteres (por ejemplo, "sumar")
 * @param {string} data - Datos de la solicitud
 * @returns {string} Cadena de solicitud formateada
 * @throws {Error} Si los parámetros son inválidos
 */

export function buildData(...args) {
    // Validate that all arguments are strings
    if (args.some(arg => typeof arg !== 'string')) {
        throw new Error('All data arguments must be strings');
    }
    return args.join(' ');
}

//funcion calcula el tamaño de los caracteres sumados desde el servicio hasta los datos de entrada o salida
export function calculatelength(data) {

    const length = data.length;
    const lengthStr = length.toString().padStart(5, '0');
    return lengthStr;
}
export function buildRequest(serviceCode, data) {
    // Validar el código de servicio: debe tener exactamente 5 caracteres
    if (typeof serviceCode !== 'string' || serviceCode.length !== 5) {
        throw new Error('El código de servicio debe ser una cadena de 5 caracteres');
    }

    // Validar los datos: deben ser una cadena
    if (typeof data !== 'string') {
        throw new Error('Los datos deben ser una cadena');
    }

    // Calcular la longitud de SSSSS + DATOS
    const length = serviceCode + data;
    //const lengthStr = length.toString().padStart(5, '0');
    const len = calculatelength(length);
    // Validar que la longitud sea un número de 5 dígitos
    if (!/^\d{5}$/.test(len)) {
        throw new Error('La longitud total del código de servicio y los datos debe caber en un campo de longitud de 5 dígitos');
    }

    return `${len}${serviceCode}${data}`;
}

/**
 * Analiza una respuesta en el formato NNNNNSSSSSOK/NKDATOS_RESPUESTA
 * donde NNNNN es la longitud de SSSSS + OK/NK + DATOS_RESPUESTA
 * @param {string} response - Cadena de respuesta a analizar
 * @returns {Object} Objeto que contiene length, serviceCode, status y data es decir el parseo
 * @throws {Error} Si el formato de la respuesta es inválido
 */
export function parseResponse(response) {
    // Validar que la respuesta sea una cadena y tenga una longitud mínima (5 para NNNNN + 5 para SSSSS + 2 para OK/NK)
    if (typeof response !== 'string' || response.length < 12) {
        throw new Error('Formato de respuesta inválido: debe tener al menos 12 caracteres');
    }

    // Extraer la longitud (NNNNN)
    const lengthStr = response.slice(0, 5);
    const length = parseInt(lengthStr, 10);

    // Validar que la longitud sea un número de 5 dígitos
    if (!/^\d{5}$/.test(lengthStr)) {
        throw new Error('Respuesta inválida: la longitud debe ser un número de 5 dígitos');
    }

    // Validar que la longitud coincida con el resto del contenido (SSSSS + OK/NK + DATOS_RESPUESTA)
    if (length !== response.length - 5) {
        throw new Error('Respuesta inválida: el campo de longitud no coincide con la longitud del contenido');
    }

    // Extraer las partes
    const serviceCode = response.slice(5, 10);
    const status = response.slice(10, 12);
    const data = response.slice(12);

    // Validar el código de servicio: debe tener 5 caracteres
    if (serviceCode.length !== 5) {
        throw new Error('Respuesta inválida: el código de servicio debe tener 5 caracteres');
    }

    // Validar el estado: debe ser OK o NK
    if (status !== 'OK' && status !== 'NK') {
        throw new Error('Respuesta inválida: el estado debe ser OK o NK');
    }

    return {
        length,
        serviceCode,
        status,
        data
    };
}
