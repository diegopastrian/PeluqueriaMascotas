// clients/c1_cliente_web_usuarios/actions/catalogActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');

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

async function handleListProducts(token) {
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
    } catch (e) {
        console.error('\n❌ Error procesando la respuesta del servidor:', e.message);
    }
}

async function handleListServices(token) {
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
}

module.exports = {
    handleCatalogSubMenu
};