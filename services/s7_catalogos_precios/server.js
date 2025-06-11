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
    console.log(`[${config.SERVICE_NAME_CODE}] Conectado al Bus en ${config.BUS_HOST}:${config.BUS_PORT}`);
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

        console.log(`[${config.SERVICE_NAME_CODE}] Recibido: ${message}`);

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

                case 'CATOS': // Obtener todos los datos de un servicio
                    if (fields.length !== 2) {
                        const errorResponse = buildTransaction('CATPS', `CATOS;Formato inválido: CATOS;id_servicio`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    const idServicioCompleto = parseInt(fields[1]);
                    if (isNaN(idServicioCompleto)) {
                        const errorResponse = buildTransaction('CATPS', `CATOS;ID de servicio inválido`);
                        serviceSocketToBus.write(errorResponse);
                        break;
                    }

                    try {
                        const servicio = await serviceHandler.getServiceById(idServicioCompleto, pool);

                        if (!servicio) {
                            const errorResponse = buildTransaction('CATPS', `CATOS;Servicio no encontrado`);
                            serviceSocketToBus.write(errorResponse);
                            break;
                        }

                        const servicioStr = `${servicio.id_servicio},${servicio.nombre},${servicio.descripcion},${servicio.precio},${servicio.tiempo_estimado}`;
                        const response = buildTransaction('CATPS', `CATOS;${servicioStr}`);
                        serviceSocketToBus.write(response);
                    } catch (error) {
                        const errorResponse = buildTransaction('CATPS', `CATOS;Error al obtener servicio`);
                        serviceSocketToBus.write(errorResponse);
                    }
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
    console.log(`[${config.SERVICE_NAME_CODE}] Health check en http://localhost:${HEALTH_PORT}/health`);
});

// --- REST API opcional para depuración ---
app.use(express.json());

app.listen(config.API_PORT || 3004, () => {
    console.log(`[${config.SERVICE_NAME_CODE}] API REST escuchando en puerto ${config.API_PORT || 3004}`);
});

console.log(`[${config.SERVICE_NAME_CODE}] Iniciando servicio...`);
