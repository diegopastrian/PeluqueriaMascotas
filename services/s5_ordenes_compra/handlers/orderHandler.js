// handlers/orderHandler.js
const pool = require('../../../bus_service_helpers/db.js');
const { formatFecha, obtenerRangoFechas } = require('../helpers/convert_fecha'); // ajusta la ruta según tu estructura
const { verifyToken } = require('../helpers/jwtHelper');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta esta ruta si tu estructura es diferente


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
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
        await sleep(500); // Pausa de 100ms antes de enviar la respuesta al cliente
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


// Operación: ORES (Obtener Estado de Orden)
async function handleGetOrderStatus(fields, serviceSocket) {
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
    return `obtener;${id_orden};${estado};${fecha.toISOString()};${total}`;
}





async function handleGetALLOrder(fields) {
    if (fields.length < 2 || fields.length > 2) {
        throw new Error('ORES;Formato de mensaje inválido. Se espera: ORES;token;id_cliente|todas');
    }

    const [, id_clientee] = fields;

    let query;
    let params;

    if (id_clientee === 'todas') {
        // Listar todas las órdenes
        query = 'SELECT id_orden, id_cliente, fecha, estado, total FROM ordenes';
        params = [];
    } else {
        // Verificar que id_cliente sea un número válido
        const id_cliente_num = parseInt(id_clientee);
        if (isNaN(id_cliente_num)) {
            throw new Error('obtener_one_or_all;ID de cliente inválido.');
        }
        // Filtrar por cliente específico
        query = 'SELECT id_orden, id_cliente, fecha, estado, total FROM ordenes WHERE id_cliente = $1';
        params = [id_cliente_num];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
    return 'obtener_one_or_all;Sin órdenes encontradas.';
    }
    //console.log(result.rows);
    const {id_orden,id_cliente, estado, fecha, total} = result.rows;
const ordenesProcesando = result.rows.filter(row => row.estado === 'procesando');

if (ordenesProcesando.length > 0) {
    return `obtener_one_or_all;${ordenesProcesando.map(row => (
        `${row.id_orden};${row.id_cliente};${row.estado};${formatFecha(row.fecha)};${row.total}`
    )).join('|')}`;
} else {
    return 'obtener_one_or_all;SIN ORDENES EN PROCESO';
}

}
// Operación: ORRP (Reporte de órdenes por cliente y rango de fecha)
async function handleGetOrderReport(fields) {
if (fields.length > 4) {
    throw new Error('ORRP;Formato inválido. Usa: ORRP;token;id_cliente;rango (ej: hoy) o ORRP;token;id_cliente;fecha_inicio;fecha_fin');
}


    const [, id_cliente, f1, f2] = fields;
    
    let fecha_inicio, fecha_fin;

const posiblesRangos = ['hoy', 'ultima_semana', 'ultimo_mes', 'este_mes', 'todo'];

if (posiblesRangos.includes(f1)) {
    const rango = f1;
    [fecha_inicio, fecha_fin] = obtenerRangoFechas(rango);
} else {
    fecha_inicio = f1;
    fecha_fin = f2;
}

// Asegurar que fecha_fin cubra todo el día
if (/^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)) {
    fecha_fin += ' 23:59:59.999999';
}

    const query = `
        SELECT 
    o.id_orden,
    o.fecha,
    o.estado,
    o.total,
    STRING_AGG(p.nombre, ', ') AS productos
FROM ordenes o
JOIN orden_productos op ON o.id_orden = op.id_orden
JOIN productos p ON op.id_producto = p.id_producto
WHERE o.id_cliente = $1
  AND o.fecha BETWEEN $2 AND $3
GROUP BY o.id_orden, o.fecha, o.estado, o.total
ORDER BY o.fecha ASC;

    `;

    const result = await pool.query(query, [id_cliente, fecha_inicio, fecha_fin]);

    if (result.rows.length === 0) {
        return 'ORRP;No hay órdenes registradas en el rango de fechas indicado.';
    }

    let totalGlobal = 0;
     const filas = result.rows.map(row => {
    totalGlobal += parseFloat(row.total);
    return `${row.id_orden};${formatFecha(row.fecha)};${row.estado};${row.total};${row.productos}`;
  });

    filas.push(`TOTAL;;;${totalGlobal.toFixed(2)}`);

    return 'ORRP;' + filas.join('|');
}


module.exports = {
    handleCreateOrder,
    handleGetOrderStatus,
    handleGetALLOrder,
    handleGetOrderReport // <--- este
};