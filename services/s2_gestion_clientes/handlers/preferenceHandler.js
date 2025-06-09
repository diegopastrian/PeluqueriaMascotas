// s2_gestion_clientes/handlers/preferenceHandler.js

const {pool} = require('../db');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta la ruta
const { verifyToken } = require('../helpers/jwtHelper');
const { SERVICE_CODE,  SERVICE_NAME_CODE } = require('../config');
const jwtHelper = require('../helpers/jwtHelper');

// Copiamos la lógica de 'PREFG'
function handleSavePreference(fields, socket) {
    // ... (La lógica de validación, verificación de token y DB es EXACTAMENTE la misma que tenías)
    // ... cópiala y pégala aquí
}

// Copiamos la lógica de 'PREFL'
async function handleListPreferences(fields, socket) {
    try {
        const token = fields[1]; 
        if (!token) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token no proporcionado', 'NK');
            return socket.write(errorResponse);
        }
        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token inválido', 'NK');
            return socket.write(errorResponse);
        }

        const { id_cliente } = decoded;
        console.log(`Listando preferencias para el cliente ID: ${id_cliente}`);
        const result = await pool.query(
            'SELECT id_preferencia, tipo, id_referencia FROM Preferencias WHERE id_cliente = $1',
            [id_cliente]
        );
        console.log(`Preferencias encontradas: ${result.rows.length}`);
        if (result.rows.length === 0) {
            const responseData = 'listar_pref;';
            const emptyResponse = buildTransaction(SERVICE_NAME_CODE, responseData);
            return socket.write(emptyResponse);
        }
        const preferences = result.rows;

        if (preferences.length === 0) {
            return 'listar_pref;'; // Devuelve el prefijo de la operación y un cuerpo vacío
        }

        const preferencesString = preferences.map(p => 
            `${p.id_preferencia},${p.tipo_preferencia},${p.id_referencia}`
        ).join(';');

        const responseData = `listar_pref;${preferencesString}`;
        const successResponse = buildTransaction(SERVICE_NAME_CODE, responseData);
        socket.write(successResponse);


    } catch (error) {
        console.error('Error en handleListPreferences:', error);
        const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Error interno del servidor');
        socket.write(errorResponse);
    }
}

async function handleDeletePreference(fields, socket) {
    try {
        // 1. Extraemos los datos de 'fields'
        const token = fields[1];
        const id_preferencia = fields[2];

        if (!token || !id_preferencia) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Faltan parámetros');
            return socket.write(errorResponse);
        }

        // 2. Verificamos el token
        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token inválido');
            return socket.write(errorResponse);
        }

        // 3. Ejecutamos la eliminación en la BD
        const { id_cliente } = decoded;
        const [result] = await pool.query(
            'DELETE FROM Preferencias WHERE id_preferencia = ? AND id_cliente = ?',
            [id_preferencia, id_cliente]
        );

        if (result.affectedRows === 0) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Preferencia no encontrada o sin permiso');
            return socket.write(errorResponse);
        }

        // 4. Construimos y escribimos la respuesta de éxito
        const successResponse = buildTransaction(SERVICE_NAME_CODE, 'PREDE;PREFERENCIA_ELIMINADA');
        socket.write(successResponse);

    } catch (error) {
        console.error('Error en handleDeletePreference:', error);
        const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Error interno del servidor');
        socket.write(errorResponse);
    }
}

module.exports = {
    handleSavePreference,
    handleListPreferences,
    handleDeletePreference
};