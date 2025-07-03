const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const petActions = require('./petActions');
const jwt = require('jsonwebtoken');

/**
 * Orquesta el proceso completo de agendamiento de un servicio.
 */
async function handleScheduleServiceFlow(token, services) {
    try {
        // 1. Elegir servicio
        const { itemId: serviceId } = await ui.promptForItemId('servicio', 'agendar');
        const selectedService = services.find(s => s.id === serviceId);
        if (!selectedService) return console.log('\n❌ ID de servicio no válido.');

        // 2. Elegir mascota
        if (!await petActions.handleListPets(token)) {
            return console.log('\n❌ Debes registrar una mascota antes de agendar.');
        }
        const { petId } = await ui.promptForPetSelection();

        // 3. Pedir un día específico
        const { date } = await ui.promptForDate('ver la disponibilidad');
        console.log(`\nBuscando horarios para el día ${date}...`);

        const response = await bus.send('CITAS', `verdia;${date};${serviceId}`);

        // Asumiendo que tu parseResponse puede devolver status null
        if (response.status && response.status !== 'OK') {
            return console.error(`\n❌ Error obteniendo disponibilidad: ${response.data}`);
        }

        const responsePayload = response.data.startsWith('verdia;')
            ? response.data.substring('verdia;'.length)
            : response.data;

        const availabilityData = JSON.parse(responsePayload);
        if (Object.keys(availabilityData).length === 0) {
            return console.log('\nℹ️ No hay horarios disponibles para ese día y servicio.');
        }

        // 4. Elegir un horario
        const chosenTime = await ui.promptForDailySlot(availabilityData);
        if (!chosenTime) return console.log('\nAgendamiento cancelado.');

        // 5. Elegir un veterinario
        const availableVets = availabilityData[chosenTime];
        const chosenVet = await ui.promptForVetSelection(availableVets);
        if (!chosenVet) return console.log('\nAgendamiento cancelado.');

        // 6. Confirmar y crear la cita
        const fechaHoraCompleta = `${date}T${chosenTime}`;
        const confirmacion = await ui.promptForAppointmentConfirmation(selectedService, chosenVet, fechaHoraCompleta);
        if(!confirmacion) return console.log('\nAgendamiento cancelado.');

        const decodedToken = jwt.decode(token);
        const payload = `crear;${decodedToken.id};${petId};${chosenVet.id};${fechaHoraCompleta.slice(0, 19)};${serviceId};Cita agendada desde cliente.`;

        const createResponse = await bus.send('CITAS', payload);
        console.log('\nAgendando tu cita...');

        if (createResponse.status === 'OK' && createResponse.data.startsWith('crear;')) {
            const [, citaId, estado] = createResponse.data.split(';');
            console.log(`\n✅ ¡Cita agendada con éxito! ID: ${citaId}, Estado: ${estado}`);
        } else {
            const errorMsg = createResponse.data.split(';')[1] || 'Error desconocido';
            console.error(`\n❌ Error al crear la cita: ${errorMsg}`);
        }

    } catch (error) {
        console.error(`\nHa ocurrido un error inesperado en el flujo de agendamiento: ${error.message}`);
    }
}

module.exports = {
    handleScheduleServiceFlow
};