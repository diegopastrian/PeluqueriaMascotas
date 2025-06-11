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
// Obtener varios productos para no hacer muchas llamadas a la base de datos
async function getProductsByIds(ids, pool) {
    try {
        // Si el array de IDs está vacío, no hacemos nada y devolvemos un array vacío.
        if (!ids || ids.length === 0) {
            return [];
        }

        // CORRECCIÓN 1: La consulta ahora usa '= ANY($1)' para buscar en un array.
        const query = 'SELECT * FROM productos WHERE id_producto = ANY($1)';
        
        // CORRECCIÓN 2: El valor que pasamos es el array de IDs en sí.
        const values = [ids]; 
        
        const { rows } = await pool.query(query, values);

        // CORRECCIÓN 3: Devolvemos el array completo de filas encontradas.
        return rows;

    } catch (error) {
        console.error('Error al obtener productos por IDs:', error.message);
        throw error;
    }
}

// Agregar un producto (CATAP)
async function addProduct(nombre, descripcion, precio, stock, imagen_url, pool) {
    try {
        const query = `
            INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_producto`;
        const values = [nombre, descripcion, precio, stock, imagen_url];
        const { rows } = await pool.query(query, values);
        return rows[0]; // Devuelve { id_producto: ... }
    } catch (error) {
        console.error('[CATPS] Error al agregar producto:', error.message);
        throw error;
    }
}

async function updateProduct(id_producto, nombre, descripcion, precio, stock, imagen_url, pool) {
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

    if (!isNaN(stock)) {
        fields.push(`stock = $${index++}`);
        values.push(stock);
    }

    if (imagen_url && imagen_url.trim() !== '') {
        fields.push(`imagen_url = $${index++}`);
        values.push(imagen_url.trim());
    }

    if (fields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
    }

    const query = `
        UPDATE productos
        SET ${fields.join(', ')}
        WHERE id_producto = $${index}
    `;

    values.push(id_producto);

    return await pool.query(query, values);
}


module.exports = {
    listProducts,
    getProductById,
    addProduct,
    updateProduct,
    getProductsByIds
};

