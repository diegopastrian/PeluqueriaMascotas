const bus = require('../services/busService');
const ui = require('../ui/consoleUI');

async function handleSavePreference(type) {
    const data = await ui.getPreferenceData(type);
    const payload = `PREFG;${authToken};${data.type};${data.id}`;

    bus.once('response', (res) => {
        if (res.status === 'OK') {
            console.log(`\n[Éxito] Preferencia de ${type} guardada.`);
        } else {
            const errorMsg = res.data.split(';')[1] || 'Error desconocido';
            console.error(`\n[Error] No se pudo guardar la preferencia: ${errorMsg}`);
        }
    });

    await bus.send('CLIEN', payload);
}

async function handleListPreferences() {
    const payload = `PREFL;${authToken}`;
    
    bus.once('response', (res) => {
        if (res.status === 'OK') {
            const preferences = res.data.split(';').slice(1).join('; '); // Ignora "PREFL;"
            console.log('\n--- Mis Preferencias ---');
            if (preferences) {
                console.log(preferences.replace(/,/g, ': ').replace(/;/g, '\n'));
            } else {
                console.log('No tienes preferencias guardadas.');
            }
        } else {
            const errorMsg = res.data.split(';')[1] || 'Error desconocido';
            console.error(`\n[Error] No se pudo listar las preferencias: ${errorMsg}`);
        }
    });

    await bus.send('CLIEN', payload);
}

module.exports = {
    handleSavePreference,
    handleListPreferences
};