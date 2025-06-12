const productController = require('./productController');
const serviceController = require('./serviceController');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');

class OperationRouter {
    constructor() {
        this.config = null;
    }

    initialize(config) {
        this.config = config;
    }

    async routeOperation(operation, fields, serviceSocket) {
        console.log(`[${this.config.SERVICE_NAME_CODE}] Procesando operación: ${operation}`);

        try {
            switch (operation) {
                case 'CATLP': // Listar Productos
                    await productController.listProducts(serviceSocket);
                    break;

                case 'CATLS': // Listar Servicios
                    await serviceController.listServices(serviceSocket);
                    break;

                case 'CATPS': // Obtener Precio de un servicio
                    await serviceController.getServicePrice(fields, serviceSocket);
                    break;

                case 'CATPP': // Obtener Precio de un producto
                    await productController.getProductPrice(fields, serviceSocket);
                    break;

                case 'CATOP': // Obtener todos los datos de un producto
                    await productController.getProductById(fields, serviceSocket);
                    break;

                case 'CATOPP': // Obtener todos los datos de varios productos por ID
                    await productController.getProductsByIds(fields, serviceSocket);
                    break;

                case 'CATOS': // Obtener servicio por id
                    await serviceController.getServiceById(fields, serviceSocket);
                    break;

                case 'CATOSS': // Obtener servicios por IDs
                    await serviceController.getServicesByIds(fields, serviceSocket);
                    break;

                case 'CATAP': // Agregar producto
                    await productController.addProduct(fields, serviceSocket);
                    break;

                case 'CATUP': // Modificar producto
                    await productController.updateProduct(fields, serviceSocket);
                    break;

                case 'CATAS': // Agregar servicio
                    await serviceController.addService(fields, serviceSocket);
                    break;

                case 'CATUS': // Modificar servicio
                    await serviceController.updateService(fields, serviceSocket);
                    break;

                default:
                    const errorResponse = buildTransaction(this.config.SERVICE_CODE, `error;Operación no soportada: ${operation}`);
                    serviceSocket.write(errorResponse);
                    break;
            }
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en routeOperation:`, error);
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `error;${error.message}`);
            serviceSocket.write(errorResponse);
        }
    }
}

module.exports = new OperationRouter();