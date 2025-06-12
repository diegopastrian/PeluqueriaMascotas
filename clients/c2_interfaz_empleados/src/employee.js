require('dotenv').config();
const {
  showMainMenu,
  showClientAndPetsMenu,
  showAppointmentsMenu,
  promptRegisterEmployee,
  promptLoginEmployee,
  promptAdjustStock,
  promptAddStock,
  promptQueryStock,
  promptGetAvailableSlots,
  promptCreateAppointment,
  promptModifyAppointment,
  promptCancelClientAppointment,
  promptListClientAppointments,
  promptListClients,
  promptListClientPets,
  promptAgendaAction,
} = require('./ui/adminConsole');
const { registerEmployee, loginEmployee } = require('./actions/authService');
const { adjustStock, addStock, queryStock } = require('./actions/stockService');
const { getAvailableSlots, createAppointment, modifyAppointment, cancelClientAppointment, cancelEmployeeAppointment, listClientAppointments, listEmployeeAgenda, confirmAppointment } = require('./actions/citasservice');
const { listClients, listClientPets } = require('./actions/clientService');
const { mostrarHorariosDisponibles } = require('./extras/mostrarHorariosDisponibles');
const { verifyToken } = require('./extras/verify_token');

const parseCitas = (data) =>
  data.split(';').slice(1).map(cita => {
    const quitarTildes = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const [id_cita, ...rest] = cita.split(',').map(quitarTildes);
    return rest.length > 3
      ? { id_cita, cliente: rest[0], id_mascota: rest[1], mascota: rest[2], fecha_hora: rest[3].substring(0, 16), estado: rest[4], comentario: rest[5] }
      : { id_cita, fecha: rest[0], estado: rest[1] };
  });

const handleResult = (result, displayFn = console.log) =>
  displayFn(`✅ ${result.message}: ${result.data}`);

const handleError = (error) => console.error(`❌ Error: ${error.message}`);

const actions = {

  //autenticacion
  register: async () => handleResult(await registerEmployee(await promptRegisterEmployee())),
  login: async (ctx) => {
    const { token: newToken, id, nombre, message } = await loginEmployee(await promptLoginEmployee());
    const verification = verifyToken(newToken);
    if (!verification.success) throw new Error("Solo empleados pueden acceder alejate de aqui");
    Object.assign(ctx, { token: newToken, employeeId: id, employeeName: nombre });
    console.log(`✅ ${message}`);
  },
  logout: (ctx) => {
    Object.assign(ctx, { token: '', employeeId: '', employeeName: '' });
    console.log('✅ Sesión cerrada');
  },

  ///stockk
  adjustStock: async ({ token }) => handleResult(await adjustStock(token, ...(Object.values(await promptAdjustStock())))),
  addStock: async ({ token }) => handleResult(await addStock(token, ...(Object.values(await promptAddStock())))),
  queryStock: async () => handleResult(await queryStock((await promptQueryStock()).productId)),
  clientAndPets: async () => {
    while (true) {
      const subAction = await showClientAndPetsMenu();
      if (subAction === 'back') break;
      const subActions = {
        listClients: async () => console.table(await listClients()),
        listClientPets: async () => console.table(await listClientPets((await promptListClientPets()).idCliente)),
      };
      await subActions[subAction]?.();
    }
  },

  //gestion citas
  appointments: async ({ employeeId }) => {
    while (true) {
      const subAction = await showAppointmentsMenu();
      if (subAction === 'back') break;
      const subActions = {
        getAvailableSlots: async () => {
          const slotsData = await promptGetAvailableSlots();
          mostrarHorariosDisponibles((await getAvailableSlots(slotsData.date, slotsData.idServicio)).data);
        },
        viewAgenda: async () => {
          if (!employeeId) throw new Error('Debes iniciar sesión para ver tu agenda.');
          const result = await listEmployeeAgenda(employeeId);
          if (result.data === 'listarAgenda;Sin citas programadas') {
            console.log('ℹ️ No tienes citas pendientes.');
            return;
          }
          const citas = parseCitas(result.data);
          console.table(citas);
          while (true) {
            const { action, idCita, motivo } = await promptAgendaAction(citas);
            if (action === 'back') break;
            const agendaActions = {
              confirm: () => confirmAppointment(idCita, employeeId),
              cancel: () => cancelEmployeeAppointment(idCita, employeeId, motivo),
            };
            await handleResult(await agendaActions[action]());
          }
        },
        createAppointment: async () => {
          const data = await promptCreateAppointment();
          handleResult(await createAppointment(
            data.idCliente,
            data.idMascota,
            data.idEmpleado,
            data.fecha,
            data.servicios ? data.servicios.split(',').map(Number) : [],
            data.comentarios
          ));
        },
        modifyAppointment: async () => {
          const data = await promptModifyAppointment();
          handleResult(await modifyAppointment(
            data.idCita,
            data.idCliente,
            data.idEmpleado || null,
            data.fecha || null,
            data.servicios ? data.servicios.split(',').map(Number) : null,
            data.comentarios || null
          ));
        },
        cancelClientAppointment: async () => {
          const data = await promptCancelClientAppointment();
          handleResult(await cancelClientAppointment(data.idCita, data.idCliente, data.motivo));
        },
        listClientAppointments: async () => {
          const data = await promptListClientAppointments();
          handleResult(await listClientAppointments(data.idCliente, data.estadoFiltro || null), (msg) => console.table(parseCitas(msg.split(': ')[1])));
        },
      };
      await subActions[subAction]?.();
    }
  },
};

async function main() {
  const context = { token: '', employeeId: '', employeeName: '' };
  while (true) {
    const action = await showMainMenu(!!context.token);
    if (action === 'exit') {
      console.log('Saliendo del sistema...');
      break;
    }
    try {
      await actions[action]?.(context);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      handleError(error);
    }
  }
}

main().catch((err) => {
  console.error('Error en la aplicación:', err.message);
  process.exit(1);
});
