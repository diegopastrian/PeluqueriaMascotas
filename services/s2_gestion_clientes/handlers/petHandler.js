// services/s2_gestion_clientes/handlers/petHandler.js

const db = require('../db');
const jwtHelper = require('../helpers/jwtHelper');
const transactionHelper = require('../../../bus_service_helpers/transactionHelper');

// Función para verificar el token y extraer el ID del cliente
async function authenticateAndGetClientId(token) {
    try {
        const decoded = jwtHelper.verifyToken(token);
        return decoded.id; // Asumiendo que el payload del token contiene 'id'
    } catch (error) {
        console.error('[PET HANDLER] Error de autenticación:', error.message);
        throw new Error('Token inválido o expirado');
    }
}

// MASCR: Crear una nueva mascota
async function createPet(data) {
    const [token, nombre, raza, fecha_nacimiento] = data.split(';');
    try {
        const clienteId = await authenticateAndGetClientId(token);
        
        const query = 'INSERT INTO Mascotas (cliente_id, nombre, raza, fecha_nacimiento) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [clienteId, nombre, raza, fecha_nacimiento];
        
        const { rows } = await db.query(query, values);
        console.log('[PET HANDLER] Mascota creada:', rows[0]);
        return transactionHelper.buildTransaction('MASCR_OK', JSON.stringify(rows[0]));
    } catch (error) {
        console.error('[PET HANDLER] Error al crear mascota:', error.message);
        return transactionHelper.buildTransaction('MASCR_ERROR', error.message);
    }
}

// MASLI: Listar las mascotas de un cliente
async function listPets(data) {
    const [token] = data.split(';');
    try {
        const clienteId = await authenticateAndGetClientId(token);

        const query = 'SELECT * FROM Mascotas WHERE cliente_id = $1';
        const { rows } = await db.query(query, [clienteId]);
        
        console.log(`[PET HANDLER] Listando ${rows.length} mascotas para el cliente ${clienteId}`);
        return transactionHelper.buildTransaction('MASLI_OK', JSON.stringify(rows));
    } catch (error) {
        console.error('[PET HANDLER] Error al listar mascotas:', error.message);
        return transactionHelper.buildTransaction('MASLI_ERROR', error.message);
    }
}

// MASUP: Actualizar una mascota existente
async function updatePet(data) {
    const [token, mascotaId, nombre, raza, fecha_nacimiento] = data.split(';');
    try {
        const clienteId = await authenticateAndGetClientId(token);

        // Verificamos que la mascota pertenezca al cliente antes de actualizar
        const checkQuery = 'SELECT * FROM Mascotas WHERE mascota_id = $1 AND cliente_id = $2';
        const checkResult = await db.query(checkQuery, [mascotaId, clienteId]);

        if (checkResult.rows.length === 0) {
            throw new Error('Mascota no encontrada o no pertenece al usuario');
        }

        const query = 'UPDATE Mascotas SET nombre = $1, raza = $2, fecha_nacimiento = $3 WHERE mascota_id = $4 RETURNING *';
        const values = [nombre, raza, fecha_nacimiento, mascotaId];
        
        const { rows } = await db.query(query, values);
        console.log('[PET HANDLER] Mascota actualizada:', rows[0]);
        return transactionHelper.buildTransaction('MASUP_OK', JSON.stringify(rows[0]));
    } catch (error) {
        console.error('[PET HANDLER] Error al actualizar mascota:', error.message);
        return transactionHelper.buildTransaction('MASUP_ERROR', error.message);
    }
}

// MASDE: Eliminar una mascota
async function deletePet(data) {
    const [token, mascotaId] = data.split(';');
    try {
        const clienteId = await authenticateAndGetClientId(token);

        // Verificamos que la mascota pertenezca al cliente antes de eliminar
        const checkQuery = 'SELECT * FROM Mascotas WHERE mascota_id = $1 AND cliente_id = $2';
        const checkResult = await db.query(checkQuery, [mascotaId, clienteId]);

        if (checkResult.rows.length === 0) {
            throw new Error('Mascota no encontrada o no pertenece al usuario');
        }

        const query = 'DELETE FROM Mascotas WHERE mascota_id = $1';
        await db.query(query, [mascotaId]);
        
        console.log(`[PET HANDLER] Mascota con ID ${mascotaId} eliminada`);
        return transactionHelper.buildTransaction('MASDE_OK', `Mascota ${mascotaId} eliminada correctamente`);
    } catch (error) {
        console.error('[PET HANDLER] Error al eliminar mascota:', error.message);
        return transactionHelper.buildTransaction('MASDE_ERROR', error.message);
    }
}


module.exports = {
    createPet,
    listPets,
    updatePet,
    deletePet,
};