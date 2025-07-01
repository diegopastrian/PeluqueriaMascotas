const pool = require('../../bus_service_helpers/db');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const { verifyToken } = require('./auth');
const { SERVICE_CODE, SERVICE_NAME_CODE } = require('./config');

async function handleOperation(data, socket) {
    const messages = data.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [data];

    for (const message of messages) {
        if (message.length < 10) continue;
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${message}`);

        let responseData = '';

        try {
            const parsed = parseResponse(message);

            if (parsed.serviceName === 'sinit') {
                continue;
            }

            if (parsed.serviceName !== SERVICE_CODE) {
                responseData = `Servicio incorrecto`;
                socket.write(buildTransaction(SERVICE_CODE, responseData));
                continue;
            }

            const fields = parsed.data.split(';');
            if (fields.length < 1) {
                responseData = `Formato invalido: Se espera operacion`;
                socket.write(buildTransaction(SERVICE_CODE, responseData));
                continue;
            }

            const operation = fields[0];
            console.log(`[${SERVICE_NAME_CODE}] Procesando operacion: ${operation} con datos: ${parsed.data}`);

            // --- Operacion: Consultar Stock ---
            if (operation === 'consultar') {
                if (fields.length !== 2) {
                    responseData = `consultar;Formato invalido: Se esperan 2 campos (consultar;id_producto)`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                const [, id_producto] = fields;
                const idProductoNum = parseInt(id_producto);

                if (isNaN(idProductoNum)) {
                    responseData = `consultar;ID de producto invalido`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                try {
                    const result = await pool.query('SELECT stock FROM productos WHERE id_producto = $1', [idProductoNum]);
                    if (result.rows.length === 0) {
                        responseData = `consultar;Producto no encontrado`;
                        socket.write(buildTransaction(SERVICE_CODE, responseData));
                        return;
                    }

                    const stock = result.rows[0].stock;
                    responseData = `consultar;${idProductoNum};${stock}`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                } catch (err) {
                    console.error(`[${SERVICE_NAME_CODE}] Error al consultar stock: ${err.message}`);
                    responseData = `consultar;Error al consultar el stock`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                }
            }

            // --- Operacion: Ajustar Stock ---
            else if (operation === 'ajustar') {
                if (fields.length !== 5) {
                    responseData = `ajustar;Formato invalido: Se esperan 5 campos (ajustar;token;id_producto;cantidad_ajuste;motivo)`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                const [, token, id_producto, cantidad_ajuste, motivo] = fields;
                const idProductoNum = parseInt(id_producto);
                const cantidadAjusteNum = parseInt(cantidad_ajuste);

                if (isNaN(idProductoNum) || isNaN(cantidadAjusteNum) || !motivo) {
                    responseData = `ajustar;Datos incompletos o invalidos`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                const authResult = verifyToken(token);
                if (!authResult.success) {
                    responseData = `ajustar;${authResult.message}`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                if (authResult.tipo_usuario !== 'veterinario' && authResult.tipo_usuario !== 'empleado' && authResult.tipo_usuario !== 'administrador') {
                    responseData = `ajustar;Solo los empleados pueden ajustar el stock`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                try {
                    await pool.query('BEGIN');
                    const result = await pool.query('SELECT stock FROM productos WHERE id_producto = $1 FOR UPDATE', [idProductoNum]);

                    if (result.rows.length === 0) {
                        await pool.query('ROLLBACK');
                        responseData = `ajustar;Producto no encontrado`;
                        socket.write(buildTransaction(SERVICE_CODE, responseData));
                        return;
                    }

                    const currentStock = result.rows[0].stock;
                    const newStock = currentStock + cantidadAjusteNum;

                    if (newStock < 0) {
                        await pool.query('ROLLBACK');
                        responseData = `ajustar;El stock no puede ser negativo`;
                        socket.write(buildTransaction(SERVICE_CODE, responseData));
                        return;
                    }

                    await pool.query('UPDATE productos SET stock = $1 WHERE id_producto = $2', [newStock, idProductoNum]);
                    await pool.query('COMMIT');

                    responseData = `ajustar;${idProductoNum};${newStock}`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                } catch (err) {
                    await pool.query('ROLLBACK');
                    console.error(`[${SERVICE_NAME_CODE}] Error al ajustar stock: ${err.message}`);
                    responseData = `ajustar;Error al actualizar el stock`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                }
            }

            // --- Operacion: Agregar Producto ---
            else if (operation === 'agregar') {
                if (fields.length !== 7) {
                    responseData = `agregar;Formato invalido: Se esperan 7 campos (agregar;token;nombre_prod;descripcion;precio_costo;precio_venta;stock_inicial)`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                const [, token, nombre_prod, descripcion, precio_costo, precio_venta, stock_inicial] = fields;
                const precioCostoNum = parseFloat(precio_costo);
                const precioVentaNum = parseFloat(precio_venta);
                const stockInicialNum = parseInt(stock_inicial);

                if (!nombre_prod || !descripcion || isNaN(precioCostoNum) || isNaN(precioVentaNum) || isNaN(stockInicialNum) || stockInicialNum < 0) {
                    responseData = `agregar;Datos incompletos o invalidos`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                const authResult = verifyToken(token);
                if (!authResult.success) {
                    responseData = `agregar;${authResult.message}`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                if (authResult.tipo_usuario !== 'veterinario' && authResult.tipo_usuario !== 'empleado' && authResult.tipo_usuario !== 'administrador') {
                    responseData = `agregar;Solo los empleados pueden agregar productos`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                    continue;
                }

                try {
                    await pool.query('BEGIN');
                    const result = await pool.query(
                        'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING id_producto',
                        [nombre_prod, descripcion, precioVentaNum, stockInicialNum]
                    );
                    await pool.query('COMMIT');

                    const id_producto = result.rows[0].id_producto;
                    responseData = `agregar;${id_producto}`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                } catch (err) {
                    await pool.query('ROLLBACK');
                    console.error(`[${SERVICE_NAME_CODE}] Error al agregar producto: ${err.message}`);
                    responseData = `agregar;Error al agregar el producto`;
                    socket.write(buildTransaction(SERVICE_CODE, responseData));
                }
            }else if (operation === 'consulta_padre') {
  try {
    const result = await pool.query('SELECT id_producto, nombre, stock FROM productos');

    if (result.rows.length === 0) {
      responseData = `consulta_padre;`; // sin productos
    } else {
      const productosFormateados = result.rows.map(row => {
        return `${row.id_producto};${row.nombre};${row.stock}`;
      });

      // Unir los productos con '|'
      const productosStr = productosFormateados.join('|');
      responseData = `consulta_padre;${productosStr}`;
    }

    socket.write(buildTransaction(SERVICE_CODE, responseData));
  } catch (error) {
    console.error('❌ Error al consultar productos:', error.message);
    responseData = `consulta_padre;Error al consultar productos`;
    socket.write(buildTransaction(SERVICE_CODE, responseData, false)); // false = NK
  }

            }

            // --- Operacion no reconocida ---
            else {
                responseData = `${operation};Operacion desconocida`;
                socket.write(buildTransaction(SERVICE_CODE, responseData));
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error general procesando mensaje: ${error.message}`);
            responseData = `error;${error.message}`;
            socket.write(buildTransaction(SERVICE_CODE, responseData));
        }
    }
}

module.exports = { handleOperation };