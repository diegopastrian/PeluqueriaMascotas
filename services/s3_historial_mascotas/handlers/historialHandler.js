// services/s3_historial_mascotas/handlers/historialHandler.js
// --- RUTA CORREGIDA ---
const pool = require('../../../bus_service_helpers/db');
const { verifyToken } = require('../helpers/jwtHelper');

// Operación HIRE: registrar;id_mascota;id_cita_origen;ids_servicios;fecha;[notas]
async function handleRegisterHistory(fields) {
    if (fields.length < 5) throw new Error('HIRE;Formato invalido: Se esperan al menos 5 campos');
    const [, id_mascota, id_cita_origen, ids_servicios, fecha, notas=''] = fields;

    // Asumimos que 'id_servicios' en la tabla es un campo de texto o array que puede guardar los IDs
    const query = `INSERT INTO historial_servicios (id_mascota, id_servicios, fecha, notas) VALUES ($1, $2, $3, $4) RETURNING id_historial`;
    const result = await pool.query(query, [id_mascota, ids_servicios, fecha, notas]);
    
    const newHistorialId = result.rows[0].id_historial;
    console.log(`[HISTORIAL] Registro de historial creado con ID: ${newHistorialId}`);
    return `registrar;${newHistorialId}`;
}

// Operación HICO: obtener;token_empleado;id_mascota
async function handleGetHistory(fields) {
    if (fields.length !== 3) throw new Error('obtener;Formato invalido: Se esperan 3 campos');
    const [, token, id_mascota] = fields;

    const authResult = verifyToken(token);
    if (!authResult.success) throw new Error(`obtener;${authResult.message}`);
    
    const query = `SELECT * FROM historial_servicios WHERE id_mascota = $1 ORDER BY fecha DESC`;
    const result = await pool.query(query, [id_mascota]);
    
    return `obtener;${JSON.stringify(result.rows)}`;
}

module.exports = { handleRegisterHistory, handleGetHistory };