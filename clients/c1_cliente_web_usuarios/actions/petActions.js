// clients/c1_cliente_web_usuarios/actions/petActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');

// Funcion principal que muestra el menu de mascotas y enruta la accion
async function handlePetManagement(token) {
    let keepInMenu = true;
    while (keepInMenu) {
        const choice = await ui.showPetMenu();
        switch (choice) {
            case '1': await handleCreatePet(token); break;
            case '2': await handleListPets(token); break;
            case '3': await handleGetSinglePet(token); break;
            case '4': await handleUpdatePet(token); break;
            case '5': await handleDeletePet(token); break;
            case '6': keepInMenu = false; break;
            default: console.log('Opcion no valida.'); break;
        }
    }
}

async function handleCreatePet(token) {
    const details = await ui.promptForPetDetails();
    const transactionData = `MASCR;${token};${details.nombre};${details.especie};${details.raza};${details.edad}`;
    const response = await bus.send('CLIEN', transactionData);
    if (response.status !== 'OK') {
        return console.error(`\n❌ Error de comunicación: ${response.message || response.data}\n`);
    }
    const parts = response.data.split(';');
    if (parts[0] === 'MASCR' && parts[1]) {
        console.log(`\n✅ ¡Mascota registrada con éxito! ID: ${parts[1]}\n`);
    } else {
        console.error(`\n❌ Error al crear mascota: ${response.data}\n`);
    }
}

async function handleListPets(token) {
    try {
        const response = await bus.send('CLIEN', `MASLI;${token}`);
        if (response.status !== 'OK') {
            console.error(`\n❌ Error de comunicación: ${response.data}\n`);
            return false;
        }

        const petDataString = response.data.split(';')[1];
        if (!petDataString || petDataString.trim() === '[]' || petDataString.trim() === '') {
            console.log('\nℹ️ No tienes mascotas registradas.\n');
            return false;
        }

        const pets = JSON.parse(petDataString);
        if (pets && pets.length > 0) {
            console.log('\n--- 🐾 Tus Mascotas Registradas ---');
            console.table(pets);
            console.log('------------------------------------\n');
            return true;
        } else {
            console.log('\nℹ️ No tienes mascotas registradas.\n');
            return false;
        }
    } catch (e) {
        console.error(`\n❌ Error listando mascotas: ${e.message}`);
        return false;
    }
}


async function handleGetSinglePet(token) {
    const petId = await ui.promptForPetId('ver en detalle');
    const transactionData = `MASGE;${token};${petId}`;
    const response = await bus.send('CLIEN', transactionData);

    if (response.status !== 'OK') {
        return console.error(`\n❌ Error de comunicación: ${response.message || response.data}\n`);
    }

    // --- CORREGIDO: Verificamos el contenido de la respuesta ---
    const parts = response.data.split(';');
    if (parts[0] === 'MASGE') {
        try {
            const petDataString = parts[1];
            const pet = JSON.parse(petDataString);
            console.log('\n--- 🐾 Detalle de la Mascota ---');
            console.table([pet]);
            console.log('----------------------------------\n');
        } catch (e) {
            console.error('\n❌ Error procesando la respuesta del servidor.\n');
        }
    } else {
        console.error(`\n❌ Error al obtener la mascota: ${response.data}\n`);
    }
}

async function handleUpdatePet(token) {
    console.log('Primero, elige la mascota que quieres actualizar de la lista:');
    const hasPets = await handleListPets(token);
    if (!hasPets) return;

    const petId = await ui.promptForPetId('actualizar');
    console.log(`\nAhora, ingresa los nuevos datos para la mascota con ID ${petId}:`);
    const details = await ui.promptForPetDetails();

    const transactionData = `MASUP;${token};${petId};${details.nombre};${details.especie};${details.raza};${details.edad}`;
    const response = await bus.send('CLIEN', transactionData);

    if (response.status !== 'OK') {
        return console.error(`\n❌ Error de comunicación: ${response.message || response.data}\n`);
    }

    // --- CORREGIDO: Verificamos el contenido de la respuesta ---
    if (response.data === 'MASUP;MASCOTA_ACTUALIZADA') {
        console.log(`\n✅ ¡Mascota actualizada con éxito!\n`);
    } else {
        console.error(`\n❌ Error al actualizar mascota: ${response.data}\n`);
    }
}

async function handleDeletePet(token) {
    console.log('Primero, elige la mascota que quieres eliminar de la lista:');
    const hasPets = await handleListPets(token);
    if (!hasPets) return;

    const petId = await ui.promptForPetId('eliminar');
    const transactionData = `MASDE;${token};${petId}`;
    const response = await bus.send('CLIEN', transactionData);

    if (response.status !== 'OK') {
        return console.error(`\n❌ Error de comunicación: ${response.message || response.data}\n`);
    }

    // --- CORREGIDO: Verificamos el contenido de la respuesta ---
    if (response.data === 'MASDE;MASCOTA_ELIMINADA') {
        console.log(`\n✅ ¡Mascota eliminada con éxito!\n`);
    } else {
        console.error(`\n❌ Error al eliminar mascota: ${response.data}\n`);
    }
}

// --- ESTA ES LA LÍNEA CLAVE ---
// Exportamos todas las funciones para que puedan ser reutilizadas por otros módulos.
module.exports = {
    handlePetManagement,
    handleCreatePet,
    handleListPets,
    handleGetSinglePet,
    handleUpdatePet,
    handleDeletePet
};