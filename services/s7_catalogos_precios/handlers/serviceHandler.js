// CATLS: listar todos los servicios
async function listServices(pool) {
    try {
        const query = 'SELECT * FROM servicios';
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('[CATAL] Error al listar servicios:', error.message);
        throw error;
    }
}

async function getServiceById(id, pool) {
    try {
        const query = 'SELECT * FROM servicios WHERE id_servicio = $1';
        const values = [id];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return null; // o lanzar un error si prefieres
        }

        return rows[0];
    } catch (error) {
        console.error('Error al obtener producto por ID:', error);
        throw error;
    }
}


module.exports = {
    listServices,
    getServiceById
};