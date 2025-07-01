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
  promptListOrders,
  promptGenerateComprobante,
  promptRegisterService,
} = require('./ui/adminConsole');
const { registerEmployee, loginEmployee } = require('./actions/authService');
const { adjustStock, addStock, queryStock ,consultaglobal, showAllStockTable} = require('./actions/stockService');
const { getAvailableSlots, createAppointment, modifyAppointment, cancelClientAppointment, cancelEmployeeAppointment, listClientAppointments, listEmployeeAgenda, confirmAppointment } = require('./actions/citasservice');
const { listClients, listClientPets } = require('./actions/clientService');
const { listOrders, getOrderDetails } = require('./actions/orden_service');
const { registerService, getPetHistory } = require('./actions/historial_service');
const { generateComprobante } = require('./actions/comprobante_service');
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
  displayFn(`✅ ${result.message}${result.data ? `: ${typeof result.data === 'string' ? result.data : JSON.stringify(result.data)}` : ''}`);

const handleError = (error) => console.error(`❌ Error: ${error.message}`);

const actions = {
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
  adjustStock: async ({ token }) =>{ 
  await showAllStockTable();  
  handleResult(await adjustStock(token, ...(Object.values(await promptAdjustStock()))))
  },
  addStock: async ({ token }) => {
  await showAllStockTable();  
  handleResult(await addStock(token, ...(Object.values(await promptAddStock()))))},
  queryStock: async () => await showAllStockTable(),//handleResult(await queryStock((await promptQueryStock()).productId)),
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
  sales: async () => {
  let exit = false;

  while (!exit) {
    const dataa = await promptListOrders();
    const result = await listOrders(dataa.idCliente);

    if (result.data.length === 0) {
      console.log('ℹ️ No hay órdenes disponibles.');
      return;
    }

    while (true) {
      const { action, idOrden, tipoComprobante, order } = await promptGenerateComprobante(result.data);

      if (action === 'back') {
        exit = true;
        break;
      }

      if (action === 'generate') {
        const response = await generateComprobante(tipoComprobante, idOrden, order.id_cliente);
        handleResult(response);
      }
    }
  }
},
  registerService: async ({ token }) => {
    const data = await promptRegisterService();
    const pets = await listClientPets(data.idCliente);
    if (!pets.length) throw new Error('El cliente no tiene mascotas registradas.');
    console.table(pets);
    const petIds = pets.map(pet => pet.id_mascota);
    const historyResult = await getPetHistory(token, petIds[0]); // Asumimos que las mascotas comparten servicios
    if (historyResult.data.length > 0) {
      console.table(historyResult.data);
    } else {
      console.log('ℹ️ No hay historial de servicios para esta mascota.');
    }
    for (const idMascota of petIds) {
      const serviceResult = await registerService(
        idMascota,
        data.idCita || '',
        data.idsServicios.split(',').map(Number),
        data.fecha || new Date().toISOString().split('T')[0],
        data.comentarios || ''
      );
      handleResult(serviceResult);
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