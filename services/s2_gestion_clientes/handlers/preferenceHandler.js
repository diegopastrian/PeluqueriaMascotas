// s2_gestion_clientes/handlers/preferenceHandler.js

const pool = require('../../../bus_service_helpers/db.js');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta la ruta
const { verifyToken } = require('../helpers/jwtHelper');
const { SERVICE_CODE,  SERVICE_NAME_CODE } = require('../config');
const jwtHelper = require('../helpers/jwtHelper');

// Copiamos la logica de 'PREFG'
function handleSavePreference(fields, socket) {
    // ... (La logica de validacion, verificacion de token y DB es EXACTAMENTE la misma que tenias)
    // ... copiala y pegala aqui
}

// Copiamos la logica de 'PREFL'
async function handleListPreferences(fields, socket) {
    try {
        const token = fields[1]; 
        if (!token) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token no proporcionado', 'NK');
            return socket.write(errorResponse);
        }
        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token invalido', 'NK');
            return socket.write(errorResponse);
        }

        const { id_cliente } = decoded;
        console.log(`Listando preferencias para el cliente ID: ${id_cliente}`);
        const result = await pool.query(
            'SELECT id_preferencia, tipo, id_referencia FROM Preferencias WHERE id_cliente = $1',
            [id_cliente]
        );
        const preferences = result.rows;
        if (preferences.length === 0) {
            const responseData = 'listar_pref;';
            const emptyResponse = buildTransaction(SERVICE_NAME_CODE, responseData);
            return socket.write(emptyResponse);
        }
        

        const preferencesString = preferences.map(p => 
            `${p.id_preferencia},${p.tipo_preferencia},${p.id_referencia}`
        ).join(';');

        const responseData = `listar_pref;${preferencesString}`;
        const successResponse = buildTransaction(SERVICE_NAME_CODE, responseData);
        console.log(`Enviando preferencias al cliente: ${id_cliente}`);
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
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Faltan parametros');
            return socket.write(errorResponse);
        }

        // 2. Verificamos el token
        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            const errorResponse = buildTransaction(SERVICE_NAME_CODE, 'error;Token invalido');
            return socket.write(errorResponse);
        }

        // 3. Ejecutamos la eliminacion en la BD
        const { id_cliente } = decoded;
        const result = await pool.query(
            'DELETE FROM Preferencias WHERE id_preferencia = $1 AND id_cliente = $2',
            [id_preferencia, id_cliente]
        );

        if (result.rowCount === 0) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;Preferencia no encontrada o sin permiso', 'NK'));
        }

        // 4. Construimos y escribimos la respuesta de exito
        const successResponse = buildTransaction(SERVICE_NAME_CODE, 'PREDE;PREFERENCIA_ELIMINADA');
        console.log(`Preferencia ID ${id_preferencia} eliminada para el cliente ID ${id_cliente}`);
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