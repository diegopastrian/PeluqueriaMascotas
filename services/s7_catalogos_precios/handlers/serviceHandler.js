// CATLS: listar todos los servicios
async function listServices(pool) {
    try {
        const query = `
            SELECT 
                id_servicio, 
                nombre, 
                descripcion, 
                precio, 
                EXTRACT(EPOCH FROM tiempo_estimado)/60 AS tiempo_estimado
            FROM servicios
        `;
        const { rows } = await pool.query(query);

        // Redondeamos minutos para que sea entero
        return rows.map(row => ({
            id_servicio: row.id_servicio,
            nombre: row.nombre,
            descripcion: row.descripcion,
            precio: row.precio,
            tiempo_estimado: Math.round(row.tiempo_estimado)
        }));
    } catch (error) {
        console.error('[CATAL] Error al listar servicios:', error.message);
        throw error;
    }
}

async function getServiceById(id, pool) {
    try {
        const query = `
            SELECT 
                id_servicio, 
                nombre, 
                descripcion, 
                precio, 
                EXTRACT(EPOCH FROM tiempo_estimado)/60 AS tiempo_estimado
            FROM servicios
            WHERE id_servicio = $1
        `;
        const values = [id];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            id_servicio: row.id_servicio,
            nombre: row.nombre,
            descripcion: row.descripcion,
            precio: row.precio,
            tiempo_estimado: Math.round(row.tiempo_estimado)
        };
    } catch (error) {
        console.error('Error al obtener servicio por ID:', error);
        throw error;
    }
}

module.exports = {
    listServices,
    getServiceById
};
