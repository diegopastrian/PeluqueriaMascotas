require('dotenv').config();
const { showMainMenu, showClientAndPetsMenu, showAppointmentsMenu, promptRegisterEmployee, promptLoginEmployee, promptAdjustStock, promptAddStock, promptQueryStock, promptGetAvailableSlots, promptCreateAppointment, promptModifyAppointment, promptCancelClientAppointment, promptListClientAppointments, promptListClients, promptListClientPets, promptAgendaAction } = require('./ui/adminConsole');
const { registerEmployee, loginEmployee } = require('./service/authService');
const { adjustStock, addStock, queryStock } = require('./service/stockService');
const { getAvailableSlots, createAppointment, modifyAppointment, cancelClientAppointment, cancelEmployeeAppointment, listClientAppointments, listEmployeeAgenda, confirmAppointment } = require('./service/citasservice');
const { listClients, listClientPets } = require('./service/clientService');
const { mostrarHorariosDisponibles } = require('./extras/mostrarHorariosDisponibles');

async function main() {
  let token = '';
  let employeeId = '';
  let employeeName = '';

  while (true) {
    const isAuthenticated = !!token;
    const action = await showMainMenu(isAuthenticated);

    if (action === 'exit') {
      console.log('Saliendo del sistema...');
      break;
    }

    try {
      if (action === 'register') {
        const employeeData = await promptRegisterEmployee();
        const result = await registerEmployee(employeeData);
        console.log(`✅ ${result.message}: ID=${result.id}, Email=${result.email}`);
      } else if (action === 'login') {
        const loginData = await promptLoginEmployee();
        const result = await loginEmployee(loginData);
        token = result.token;
        employeeId = result.id;
        employeeName = result.nombre;
        console.log(`✅ ${result.message}`);
      } else if (action === 'logout') {
        token = '';
        employeeId = '';
        employeeName = '';
        console.log('✅ Sesión cerrada');
      } else if (action === 'adjustStock') {
        const stockData = await promptAdjustStock();
        const result = await adjustStock(token, stockData.productId, stockData.quantity, stockData.motivo);
        console.log(`✅ ${result.message}: ${result.data}`);
      } else if (action === 'addStock') {
        const stockData = await promptAddStock();
        const result = await addStock(token, stockData.productName, stockData.desc, stockData.precio_costo, stockData.precioventa, stockData.stock_inicial);
        console.log(`✅ ${result.message}: ${result.data}`);
      } else if (action === 'queryStock') {
        const stockData = await promptQueryStock();
        const result = await queryStock(stockData.productId);
        console.log(`✅ ${result.message}: ${result.data}`);
      } else if (action === 'clientAndPets') {
        while (true) {
          const subAction = await showClientAndPetsMenu();
          if (subAction === 'back') break;

          if (subAction === 'listClients') {
            const clients = await listClients();
            console.table(clients);
          } else if (subAction === 'listClientPets') {
            const petData = await promptListClientPets();
            const pets = await listClientPets(petData.idCliente);
            console.table(pets);
          }
        }
      } else if (action === 'appointments') {
        while (true) {
          const subAction = await showAppointmentsMenu();
          if (subAction === 'back') break;

          if (subAction === 'getAvailableSlots') {
            const slotsData = await promptGetAvailableSlots();
            const result = await getAvailableSlots(slotsData.date, slotsData.idServicio);
            mostrarHorariosDisponibles(result.data);
          }else if (subAction === 'viewAgenda') {
  if (!employeeId) {
    console.log('❌ Debes iniciar sesión para ver tu agenda.');
    continue;
  }
  const result = await listEmployeeAgenda(employeeId);
  if (result.data === 'listarAgenda;Sin citas programadas') {
    console.log('ℹ️ No tienes citas pendientes.');
    continue;
  }

  const citas = result.data.split(';').slice(1).map(cita => {
    const [id_cita, cliente, id_mascota, mascota, fecha_hora, estado, comentario] = cita.split(',');
    return { id_cita, cliente, id_mascota, mascota, fecha_hora: fecha_hora.substring(0, 16), estado, comentario };
  });

  if (citas.length === 0) {
    console.log('ℹ️ No tienes citas pendientes.');
    continue;
  }

  console.table(citas);

  while (true) {
    const agendaAction = await promptAgendaAction(citas);
    if (agendaAction.action === 'back') break;

    if (agendaAction.action === 'confirm') {
      const result = await confirmAppointment(agendaAction.idCita, employeeId);
      console.log(`✅ ${result.message}: ${result.data}`);
    } else if (agendaAction.action === 'cancel') {
      const result = await cancelEmployeeAppointment(agendaAction.idCita, employeeId, agendaAction.motivo);
      console.log(`✅ ${result.message}: ${result.data}`);
    }
  }
} else if (subAction === 'createAppointment') {
            const appointmentData = await promptCreateAppointment();
            const result = await createAppointment(
              appointmentData.idCliente,
              appointmentData.idMascota,
              appointmentData.idEmpleado,
              appointmentData.fecha,
              appointmentData.servicios ? appointmentData.servicios.split(',').map(Number) : [],
              appointmentData.comentarios
            );
            console.log(`✅ ${result.message}: ${result.data}`);
          } else if (subAction === 'modifyAppointment') {
            const appointmentData = await promptModifyAppointment();
            const result = await modifyAppointment(
              appointmentData.idCita,
              appointmentData.idCliente,
              appointmentData.idEmpleado || null,
              appointmentData.fecha || null,
              appointmentData.servicios ? appointmentData.servicios.split(',').map(Number) : null,
              appointmentData.comentarios || null
            );
            console.log(`✅ ${result.message}: ${result.data}`);
          } else if (subAction === 'cancelClientAppointment') {
            const appointmentData = await promptCancelClientAppointment();
            const result = await cancelClientAppointment(
              appointmentData.idCita,
              appointmentData.idCliente,
              appointmentData.motivo
            );
            console.log(`✅ ${result.message}: ${result.data}`);
          } else if (subAction === 'listClientAppointments') {
            const appointmentData = await promptListClientAppointments();
            const result = await listClientAppointments(
              appointmentData.idCliente,
              appointmentData.estadoFiltro || null
            );
const citas = result.data.split(';').slice(1).map(cita => {
  const quitarTildes = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const [id_cita, fecha, estado] = cita.split(',').map(quitarTildes);
  return { id_cita, fecha, estado };
});
            console.table(citas);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch((err) => {
  console.error('Error en la aplicación:', err.message);
  process.exit(1);
});