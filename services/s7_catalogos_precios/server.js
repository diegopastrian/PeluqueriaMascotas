const net = require('net');
const express = require('express');
const pool  = require('./../../bus_service_helpers/db');
const config = require('./config'); // Variables de entorno
const sendSinit = require('../../bus_service_helpers/initHelper'); // Activación del bus
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

// Cargamos los handlers para manejar las diferentes funciones que sean requeridas
const productHandler = require('./handlers/productHandler');
const serviceHandler = require('./handlers/serviceHandler');

const app = express();
const serviceSocketToBus = new net.Socket();

// Conexión al Bus
serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST, () => {
    sendSinit(serviceSocketToBus, config, (err) => {
        if (err) {
            console.error(`[${config.SERVICE_NAME_CODE}] Error durante la activación: ${err.message}`);
            serviceSocketToBus.destroy();
            process.exit(1);
        } else {
            console.log(`[${config.SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
        }
    });
});

serviceSocketToBus.on('data', async (data) => {
    const rawData = data.toString();
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

    for (const message of messages) {
        if (message.length < 10) continue;

        try {
            const parsed = parseResponse(message);

            if (parsed.serviceName === 'sinit') continue;

            if (parsed.serviceName !== config.SERVICE_CODE) {
                const errorResponse = buildTransaction(config.SERVICE_CODE, `Servicio incorrecto`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const fields = parsed.data.split(';');
            const operation = fields[0];

            if (!operation) {
                const errorResponse = buildTransaction(config.SERVICE_CODE, `error;Operación no especificada`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            console.log(`[${config.SERVICE_NAME_CODE}] Procesando operación: ${operation}`);

            switch (operation) {
                case 'CATLP': // listar Productos
                    try {
                        const productos = await productHandler.listProducts(pool);
                        const productosStr = productos.map(p => `${p.id_producto},${p.nombre},${p.descripcion},${p.precio},${p.stock},${p.imagen_url}`).join('|');
                        const response = buildTransaction('CATPS', `listar;${productosStr}`);
                        console.log(`[${config.SERVICE_NAME_CODE}] Enviando lista de productos: Se enviaron ${productos.length} productos`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `listar;Error al obtener productos`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATLS': // Listar Servicios
                    try {
                        const servicios = await serviceHandler.listServices(pool);
                        const servicesStr = servicios.map(p => `${p.id_servicio},${p.nombre},${p.descripcion},${p.precio},${p.tiempo_estimado}`).join('|');
                        const response = buildTransaction('CATPS', `listar;${servicesStr}`);
                        console.log(`[${config.SERVICE_NAME_CODE}] Enviando lista de servicios: Se enviaron ${servicios.length} servicios`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `listar;Error al obtener productos`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;
                case 'CATPS': // Obtener Precio de un servicio
                    if (fields.length !== 2) {
                        const errorResponse = buildTransaction('CATPS', `CATPS;Formato inválido: CATPS;id_servicio`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const idServicio = parseInt(fields[1]);
                    if (isNaN(idServicio)) {
                        const errorResponse = buildTransaction('CATPS', `CATPS;ID de servicio inválido`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const servicio = await serviceHandler.getServiceById(idServicio, pool);

                        if (!servicio) {
                            const errorResponse = buildTransaction('CATPS', `CATPS;Servicio no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }

                        const precio = Number(servicio.precio);
                        const response = buildTransaction('CATPS', `CATPS;${precio}`);
                        console.log(`[${config.SERVICE_NAME_CODE}] Enviando precio del servicio: ${servicio.id_servicio} - ${precio}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATPS;Error al obtener precio`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;
                case 'CATPP': // Obtener Precio de un producto
                    if (fields.length !== 2) {
                        const errorResponse = buildTransaction('CATPS', `CATPP;Formato inválido: CATPP;id_producto`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const idProducto = parseInt(fields[1]);
                    if (isNaN(idProducto)) {
                        const errorResponse = buildTransaction('CATPS', `CATPP;ID de producto inválido`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const producto = await productHandler.getProductById(idProducto, pool);

                        if (!producto) {
                            const errorResponse = buildTransaction('CATPS', `CATPP;Producto no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }
                        console.log(`[${config.SERVICE_NAME_CODE}] Enviando precio del producto: ${producto.id_producto} - ${producto.precio}`);
                        const response = buildTransaction('CATPS', `CATPP;${producto.precio}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATPP;Error al obtener precio`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATOP': // Obtener todos los datos de un producto
                    if (fields.length !== 2) {
                        const errorResponse = buildTransaction('CATPS', `CATOP;Formato inválido: CATOP;id_producto`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const idProductoCompleto = parseInt(fields[1]);
                    if (isNaN(idProductoCompleto)) {
                        const errorResponse = buildTransaction('CATPS', `CATOP;ID de producto inválido`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const producto = await productHandler.getProductById(idProductoCompleto, pool);

                        if (!producto) {
                            const errorResponse = buildTransaction('CATPS', `CATOP;Producto no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }

                        const productoStr = `${producto.id_producto},${producto.nombre},${producto.descripcion},${producto.precio},${producto.stock},${producto.imagen_url}`;
                        const response = buildTransaction('CATPS', `CATOP;${productoStr}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATOP;Error al obtener producto`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATOPP': // Obtener todos los datos de varios productos por ID
                    if (fields.length !== 2) { 
                        const errorResponse = buildTransaction('CATPS', `CATOPP;Formato inválido: CATOPP;id_producto`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }
                    const idsString = fields[1];
                    const productIds = idsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    if (productIds.length === 0) {
                        const errorResponse = buildTransaction('CATPS', `CATOPP;IDs de producto inválidos`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }
                    try {
                        const productos = await productHandler.getProductsByIds(productIds, pool);
                        if (productos.length === 0) {
                            const errorResponse = buildTransaction('CATPS', `CATOPP;No se encontraron productos`);
                            serviceSocketToBus.write(errorResponse);    
                            break;
                        }
                        const productosStr = productos.map(p => `${p.id_producto},${p.nombre},${p.descripcion},${p.precio},${p.stock},${p.imagen_url}`).join('|');
                        const response = buildTransaction('CATPS', `CATOPP;${productosStr}`);
                        console.log(`[${config.SERVICE_NAME_CODE}] Enviando datos de productos: Se enviaron ${productos.length} productos`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATOPP;Error al obtener productos`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATOS': // obtener servicio por id
                    if (fields.length !== 2) { 
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOS;Formato inválido: CATOS;id_servicio`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const idServicioCompleto = parseInt(fields[1]);
                    if (isNaN(idServicioCompleto)) {
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOS;ID de servicio inválido`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const servicio = await serviceHandler.getServiceById(idServicioCompleto, pool);

                        if (!servicio) {
                            const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOS;Servicio no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }

                        const servicioStr = `${servicio.id_servicio},${servicio.nombre},${servicio.descripcion},${servicio.precio},${servicio.tiempo_estimado}`;
                        const response = buildTransaction(config.SERVICE_CODE, `CATOS;${servicioStr}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOS;Error al obtener servicio`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;
                case 'CATOSS': // Obtener servicios por IDs
                    if (fields.length !== 2 || !fields[1]) {
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOSS;Formato inválido: CATOSS;id_servicio1,id_servicio2,...`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }
                    const idsStringServicios = fields[1];
                    const serviceIds = idsStringServicios.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    if (serviceIds.length === 0) {
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOSS;IDs de servicio inválidos`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }
                    try {
                        const servicios = await serviceHandler.getServicesByIds(serviceIds, pool);
                        if (servicios.length === 0) {
                            const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOSS;No se encontraron servicios`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }
                        const serviciosStr = servicios.map(s => `${s.id_servicio},${s.nombre},${s.descripcion},${s.precio},${s.tiempo_estimado}`).join('|');
                        const response = buildTransaction(config.SERVICE_CODE, `CATOSS;${serviciosStr}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction(config.SERVICE_CODE, `CATOSS;Error al obtener servicios`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;
                case 'CATAP': // Agregar producto
                    if (fields.length !== 7) {
                        const errorMsg = 'CATAP;Formato inválido: CATAP;token;nombre;descripcion;precio;stock;imagen_url';
                        // Construir manualmente el mensaje con NK y longitud correcta
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0'); // 5 servicio + 2 status + longitud data
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const [, tokenCATAP, nombreCATAP, descripcionCATAP, precioStrCATAP, stockStrCATAP, imagen_urlCATAP] = fields;
                    const precioCATAP = parseFloat(precioStrCATAP);
                    const stockCATAP = parseInt(stockStrCATAP);

                    if (!nombreCATAP || !descripcionCATAP || isNaN(precioCATAP) || isNaN(stockCATAP) || stockCATAP < 0) {
                        const errorMsg = 'CATAP;Datos inválidos';
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const authResultCATAP = require('./helpers/jwtHelper').verifyToken(tokenCATAP);
                    if (!authResultCATAP.success) {
                        const errorMsg = `CATAP;${authResultCATAP.message}`;
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    if (!['veterinario', 'empleado', 'administrador'].includes(authResultCATAP.role)) {
                        const errorResponse = buildTransaction('CATPS', `CATAP;Permisos insuficientes`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const result = await productHandler.addProduct(nombreCATAP, descripcionCATAP, precioCATAP, stockCATAP, imagen_urlCATAP, pool);
                        const response = buildTransaction('CATPS', `CATAP;Producto agregado con ID ${result.id_producto}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorMsg = 'CATAP;Error al agregar producto';
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATUP': // Modificar producto
                    if (fields.length !== 8) {
                        const errorResponse = buildTransaction('CATPS', `CATUP;Formato inválido: CATUP;token;id_producto;nombre;descripcion;precio;stock;imagen_url`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    // Declarar todas las variables con nombres únicos
                    const [, tokenCATUP, idProductoStrCATUP, nombreCATUP, descripcionCATUP, precioStrCATUP, stockStrCATUP, imagen_urlCATUP] = fields;

                    const id_productoCATUP = parseInt(idProductoStrCATUP);
                    const precioCATUP = parseFloat(precioStrCATUP);
                    const stockCATUP = parseInt(stockStrCATUP);

                    if (isNaN(id_productoCATUP) || !nombreCATUP || !descripcionCATUP || isNaN(precioCATUP) || isNaN(stockCATUP) || stockCATUP < 0) {
                        const errorResponse = buildTransaction('CATPS', `CATUP;Datos inválidos`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const authResultCATUP = require('./helpers/jwtHelper').verifyToken(tokenCATUP);
                    if (!authResultCATUP.success) {
                        const errorResponse = buildTransaction('CATPS', `CATUP;${authResultCATUP.message}`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    if (!['veterinario', 'empleado', 'administrador'].includes(authResultCATUP.role)) {
                        const errorResponse = buildTransaction('CATPS', `CATUP;Permisos insuficientes`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const result = await productHandler.updateProduct(id_productoCATUP, nombreCATUP, descripcionCATUP, precioCATUP, stockCATUP, imagen_urlCATUP, pool);
                        if (result.rowCount === 0) {
                            const errorResponse = buildTransaction('CATPS', `CATUP;Producto no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }
                        const response = buildTransaction('CATPS', `CATUP;Producto modificado con ID ${id_productoCATUP}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATUP;Error al modificar producto`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATAS': // Agregar servicio
                    if (fields.length !== 6) {
                        const errorMsg = 'CATAS;Formato inválido: CATAS;token;nombre;descripcion;precio;tiempo_estimado_minutos';
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const [, tokenCATAS, nombreCATAS, descripcionCATAS, precioStrCATAS, tiempoStrCATAS] = fields;
                    const precioCATAS = parseFloat(precioStrCATAS);
                    const tiempoCATAS = parseInt(tiempoStrCATAS);

                    if (!nombreCATAS || !descripcionCATAS || isNaN(precioCATAS) || isNaN(tiempoCATAS) || tiempoCATAS <= 0) {
                        const errorMsg = 'CATAS;Datos inválidos';
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const authResultCATAS = require('./helpers/jwtHelper').verifyToken(tokenCATAS);
                    if (!authResultCATAS.success) {
                        const errorMsg = `CATAS;${authResultCATAS.message}`;
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    if (!['veterinario', 'empleado', 'administrador'].includes(authResultCATAS.role)) {
                        const errorResponse = buildTransaction('CATPS', `CATAS;Permisos insuficientes`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const result = await serviceHandler.addService(nombreCATAS, descripcionCATAS, precioCATAS, tiempoCATAS, pool);
                        const response = buildTransaction('CATPS', `CATAS;Servicio agregado con ID ${result.id_servicio}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorMsg = 'CATAS;Error al agregar servicio';
                        const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
                        const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                case 'CATUS': // Modificar servicio
                    if (fields.length !== 7) {
                        const errorResponse = buildTransaction('CATPS', `CATUS;Formato inválido: CATUS;token;id_servicio;nombre;descripcion;precio;tiempo_estimado_minutos`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const [, tokenCATUS, idServicioStrCATUS, nombreCATUS, descripcionCATUS, precioStrCATUS, tiempoStrCATUS] = fields;

                    const id_servicioCATUS = parseInt(idServicioStrCATUS);
                    const precioCATUS = parseFloat(precioStrCATUS);
                    const tiempoCATUS = parseInt(tiempoStrCATUS);

                    if (isNaN(id_servicioCATUS) || !nombreCATUS || !descripcionCATUS || isNaN(precioCATUS) || isNaN(tiempoCATUS) || tiempoCATUS <= 0) {
                        const errorResponse = buildTransaction('CATPS', `CATUS;Datos inválidos`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const authResultCATUS = require('./helpers/jwtHelper').verifyToken(tokenCATUS);
                    if (!authResultCATUS.success) {
                        const errorResponse = buildTransaction('CATPS', `CATUS;${authResultCATUS.message}`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    if (!['veterinario', 'empleado', 'administrador'].includes(authResultCATUS.role)) {
                        const errorResponse = buildTransaction('CATPS', `CATUS;Permisos insuficientes`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const result = await serviceHandler.updateService(id_servicioCATUS, nombreCATUS, descripcionCATUS, precioCATUS, tiempoCATUS, pool);
                        if (result.rowCount === 0) {
                            const errorResponse = buildTransaction('CATPS', `CATUS;Servicio no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }
                        const response = buildTransaction('CATPS', `CATUS;Servicio modificado con ID ${id_servicioCATUS}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATUS;Error al modificar servicio`);
                        serviceSocketToBus.write(errorResponse);
                    }
                    break;

                default:
                    const errorResponse = buildTransaction(config.SERVICE_CODE, `error;Operación no soportada: ${operation}`);
                    serviceSocketToBus.write(errorResponse);
                    break;
            }

        } catch (error) {
            const errorResponse = buildTransaction(config.SERVICE_CODE, `error;${error.message}`);
            serviceSocketToBus.write(errorResponse);
        }
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${config.SERVICE_NAME_CODE}] Conexión cerrada`);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${config.SERVICE_NAME_CODE}] Error: ${err.message}`);
});

// --- Health Check ---
const HEALTH_PORT = config.HEALTH_PORT || 3007;
const healthApp = express();
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${config.SERVICE_NAME_CODE} service is active and connected to bus`);
});
healthApp.listen(HEALTH_PORT, () => {
});

// --- REST API opcional para depuración ---
app.use(express.json());

app.listen(config.API_PORT || 3004, () => {
    
});

