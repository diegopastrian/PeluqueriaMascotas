const serviceHandler = require('../handlers/serviceHandler');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');

class ServiceController {
    constructor() {
        this.pool = null;
        this.config = null;
    }

    initialize(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async listServices(serviceSocket) {
        try {
            const servicios = await serviceHandler.listServices(this.pool);
            const servicesStr = servicios.map(s =>
                `${s.id_servicio},${s.nombre},${s.descripcion},${s.precio},${s.tiempo_estimado}`
            ).join('|');
            const response = buildTransaction('CATPS', `listar;${servicesStr}`);
            console.log(`[${this.config.SERVICE_NAME_CODE}] Enviando lista de servicios: Se enviaron ${servicios.length} servicios`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en listServices:`, error);
            const errorResponse = buildTransaction('CATPS', `listar;Error al obtener servicios`);
            serviceSocket.write(errorResponse);
        }
    }

    async getServicePrice(fields, serviceSocket) {
        if (fields.length !== 2) {
            const errorResponse = buildTransaction('CATPS', `CATPS;Formato inválido: CATPS;id_servicio`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idServicio = parseInt(fields[1]);
        if (isNaN(idServicio)) {
            const errorResponse = buildTransaction('CATPS', `CATPS;ID de servicio inválido`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const servicio = await serviceHandler.getServiceById(idServicio, this.pool);

            if (!servicio) {
                const errorResponse = buildTransaction('CATPS', `CATPS;Servicio no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }

            const precio = Number(servicio.precio);
            const response = buildTransaction('CATPS', `CATPS;${precio}`);
            console.log(`[${this.config.SERVICE_NAME_CODE}] Enviando precio del servicio: ${servicio.id_servicio} - ${precio}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getServicePrice:`, error);
            const errorResponse = buildTransaction('CATPS', `CATPS;Error al obtener precio`);
            serviceSocket.write(errorResponse);
        }
    }

    async getServiceById(fields, serviceSocket) {
        if (fields.length !== 2) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOS;Formato inválido: CATOS;id_servicio`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idServicio = parseInt(fields[1]);
        if (isNaN(idServicio)) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOS;ID de servicio inválido`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const servicio = await serviceHandler.getServiceById(idServicio, this.pool);

            if (!servicio) {
                const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOS;Servicio no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }

            const servicioStr = `${servicio.id_servicio},${servicio.nombre},${servicio.descripcion},${servicio.precio},${servicio.tiempo_estimado}`;
            const response = buildTransaction(this.config.SERVICE_CODE, `CATOS;${servicioStr}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getServiceById:`, error);
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOS;Error al obtener servicio`);
            serviceSocket.write(errorResponse);
        }
    }

    async getServicesByIds(fields, serviceSocket) {
        if (fields.length !== 2 || !fields[1]) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOSS;Formato inválido: CATOSS;id_servicio1,id_servicio2,...`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idsString = fields[1];
        const serviceIds = idsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        if (serviceIds.length === 0) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOSS;IDs de servicio inválidos`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const servicios = await serviceHandler.getServicesByIds(serviceIds, this.pool);

            if (servicios.length === 0) {
                const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOSS;No se encontraron servicios`);
                serviceSocket.write(errorResponse);
                return;
            }

            const serviciosStr = servicios.map(s =>
                `${s.id_servicio},${s.nombre},${s.descripcion},${s.precio},${s.tiempo_estimado}`
            ).join('|');
            const response = buildTransaction(this.config.SERVICE_CODE, `CATOSS;${serviciosStr}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getServicesByIds:`, error);
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `CATOSS;Error al obtener servicios`);
            serviceSocket.write(errorResponse);
        }
    }

    async addService(fields, serviceSocket) {
        if (fields.length !== 6) {
            const errorMsg = 'CATAS;Formato inválido: CATAS;token;nombre;descripcion;precio;tiempo_estimado_minutos';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        const [, token, nombre, descripcion, precioStr, tiempoStr] = fields;
        const precio = parseFloat(precioStr);
        const tiempo = parseInt(tiempoStr);

        if (!nombre || !descripcion || isNaN(precio) || isNaN(tiempo) || tiempo <= 0) {
            const errorMsg = 'CATAS;Datos inválidos';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        const authResult = require('../helpers/jwtHelper').verifyToken(token);
        if (!authResult.success) {
            const errorMsg = `CATAS;${authResult.message}`;
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        if (!['veterinario', 'empleado', 'administrador'].includes(authResult.role)) {
            const errorResponse = buildTransaction('CATPS', `CATAS;Permisos insuficientes`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const result = await serviceHandler.addService(nombre, descripcion, precio, tiempo, this.pool);
            const response = buildTransaction('CATPS', `CATAS;Servicio agregado con ID ${result.id_servicio}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en addService:`, error);
            const errorMsg = 'CATAS;Error al agregar servicio';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
        }
    }

    async updateService(fields, serviceSocket) {
        if (fields.length !== 7) {
            const errorResponse = buildTransaction('CATPS', `CATUS;Formato inválido: CATUS;token;id_servicio;nombre;descripcion;precio;tiempo_estimado_minutos`);
            serviceSocket.write(errorResponse);
            return;
        }

        const [, token, idServicioStr, nombre, descripcion, precioStr, tiempoStr] = fields;

        const id_servicio = parseInt(idServicioStr);
        const precio = parseFloat(precioStr);
        const tiempo = parseInt(tiempoStr);

        if (isNaN(id_servicio) || !nombre || !descripcion || isNaN(precio) || isNaN(tiempo) || tiempo <= 0) {
            const errorResponse = buildTransaction('CATPS', `CATUS;Datos inválidos`);
            serviceSocket.write(errorResponse);
            return;
        }

        const authResult = require('../helpers/jwtHelper').verifyToken(token);
        if (!authResult.success) {
            const errorResponse = buildTransaction('CATPS', `CATUS;${authResult.message}`);
            serviceSocket.write(errorResponse);
            return;
        }

        if (!['veterinario', 'empleado', 'administrador'].includes(authResult.role)) {
            const errorResponse = buildTransaction('CATPS', `CATUS;Permisos insuficientes`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const result = await serviceHandler.updateService(id_servicio, nombre, descripcion, precio, tiempo, this.pool);
            if (result.rowCount === 0) {
                const errorResponse = buildTransaction('CATPS', `CATUS;Servicio no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }
            const response = buildTransaction('CATPS', `CATUS;Servicio modificado con ID ${id_servicio}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en updateService:`, error);
            const errorResponse = buildTransaction('CATPS', `CATUS;Error al modificar servicio`);
            serviceSocket.write(errorResponse);
        }
    }
}

module.exports = new ServiceController();