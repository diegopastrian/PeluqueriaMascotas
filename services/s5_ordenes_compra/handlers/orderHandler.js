// handlers/orderHandler.js
const pool = require('../db');
const { verifyToken } = require('../helpers/jwtHelper');

// Operación: ORCR (Crear Orden)
async function handleCreateOrder(fields, serviceSocket) {
    // Payload esperado: crear;token_sesion_cliente;id_cliente;item1_id,cant1,precio1|item2_id,cant2,precio2;total
    if (fields.length !== 5) {
        throw new Error('ORCR;Formato de mensaje invalido. Se esperan 5 campos.');
    }

    const [, token, id_cliente, itemsStr, total] = fields;
    
    const authResult = verifyToken(token);
    if (!authResult.success) {
        throw new Error(`ORCR;${authResult.message}`);
    }

    // Seguridad adicional: Asegurarse de que el id_cliente del token coincida con el del payload
    if (authResult.payload.id.toString() !== id_cliente) {
        throw new Error('ORCR;Conflicto de token: el ID del cliente no coincide con el del token.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción de base de datos

        // 1. Insertar en la tabla 'ordenes'
        const orderQuery = 'INSERT INTO ordenes(id_cliente, total, estado) VALUES($1, $2, $3) RETURNING id_orden, fecha';
        const orderResult = await client.query(orderQuery, [id_cliente, total, 'procesando']);
        const { id_orden, fecha } = orderResult.rows[0];

        // 2. Insertar cada producto de la orden en 'orden_productos'
        const items = itemsStr.split('|');
        for (const item of items) {
            const [id_producto, cantidad, precio_unitario] = item.split(',');
            const itemQuery = 'INSERT INTO orden_productos(id_orden, id_producto, cantidad, precio_unitario) VALUES($1, $2, $3, $4)';
            await client.query(itemQuery, [id_orden, id_producto, cantidad, precio_unitario]);
        }
        
        await client.query('COMMIT'); // Finalizar transacción de base de datos
        console.log(`[ORDEN] Orden ${id_orden} creada exitosamente en la DB.`);

        // 3. (FLUJO TRANSACCIONAL) Invocar a otros servicios DESPUÉS de confirmar la transacción de DB
        // Invocar a S6 para generar el comprobante
        const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
        const comprobantePayload = `generar;ORDEN;${id_orden};${id_cliente}`;
        const comprTransaction = buildTransaction('COMPR', comprobantePayload);
        console.log(`[ORDEN] Invocando al servicio COMPR (S6): ${comprTransaction}`);
        serviceSocket.write(comprTransaction);
        
        return `ORCR;${id_orden};procesando`;

    } catch (error) {
        await client.query('ROLLBACK'); // Revertir cambios en caso de error
        console.error('[ORDEN] Error creando orden:', error.message);
        throw new Error('ORCR;Error interno al procesar la orden.');
    } finally {
        client.release(); // Liberar el cliente de la pool
    }
}

// Operación: ORES (Obtener Estado de Orden)
async function handleGetOrderStatus(fields) {
    // Payload esperado: obtener;token_sesion_cliente;id_orden
    if (fields.length !== 3) {
        throw new Error('ORES;Formato de mensaje invalido. Se esperan 3 campos.');
    }
    const [, token, id_orden] = fields;

    const authResult = verifyToken(token);
    if (!authResult.success) {
        throw new Error(`ORES;${authResult.message}`);
    }

    const id_cliente_from_token = authResult.payload.id;

    const query = 'SELECT estado, fecha, total FROM ordenes WHERE id_orden = $1 AND id_cliente = $2';
    const result = await pool.query(query, [id_orden, id_cliente_from_token]);

    if (result.rows.length === 0) {
        throw new Error('ORES;Orden no encontrada o no pertenece al usuario.');
    }

    const { estado, fecha, total } = result.rows[0];
    return `ORES;${id_orden};${estado};${fecha.toISOString()};${total}`;
}


module.exports = {
    handleCreateOrder,
    handleGetOrderStatus,
};