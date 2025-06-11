// CATLP: listar todos los productos
async function listProducts(pool) {
    try {
        const query = 'SELECT * FROM productos';
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('[CATAL] Error al listar productos:', error.message);
        throw error;
    }
}

// Obtener datos de un producto a traves del ID
async function getProductById(id, pool) {
    try {
        const query = 'SELECT * FROM productos WHERE id_producto = $1';
        const values = [id];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    } catch (error) {
        console.error('Error al obtener producto por ID:', error.message);
        throw error;
    }
}

module.exports = { listProducts, getProductById };
