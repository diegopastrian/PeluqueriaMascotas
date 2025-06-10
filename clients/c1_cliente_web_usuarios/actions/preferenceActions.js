// clients/c1_cliente_web_usuarios/actions/preferenceActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const jwt = require('jsonwebtoken');

async function handleListPreferences(token) {
    try {
        const transactionData = `listar_pref;${token}`;
        const response = await bus.send('CLIEN', transactionData);
        console.log(response);
        const parts = response.data.split(';');
        if (parts[0] === 'listar_pref' && parts.length > 1 && parts[1]) {
            const preferences = parts.slice(1).map(p => {
                const [id_preferencia, tipo, id_referencia] = p.split(',');
                return { id_preferencia, Tipo: tipo === 'P' ? 'Producto' : 'Servicio', 'ID de Referencia': id_referencia };
            });
            console.log('\n--- ⭐ Tus Preferencias Guardadas ---');
            console.table(preferences);
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
    handlePreferencesSubMenu
};