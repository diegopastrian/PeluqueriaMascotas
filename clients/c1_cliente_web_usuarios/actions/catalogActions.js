const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const preferenceActions = require('./preferenceActions');
const cartActions = require('./cartActions');
const appointmentActions = require('./appointmentActions');

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
    try {
        const response = await bus.send('CATPS', 'CATLP;');
        if (response.status !== 'OK') {
            return console.error(`\n❌ Error al listar productos: ${response.data}\n`);
        }

        const productsStr = response.data.split(';')[1];
        if (!productsStr) {
            return console.log('\nℹ️ No hay productos en el catálogo.\n');
        }

        const products = productsStr.split('|').map(p => {
            const [id_producto, nombre, descripcion, precio, stock] = p.split(',');
            return { id: id_producto, name: nombre, description: descripcion, price: precio, stock: parseInt(stock), type: 'producto' };
        });

        console.log('\n--- 📦 Catálogo de Productos ---');
        console.table(products.map(({id, name, price, stock}) => ({ID: id, Nombre: name, Precio: `$${price}`, Stock: stock})));
        console.log('--------------------------------\n');

        let keepGoing = true;
        while(keepGoing) {
            const choice = await ui.promptForProductAction();
            switch (choice) {
                case 'add_to_cart': await cartActions.handleAddToCart(products); break;
                case 'add_preference': await preferenceActions.handleSavePreference(token, 'producto', products.map(p => p.id)); break;
                case 'back': keepGoing = false; break;
            }
        }
    } catch (e) {
        console.error(`\n❌ Error en el flujo de productos: ${e.message}`);
    }
}

async function handleListServices(token) {
    try {
        const response = await bus.send('CATPS', 'CATLS;');
        if (response.status !== 'OK') {
            return console.error(`\n❌ Error al listar servicios: ${response.data}\n`);
        }

        const servicesStr = response.data.split(';')[1];
        if (!servicesStr) {
            return console.log('\nℹ️ No hay servicios en el catálogo.\n');
        }

        const services = servicesStr.split('|').map(s => {
            const [id_servicio, nombre, descripcion, precio, tiempo_estimado] = s.split(',');
            return { id: id_servicio, name: nombre, description: descripcion, price: precio, time: tiempo_estimado, type: 'servicio' };
        });

        console.log('\n--- 🛠️ Catálogo de Servicios ---');
        console.table(services.map(({id, name, price, time}) => ({ID: id, Nombre: name, Precio: `$${price}`, 'Tiempo (min)': time})));
        console.log('---------------------------------\n');

        let keepGoing = true;
        while(keepGoing) {
            const choice = await ui.promptForServiceAction();
            switch (choice) {
                case 'schedule':
                    await appointmentActions.handleScheduleServiceFlow(token, services);
                    keepGoing = false;
                    break;
                case 'add_preference':
                    await preferenceActions.handleSavePreference(token, 'servicio', services.map(s => s.id));
                    break;
                case 'back':
                    keepGoing = false;
                    break;
            }
        }
    } catch (e) {
        console.error(`\n❌ Error en el flujo de servicios: ${e.message}`);
    }
}

module.exports = {
    handleCatalogSubMenu
};