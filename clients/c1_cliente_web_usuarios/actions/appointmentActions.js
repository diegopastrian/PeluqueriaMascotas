// clients/c1_cliente_web_usuarios/actions/appointmentActions.js

const bus = require('../services/busService');
const ui = require('../ui/consoleUI');
const petActions = require('./petActions');
const jwt = require('jsonwebtoken');

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

        // ✨ ----- INICIO DE LA LÓGICA CORREGIDA ----- ✨
        while (true) { // Bucle principal para permitir reintentos
            // 3. Pedir la fecha
            const { date: chosenDate } = await ui.promptForDate('ver la disponibilidad');
            console.log(`\nBuscando horarios para el día ${chosenDate}...`);

            const response = await bus.send('CITAS', `verdia;${chosenDate};${serviceId}`);

            let responsePayload;
            if (response.status === 'OK' && response.data.startsWith('verdia;')) {
                responsePayload = response.data.substring('verdia;'.length);
            } else {
                console.error(`\n❌ Error obteniendo disponibilidad: ${response.data || 'Respuesta inválida del servicio.'}`);
                return;
            }

            const availabilityData = JSON.parse(responsePayload);

            // Si el servidor no devuelve ningún horario para todo el día.
            if (Object.keys(availabilityData).length === 0) {
                console.log('\nℹ️ No hay horarios disponibles para el día seleccionado.');
                const userChoice = await ui.promptForNoAvailability();
                if (userChoice === 'cancel') {
                    console.log('\nAgendamiento cancelado.');
                    return; // Sale de la función
                }
                continue; // Vuelve al inicio del bucle para pedir otra fecha
            }

            // Si hay horarios, se los pasamos a la UI.
            // La UI los filtrará si es el día de hoy y devolverá null si la lista filtrada queda vacía.
            const chosenTime = await ui.promptForDailySlot(availabilityData, chosenDate);

            // Si chosenTime tiene un valor, el usuario eligió un horario válido.
            if (chosenTime) {
                // ¡Éxito! Tenemos fecha y hora. Procedemos a finalizar el agendamiento.
                const availableVets = availabilityData[chosenTime];
                const chosenVet = await ui.promptForVetSelection(availableVets);
                if (!chosenVet) { // Si el usuario cancela en la selección de veterinario
                    console.log('\nAgendamiento cancelado.');
                    return;
                }

                const fechaHoraCompleta = `${chosenDate}T${chosenTime}`;
                const confirmacion = await ui.promptForAppointmentConfirmation(selectedService, chosenVet, fechaHoraCompleta);
                if(!confirmacion) {
                    console.log('\nAgendamiento cancelado.');
                    return;
                }

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
                return; // Finaliza la función exitosamente
            }

            // Si chosenTime es null, significa que la UI no encontró horarios futuros para hoy.
            // Le damos al usuario la opción de reintentar.
            const userChoiceAfterFilter = await ui.promptForNoAvailability();
            if (userChoiceAfterFilter === 'cancel') {
                console.log('\nAgendamiento cancelado.');
                return;
            }
            // Si elige 'reschedule', el bucle while continuará.
        }
        // ✨ ----- FIN DE LA LÓGICA CORREGIDA ----- ✨
    } catch (error) {
        console.error(`\nHa ocurrido un error inesperado en el flujo de agendamiento: ${error.message}`);
    }
}

module.exports = {
    handleScheduleServiceFlow
};