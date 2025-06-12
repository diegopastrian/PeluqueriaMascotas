const productHandler = require('../handlers/productHandler');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');

class ProductController {
    constructor() {
        this.pool = null;
        this.config = null;
    }

    initialize(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async listProducts(serviceSocket) {
        try {
            const productos = await productHandler.listProducts(this.pool);
            const productosStr = productos.map(p =>
                `${p.id_producto},${p.nombre},${p.descripcion},${p.precio},${p.stock},${p.imagen_url}`
            ).join('|');
            const response = buildTransaction('CATPS', `listar;${productosStr}`);
            console.log(`[${this.config.SERVICE_NAME_CODE}] Enviando lista de productos: Se enviaron ${productos.length} productos`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en listProducts:`, error);
            const errorResponse = buildTransaction('CATPS', `listar;Error al obtener productos`);
            serviceSocket.write(errorResponse);
        }
    }

    async getProductPrice(fields, serviceSocket) {
        if (fields.length !== 2) {
            const errorResponse = buildTransaction('CATPS', `CATPP;Formato inválido: CATPP;id_producto`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idProducto = parseInt(fields[1]);
        if (isNaN(idProducto)) {
            const errorResponse = buildTransaction('CATPS', `CATPP;ID de producto inválido`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const producto = await productHandler.getProductById(idProducto, this.pool);

            if (!producto) {
                const errorResponse = buildTransaction('CATPS', `CATPP;Producto no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }

            console.log(`[${this.config.SERVICE_NAME_CODE}] Enviando precio del producto: ${producto.id_producto} - ${producto.precio}`);
            const response = buildTransaction('CATPS', `CATPP;${producto.precio}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getProductPrice:`, error);
            const errorResponse = buildTransaction('CATPS', `CATPP;Error al obtener precio`);
            serviceSocket.write(errorResponse);
        }
    }

    async getProductById(fields, serviceSocket) {
        if (fields.length !== 2) {
            const errorResponse = buildTransaction('CATPS', `CATOP;Formato inválido: CATOP;id_producto`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idProducto = parseInt(fields[1]);
        if (isNaN(idProducto)) {
            const errorResponse = buildTransaction('CATPS', `CATOP;ID de producto inválido`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const producto = await productHandler.getProductById(idProducto, this.pool);

            if (!producto) {
                const errorResponse = buildTransaction('CATPS', `CATOP;Producto no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }

            const productoStr = `${producto.id_producto},${producto.nombre},${producto.descripcion},${producto.precio},${producto.stock},${producto.imagen_url}`;
            const response = buildTransaction('CATPS', `CATOP;${productoStr}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getProductById:`, error);
            const errorResponse = buildTransaction('CATPS', `CATOP;Error al obtener producto`);
            serviceSocket.write(errorResponse);
        }
    }

    async getProductsByIds(fields, serviceSocket) {
        if (fields.length !== 2) {
            const errorResponse = buildTransaction('CATPS', `CATOPP;Formato inválido: CATOPP;id_producto`);
            serviceSocket.write(errorResponse);
            return;
        }

        const idsString = fields[1];
        const productIds = idsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        if (productIds.length === 0) {
            const errorResponse = buildTransaction('CATPS', `CATOPP;IDs de producto inválidos`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const productos = await productHandler.getProductsByIds(productIds, this.pool);

            if (productos.length === 0) {
                const errorResponse = buildTransaction('CATPS', `CATOPP;No se encontraron productos`);
                serviceSocket.write(errorResponse);
                return;
            }

            const productosStr = productos.map(p =>
                `${p.id_producto},${p.nombre},${p.descripcion},${p.precio},${p.stock},${p.imagen_url}`
            ).join('|');
            const response = buildTransaction('CATPS', `CATOPP;${productosStr}`);
            console.log(`[${this.config.SERVICE_NAME_CODE}] Enviando datos de productos: Se enviaron ${productos.length} productos`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en getProductsByIds:`, error);
            const errorResponse = buildTransaction('CATPS', `CATOPP;Error al obtener productos`);
            serviceSocket.write(errorResponse);
        }
    }

    async addProduct(fields, serviceSocket) {
        if (fields.length !== 7) {
            const errorMsg = 'CATAP;Formato inválido: CATAP;token;nombre;descripcion;precio;stock;imagen_url';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        const [, token, nombre, descripcion, precioStr, stockStr, imagen_url] = fields;
        const precio = parseFloat(precioStr);
        const stock = parseInt(stockStr);

        if (!nombre || !descripcion || isNaN(precio) || isNaN(stock) || stock < 0) {
            const errorMsg = 'CATAP;Datos inválidos';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        const authResult = require('../helpers/jwtHelper').verifyToken(token);
        if (!authResult.success) {
            const errorMsg = `CATAP;${authResult.message}`;
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
            return;
        }

        if (!['veterinario', 'empleado', 'administrador'].includes(authResult.role)) {
            const errorResponse = buildTransaction('CATPS', `CATAP;Permisos insuficientes`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const result = await productHandler.addProduct(nombre, descripcion, precio, stock, imagen_url, this.pool);
            const response = buildTransaction('CATPS', `CATAP;Producto agregado con ID ${result.id_producto}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en addProduct:`, error);
            const errorMsg = 'CATAP;Error al agregar producto';
            const len = (5 + 2 + errorMsg.length).toString().padStart(5, '0');
            const errorResponse = len + 'CATPS' + 'NK' + errorMsg;
            serviceSocket.write(errorResponse);
        }
    }

    async updateProduct(fields, serviceSocket) {
        if (fields.length !== 8) {
            const errorResponse = buildTransaction('CATPS', `CATUP;Formato inválido: CATUP;token;id_producto;nombre;descripcion;precio;stock;imagen_url`);
            serviceSocket.write(errorResponse);
            return;
        }

        const [, token, idProductoStr, nombre, descripcion, precioStr, stockStr, imagen_url] = fields;

        const id_producto = parseInt(idProductoStr);
        const precio = parseFloat(precioStr);
        const stock = parseInt(stockStr);

        if (isNaN(id_producto) || !nombre || !descripcion || isNaN(precio) || isNaN(stock) || stock < 0) {
            const errorResponse = buildTransaction('CATPS', `CATUP;Datos inválidos`);
            serviceSocket.write(errorResponse);
            return;
        }

        const authResult = require('../helpers/jwtHelper').verifyToken(token);
        if (!authResult.success) {
            const errorResponse = buildTransaction('CATPS', `CATUP;${authResult.message}`);
            serviceSocket.write(errorResponse);
            return;
        }

        if (!['veterinario', 'empleado', 'administrador'].includes(authResult.role)) {
            const errorResponse = buildTransaction('CATPS', `CATUP;Permisos insuficientes`);
            serviceSocket.write(errorResponse);
            return;
        }

        try {
            const result = await productHandler.updateProduct(id_producto, nombre, descripcion, precio, stock, imagen_url, this.pool);
            if (result.rowCount === 0) {
                const errorResponse = buildTransaction('CATPS', `CATUP;Producto no encontrado`);
                serviceSocket.write(errorResponse);
                return;
            }
            const response = buildTransaction('CATPS', `CATUP;Producto modificado con ID ${id_producto}`);
            serviceSocket.write(response);
        } catch (error) {
            console.error(`[${this.config.SERVICE_NAME_CODE}] Error en updateProduct:`, error);
            const errorResponse = buildTransaction('CATPS', `CATUP;Error al modificar producto`);
            serviceSocket.write(errorResponse);
        }
    }
}

module.exports = new ProductController();