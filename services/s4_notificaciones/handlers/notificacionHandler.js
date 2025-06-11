// handlers/notificacionHandler.js
const pool = require('../db');

async function handleSendNotificacion(fields) {
    // Payload esperado: enviar;id_cliente_destino;tipo;canal(EMAIL|SMS);asunto;mensaje
    if (fields.length !== 6) {
        throw new Error('NOEN;Formato de mensaje invalido. Se esperan 6 campos.');
    }
    const [, id_cliente, tipo, canal, asunto, mensaje] = fields;

    // --- SIMULACIÓN DE ENVÍO DE NOTIFICACIÓN ---
    console.log(`[NOTIF] Simulación: Preparando para enviar notificación por ${canal} al cliente ID ${id_cliente}.`);
    console.log(`      -> Asunto: ${asunto}`);
    console.log(`      -> Mensaje: ${mensaje}`);
    // En un sistema real, aquí se usaría un servicio como SendGrid, Twilio, etc.
    // --- FIN SIMULACIÓN ---

    // Registrar la notificación en la base de datos para auditoría y seguimiento.
    const query = 'INSERT INTO notificaciones(id_cliente, mensaje, tipo, leida) VALUES($1, $2, $3, $4)';
    await pool.query(query, [id_cliente, mensaje, tipo, false]);
    console.log(`[NOTIF] Notificación registrada en la base de datos.`);

    // Este servicio tampoco necesita devolver una respuesta al que lo invocó (S6).
    // Su trabajo termina al encolar o enviar la notificación.
    return 'NOEN;NOTIFICACION_ENCOLADA';
}

module.exports = { handleSendNotificacion };