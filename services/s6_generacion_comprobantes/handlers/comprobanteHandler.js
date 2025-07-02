// services/s6_generacion_comprobantes/handlers/comprobanteHandler.js

// Este handler no interactúa directamente con la DB, por lo que no necesita 'pool'.
// Su única dependencia es el helper para construir transacciones.
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
const pool = require('../../../bus_service_helpers/db.js');

/**
 * Maneja la solicitud para generar un comprobante (simulado) y luego invoca
 * al servicio de notificaciones (S4).
 * Operacion: generar;tipo_comprobante(ORDEN|CITA);id_referencia_origen;id_cliente
 * @param {string[]} fields - Los datos de la operacion, divididos por ';'.
 * @param {import('net').Socket} serviceSocket - El socket para enviar la siguiente transacción al bus.
 */
function handleGenerateComprobante(fields, serviceSocket) {
    if (fields.length !== 4) {
        throw new Error('GEBO;Formato de mensaje invalido. Se esperan 4 campos.');
    }
    const [, tipo, id_referencia, id_cliente] = fields;

    // --- SIMULACIÓN DE GENERACIÓN DE PDF ---
    console.log(`[COMPR] Simulación: Generando comprobante de tipo '${tipo}' para la referencia ID '${id_referencia}'.`);
    

    // Este servicio no necesita esperar la respuesta de S4. Su trabajo termina aquí.
    // La respuesta se la dio S5 al cliente original. Esto es una acción de fondo.
    // Retornamos un valor descriptivo para el log del server.js de S6.
    return `GEBO;COMPROBANTE_GENERADO_Y_ENVIADO_A_NOTIF`;
}
async function handleGenerateComprobanteAdmin(fields, serviceSocket) {
    if (fields.length !== 4) {
        throw new Error('GEBO;Formato de mensaje invalido. Se esperan 4 campos.');
    }

    const [, tipo, id_referencia, id_cliente] = fields;

    // --- ACTUALIZAR ESTADO DE LA ORDEN ---
        const updateQuery = `UPDATE ordenes SET estado = 'enviado' WHERE id_orden = $1`;
       
            await pool.query(updateQuery, [id_referencia]);
            console.log(`[COMPR] Estado de la orden ${id_referencia} actualizado a 'enviado'.`);
     
    // --- SIMULACIÓN DE GENERACIÓN DE PDF ---
    console.log(`[COMPR] Simulación: Generando comprobante de tipo '${tipo}' para la referencia ID '${id_referencia}'.`);
    const pdfLink = `https://example.com/comprobantes/${tipo.toLowerCase()}_${id_referencia}.pdf`;

    // --- NOTIFICACIÓN AL CLIENTE ---
    const asunto = `Comprobante-Orden-${id_referencia}-Listo`;
    const mensaje = `Hola-hemos-generado-tu-comprobante-Puedes-descargarlo-aqui-${pdfLink}`;
    const notifPayload = `enviar;${id_cliente};COMPROBANTE;EMAIL;${asunto};${mensaje}`;
    const notifTransaction = buildTransaction('NOTIF', notifPayload);

    console.log(`[COMPR] Invocando al servicio NOTIF (S4): ${notifTransaction}`);
    serviceSocket.write(notifTransaction);

    return `generarADM;COMPROBANTE_GENERADO_Y_ENVIADO_A_NOTIF`;
}
module.exports = { handleGenerateComprobante , handleGenerateComprobanteAdmin};