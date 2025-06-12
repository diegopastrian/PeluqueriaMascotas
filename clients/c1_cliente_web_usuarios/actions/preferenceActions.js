// clients/c1_cliente_web_usuarios/actions/preferenceActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const jwt = require('jsonwebtoken');

async function handleListPreferences(token) {
    try {
        const transactionData = `listar_pref;${token}`;
        const response = await bus.send('CLIEN', transactionData);
        const parts = response.data.split(';');
        if (parts[0] === 'listar_pref' && parts.length > 1 && parts[1]) {
            preferenceItems = parts.slice(1);
            const preferences = preferenceItems.map(p => {
                const [id_preferencia, tipo, id_referencia] = p.split(',');
                return { id_preferencia, tipo, id_referencia };
            });
            if (preferences.length === 0) {
            return console.log('\nℹ️ No tienes preferencias guardadas.\n');
            }
            const productIds = preferences.filter(p => p.tipo === 'P').map(p => p.id_referencia);
            const serviceIds = preferences.filter(p => p.tipo === 'S').map(p => p.id_referencia);

            let productsMap = new Map();
            let servicesMap = new Map();

            // --- PASO 3: Enriquecer los datos llamando al Servicio S7 (Catálogo) ---
            console.log('\nObteniendo detalles de tus preferencias...');

            // Pedimos los detalles de todos los productos en una sola llamada
            if (productIds.length > 0) {
                const transactionDataS7_P = `CATOPP;${productIds.join(',')}`;
                const responseS7_P = await bus.send('CATPS', transactionDataS7_P);
                if (responseS7_P.status === 'OK' && responseS7_P.data.startsWith('CATOPP;')) {
                    const productsStr = responseS7_P.data.split(';')[1];
                    if (productsStr) {
                        productsStr.split('|').forEach(p => {
                            const [id_producto, nombre] = p.split(',');
                            productsMap.set(id_producto, nombre);
                        });
                    }
                }
            }

            // Pedimos los detalles de todos los servicios en una sola llamada
            if (serviceIds.length > 0) {
                const transactionDataS7_S = `CATOSS;${serviceIds.join(',')}`;
                const responseS7_S = await bus.send('CATPS', transactionDataS7_S);
                if (responseS7_S.status === 'OK'&& responseS7_S.data.startsWith('CATOSS;')) {
                    const servicesStr = responseS7_S.data.split(';')[1];
                    if (servicesStr) {
                        servicesStr.split('|').forEach(s => {
                            const [id_servicio, nombre] = s.split(',');
                            servicesMap.set(id_servicio, nombre);
                        });
                    }
                }
            }

            // --- PASO 4: Combinar los datos y mostrar la tabla final ---
            const displayData = preferences.map(pref => {
                const isProduct = pref.tipo === 'P';
                const nameMap = isProduct ? productsMap : servicesMap;
                const itemName = nameMap.get(pref.id_referencia) || 'Detalle no encontrado';
                
                return {
                    'ID de Preferencia': pref.id_preferencia,
                    'Tipo': isProduct ? 'Producto' : 'Servicio',
                    'Nombre del Item': itemName
                };
            });
            console.log('\n--- ⭐ Tus Preferencias Guardadas ---');
            console.table(displayData);
            console.log('-------------------------------------\n');
            return true; // Devuelve true si hay preferencias para eliminar
        } else if (parts[0] === 'listar_pref') {
            console.log('\nℹ️ No tienes preferencias guardadas.\n');
            return false; // Devuelve false si no hay nada
        } else {
            console.error(`\n❌ Error al listar preferencias: ${response}\n`);
            return false;
        }
    } catch (error) {
        console.error('Ocurrio un error:', error);
        return false;
    }
}

async function handleDeletePreference(token) {
    // Primero, mostramos la lista para que el usuario sepa que borrar
    console.log('Cargando tus preferencias para que elijas cual eliminar...');
    const hasPreferences = await handleListPreferences(token);

    if (!hasPreferences) {
        return; // Si no hay preferencias, no hacemos nada mas
    }

    const data = await ui.promptForPreferenceToDelete();
    const id_preferencia = data.id;

    const transactionData = `PREDE;${token};${id_preferencia}`;
    const response = await bus.send('CLIEN', transactionData);

    if (response.data.includes('PREFERENCIA_ELIMINADA')) {
        console.log(`\n✅ ¡Preferencia eliminada con exito!\n`);
    } else {
        console.error(`\n❌ Error al eliminar la preferencia: ${response.message || response}\n`);
    }
}

async function handleSavePreference(token, itemType, availableIds) {
    const typeCode = itemType === 'producto' ? 'P' : 'S';
    console.log(`\n--- Guardar Preferencia de ${typeCode} ---`);
    const referenceId = await ui.promptForPreferenceId(itemType);

    // Validación que solicitaste: nos aseguramos que el ID exista en la lista mostrada
    if (!availableIds.includes(referenceId)) {
        return console.error('\n❌ Error: El ID ingresado no es válido o no está en la lista.\n');
    }

    const transactionData = `guardar_pref;${token};${typeCode};${referenceId}`;
    const response = await bus.send('CLIEN', transactionData);

    if (response.status === 'OK' && response.data.includes('PREFERENCIA_GUARDADA')) {
        console.log(`\n✅ ¡Preferencia de ${itemType} guardada con éxito!\n`);
    } else {
        console.error(`\n❌ Error al guardar la preferencia: ${response.message || response.data}\n`);
    }
}

async function handlePreferencesSubMenu(token) {
    let keepInMenu = true;
    while (keepInMenu) {
        const choice = await ui.showPreferencesMenu();
        switch (choice) {
            case '1':
                await handleListPreferences(token);
                break;
            case '2':
                await handleDeletePreference(token);
                break;
            case '3':
                keepInMenu = false;
                break;
            default:
                console.log('Opcion no valida.');
                break;
        }
    }
}

module.exports = {
    handlePreferencesSubMenu,
    handleSavePreference,
};