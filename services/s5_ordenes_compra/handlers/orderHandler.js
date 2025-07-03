// services/s5_ordenes_compra/handlers/orderHandler.js

const pool = require('../../../bus_service_helpers/db.js');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
const { verifyToken } = require('../helpers/jwtHelper');

/**
 * Maneja la creación de una nueva orden de compra de forma transaccional.
 * Esta función ahora es responsable de:
 * 1. Validar y bloquear el stock.
 * 2. Crear la orden y sus detalles.
 * 3. Actualizar el estado a 'aprobado'.
 * 4. Orquestar la generación del comprobante.
 * Todo esto dentro de una única transacción de base de datos.
 *
 * Operación: crear;token;id_cliente;items;total
 */
async function handleCreateOrder(fields, serviceSocket) {
    // 1. Validar formato del mensaje
    if (fields.length !== 5) {
        throw new Error('ORCR;Formato de mensaje invalido. Se esperan 5 campos.');
    }

    const [, token, id_cliente, itemsStr, total] = fields;

    // 2. Validar el token y la coherencia del cliente
    const authResult = verifyToken(token);
    if (!authResult.success) {
        throw new Error(`ORCR;${authResult.message}`);
    }
    if (authResult.payload.id.toString() !== id_cliente) {
        throw new Error('ORCR;Conflicto de token: el ID del cliente no coincide.');
    }

    // 3. Parsear los items de la orden
    const items = itemsStr.split('|').map(item => {
        const [id_producto, cantidad, precio_unitario] = item.split(',');
        return {
            id_producto: parseInt(id_producto),
            cantidad: parseInt(cantidad),
            precio_unitario: parseFloat(precio_unitario)
        };
    });

    if (items.length === 0) {
        throw new Error('ORCR;No se puede crear una orden sin productos.');
    }

    // Usar un cliente de la pool para manejar la transacción
    const dbClient = await pool.connect();

    try {
        // --- INICIO DE LA TRANSACCIÓN ATÓMICA ---
        await dbClient.query('BEGIN');
        console.log(`[ORDEN] BEGIN: Iniciando transacción para nueva orden.`);

        // PASO A: Bloquear las filas de los productos y verificar el stock.
        // `FOR UPDATE` bloquea las filas para que ninguna otra transacción pueda modificarlas
        // hasta que esta termine, evitando condiciones de carrera (dos personas comprando el último item a la vez).
        for (const item of items) {
            const stockCheck = await dbClient.query(
                'SELECT nombre, stock FROM productos WHERE id_producto = $1 FOR UPDATE',
                [item.id_producto]
            );

            if (stockCheck.rows.length === 0) {
                throw new Error(`Producto con ID ${item.id_producto} no encontrado.`);
            }

            const producto = stockCheck.rows[0];
            if (producto.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto '${producto.nombre}'. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}.`);
            }
        }
        console.log(`[ORDEN] STOCK CHECK: Stock verificado y bloqueado para todos los productos.`);

        // PASO B: Si todo el stock está disponible, crear la orden y sus detalles.
        // El estado se inserta directamente como 'aprobado' porque ya hemos validado todo.
        const orderQuery = 'INSERT INTO ordenes(id_cliente, total, estado) VALUES($1, $2, $3) RETURNING id_orden';
        const orderResult = await dbClient.query(orderQuery, [id_cliente, total, 'aprobado']);
        const { id_orden } = orderResult.rows[0];
        console.log(`[ORDEN] INSERT: Orden #${id_orden} creada con estado 'aprobado'.`);

        const itemQuery = 'INSERT INTO orden_productos(id_orden, id_producto, cantidad, precio_unitario) VALUES($1, $2, $3, $4)';
        for (const item of items) {
            await dbClient.query(itemQuery, [id_orden, item.id_producto, item.cantidad, item.precio_unitario]);
        }
        console.log(`[ORDEN] INSERT: Detalles de productos para la orden #${id_orden} registrados.`);

        // PASO C: Descontar el stock de la base de datos.
        const updateStockQuery = 'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2';
        for (const item of items) {
            await dbClient.query(updateStockQuery, [item.cantidad, item.id_producto]);
        }
        console.log(`[ORDEN] UPDATE: Stock descontado para todos los productos.`);

        // PASO D: Confirmar la transacción. Todos los cambios (crear orden, descontar stock) se guardan.
        await dbClient.query('COMMIT');
        console.log(`[ORDEN] COMMIT: Transacción completada con éxito para la orden #${id_orden}.`);

        // --- FIN DE LA TRANSACCIÓN ---

        // PASO E: (Post-transacción) Invocar a S6 para generar el comprobante.
        const comprobantePayload = `generar;ORDEN;${id_orden};${id_cliente}`;
        const comprTransaction = buildTransaction('COMPR', comprobantePayload);
        serviceSocket.write(comprTransaction);
        console.log(`[ORDEN] Notificando a S6 (COMPR) para generar comprobante.`);

        // Devolver la respuesta de éxito al cliente.
        return `ORCR;${id_orden};aprobado`;

    } catch (error) {
        // Si cualquier paso falla, se revierte toda la transacción.
        await dbClient.query('ROLLBACK');
        console.error(`[ORDEN] ROLLBACK: La transacción falló. Causa: ${error.message}`);
        // Lanzar el error para que sea manejado por server.js y enviado al cliente.
        throw new Error(`ORCR;${error.message.replace('Error: ', '')}`);
    } finally {
        // Liberar la conexión a la base de datos para que otros puedan usarla.
        dbClient.release();
    }
}

/**
 * Maneja la consulta del estado de una orden existente. (Sin cambios)
 */
async function handleGetOrderStatus(fields) {
    // ... (esta función no necesita cambios)
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