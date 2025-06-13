// clients/c1_cliente_web_usuarios/actions/catalogActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const preferenceActions = require('./preferenceActions');
const cartActions = require('./cartActions');
// Función principal que muestra el menú del catálogo y enruta
async function handleCatalogSubMenu(token) {
    let keepInMenu = true;
    while (keepInMenu) {
        const choice = await ui.showCatalogMenu();
        switch (choice) {
            case '1': await handleListProducts(token); break;
            case '2': await handleListServices(token); break;
            case '3': keepInMenu = false; break;
            default: console.log('Opción no válida.'); break;
        }
    }
}

/*async function handleListProducts(token) {
    // El servicio S7 implementado usa 'CATPS' como nombre de servicio
    const response = await bus.send('CATPS', 'CATLP;');

    if (response.status !== 'OK' || !response.data.startsWith('listar;')) {
        return console.error(`\n❌ Error al listar productos: ${response.message || response.data}\n`);
    }

    try {
        const productsStr = response.data.split(';')[1];
        if (!productsStr) {
            return console.log('\nℹ️ No hay productos en el catálogo.\n');
        }

        // Procesamos el string: separado por '|' para cada producto y por ',' para cada campo
        const products = productsStr.split('|').map(p => {
            const [id_producto, nombre, descripcion, precio, stock, imagen_url] = p.split(',');
            return { id_producto, nombre, descripcion, precio, stock };
        });

        console.log('\n--- 📦 Catálogo de Productos ---');
        console.table(products);
        console.log('--------------------------------\n');
        const choice = await ui.promptForPostListingAction();
        switch (choice) {
            case 'add_preference':
                const availableIds = products.map(p => p.id_producto);
                await preferenceActions.handleSavePreference(token, 'producto', availableIds);
                break;
            case 'add_to_cart':
                console.log('\n(Funcionalidad de carrito por implementar...)\n');
                break;
            case 'back':
                return;
        }
    } catch (e) {
        console.error('\n❌ Error procesando la respuesta del servidor:', e.message);
    }
}*/

//Reemplaza la función handleListProducts con esta
async function handleListProducts(token) {
    const response = await bus.send('CATPS', 'CATLP;');

    if (response.status !== 'OK' || !response.data.startsWith('listar;')) {
        return console.error(`\n❌ Error al listar productos: ${response.message || response.data}\n`);
    }

    try {
        const productsStr = response.data.split(';')[1];
        if (!productsStr) {
            return console.log('\nℹ️ No hay productos en el catálogo.\n');
        }

        const products = productsStr.split('|').map(p => {
            const [id_producto, nombre, descripcion, precio, stock] = p.split(',');
            // IMPORTANTE: Mapeamos a una estructura consistente
            return { id: id_producto, name: nombre, description: descripcion, price: precio, stock: parseInt(stock), type: 'producto' };
        });

        console.log('\n--- 📦 Catálogo de Productos ---');
        console.table(products.map(({id, name, price, stock}) => ({ID: id, Nombre: name, Precio: price, Stock: stock})));
        console.log('--------------------------------\n');

        let keepAdding = true;
        while(keepAdding) {
            const choice = await ui.promptForPostListingAction();
            switch (choice) {
                case 'add_to_cart':
                    await cartActions.handleAddToCart(products, 'producto');
                    break;
                case 'add_preference':
                    const availableIds = products.map(p => p.id);
                    await preferenceActions.handleSavePreference(token, 'producto', availableIds);
                    break;
                case 'back':
                    keepAdding = false;
                    break;
            }
        }
    } catch (e) {
        console.error('\n❌ Error procesando la respuesta del servidor:', e.message);
    }
}

/*async function handleListServices(token) {
    // El servicio S7 implementado usa 'CATPS' como nombre de servicio
    const response = await bus.send('CATPS', 'CATLS;');

    if (response.status !== 'OK' || !response.data.startsWith('listar;')) {
        return console.error(`\n❌ Error al listar servicios: ${response.message || response.data}\n`);
    }

    try {
        const servicesStr = response.data.split(';')[1];
        if (!servicesStr) {
            return console.log('\nℹ️ No hay servicios en el catálogo.\n');
        }

        // Procesamos el string: separado por '|' para cada servicio y por ',' para cada campo
        const services = servicesStr.split('|').map(s => {
            const [id_servicio, nombre, descripcion, precio, tiempo_estimado] = s.split(',');
            return { id_servicio, nombre, descripcion, precio, 'Tiempo Estimado (min)': tiempo_estimado };
        });

        console.log('\n--- 🛠️ Catálogo de Servicios ---');
        console.table(services);
        console.log('---------------------------------\n');
    } catch (e) {
        console.error('\n❌ Error procesando la respuesta del servidor:', e.message);
    }
}*/

async function handleListServices(token) {
    const response = await bus.send('CATPS', 'CATLS;');

    if (response.status !== 'OK' || !response.data.startsWith('listar;')) {
        return console.error(`\n❌ Error al listar servicios: ${response.message || response.data}\n`);
    }

    try {
        const servicesStr = response.data.split(';')[1];
        if (!servicesStr) {
            return console.log('\nℹ️ No hay servicios en el catálogo.\n');
        }

        const services = servicesStr.split('|').map(s => {
            const [id_servicio, nombre, descripcion, precio, tiempo_estimado] = s.split(',');
            // IMPORTANTE: Mapeamos a una estructura consistente
            return { id: id_servicio, name: nombre, description: descripcion, price: precio, time: tiempo_estimado, type: 'servicio' };
        });

        console.log('\n--- 🛠️ Catálogo de Servicios ---');
        console.table(services.map(({id, name, price, time}) => ({ID: id, Nombre: name, Precio: price, 'Tiempo (min)': time})));
        console.log('---------------------------------\n');

        let keepAdding = true;
        while(keepAdding) {
            const choice = await ui.promptForPostListingAction();
            switch (choice) {
                case 'add_to_cart':
                    await cartActions.handleAddToCart(services, 'servicio');
                    break;
                case 'add_preference':
                    const availableIds = services.map(s => s.id);
                    await preferenceActions.handleSavePreference(token, 'servicio', availableIds);
                    break;
                case 'back':
                    keepAdding = false;
                    break;
            }
        }
    } catch (e) {
        console.error('\n❌ Error procesando la respuesta del servidor:', e.message);
    }
}


module.exports = {
    handleCatalogSubMenu
};