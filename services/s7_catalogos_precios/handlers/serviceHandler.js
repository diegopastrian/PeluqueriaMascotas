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

// Agregar un servicio
async function addService(nombre, descripcion, precio, tiempo_estimado_minutos, pool) {
    try {
        const query = `
            INSERT INTO servicios (nombre, descripcion, precio, tiempo_estimado)
            VALUES ($1, $2, $3, INTERVAL '1 minute' * $4)
            RETURNING id_servicio`;
        const values = [nombre, descripcion, precio, tiempo_estimado_minutos];
        const { rows } = await pool.query(query, values);
        return rows[0]; // Devuelve { id_servicio: ... }
    } catch (error) {
        console.error('[CATPS] Error al agregar servicio:', error.message);
        throw error;
    }
}

// Actualizar un servicio
async function updateService(id_servicio, nombre, descripcion, precio, tiempo_estimado_minutos, pool) {
    const fields = [];
    const values = [];
    let index = 1;

    if (nombre && nombre.trim() !== '') {
        fields.push(`nombre = $${index++}`);
        values.push(nombre.trim());
    }

    if (descripcion && descripcion.trim() !== '') {
        fields.push(`descripcion = $${index++}`);
        values.push(descripcion.trim());
    }

    if (!isNaN(precio)) {
        fields.push(`precio = $${index++}`);
        values.push(precio);
    }

    if (!isNaN(tiempo_estimado_minutos)) {
        fields.push(`tiempo_estimado = INTERVAL '1 minute' * $${index++}`);
        values.push(tiempo_estimado_minutos);
    }

    if (fields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
    }

    const query = `
        UPDATE servicios
        SET ${fields.join(', ')}
        WHERE id_servicio = $${index}`;

    values.push(id_servicio);

    return await pool.query(query, values);
}

module.exports = {
    listServices,
    getServiceById,
    addService,
    updateService
};