// Importamos todo el módulo de queries para clientes y para empleados
const clientQueries = require('../db/queries.js');
const employeeQueries = require('../db/queries_empelados.js');

// --- NUEVO HANDLER PARA EL FLUJO DE CLIENTE ---

/**
 * Maneja la petición para ver la disponibilidad de un día específico.
 * Llama a la función de base de datos y formatea la respuesta como un JSON.
 * Operación: verdia;YYYY-MM-DD;id_servicio
 */
async function handleVerDia(fields) {
  if (fields.length !== 3) {
    // Lanzar un error es mejor que devolver un string de error,
    // ya que la capa superior (server.js) lo puede manejar y formatear correctamente.
    throw new Error('Formato inválido. Se esperan 3 campos (verdia;YYYY-MM-DD;id_servicio)');
  }
  const [, date, idServicioStr] = fields;
  const idServicio = parseInt(idServicioStr);

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || isNaN(idServicio)) {
    throw new Error('Datos inválidos. Asegúrate de que la fecha sea YYYY-MM-DD y el ID del servicio sea un número.');
  }

  // No usamos try/catch aquí. Si getDailyAvailability falla, la excepción
  // subirá a server.js, que la capturará y enviará una respuesta NK.
  const availability = await clientQueries.getDailyAvailability(date, idServicio);

  // Devolvemos el payload de datos. El prefijo 'verdia;' y el status 'OK'
  // se añadirán en la capa del servidor.
  return `verdia;${JSON.stringify(availability)}`;
}


// --- HANDLERS ORIGINALES (Mantenidos para posible uso futuro) ---

async function handleHorarios(fields) {
  if (fields.length !== 2 && fields.length !== 3) {
    throw new Error('Formato inválido: Se esperan 2 o 3 campos (horarios;YYYY-MM-DD;[id_servicio])');
  }

  const [, date, id_servicio] = fields;
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error('Fecha inválida (formato YYYY-MM-DD requerido)');
  }

  const slots = await clientQueries.getAvailableSlots(date, id_servicio ? parseInt(id_servicio) : null);
  const slotsStr = slots.map(slot => `${slot.time},${slot.duration},${slot.id_empleado}`).join(';');
  return `horarios;${slotsStr}`;
}

async function handleCrear(fields) {
  if (fields.length < 6 || fields.length > 7) {
    throw new Error('Formato inválido: Se esperan 6 o 7 campos (crear;id_cliente;id_mascota;id_empleado;YYYY-MM-DDTHH:MM:SS;id_servicio1,...;[comentarios])');
  }

  const [, id_cliente, id_mascota, id_empleado, fecha, serviciosStr, comentarios] = fields;
  const idClienteNum = parseInt(id_cliente);
  const idMascotaNum = parseInt(id_mascota);
  const idEmpleadoNum = parseInt(id_empleado);
  // El servicio ahora espera un array de servicios, incluso si es solo uno.
  const servicios = serviciosStr ? serviciosStr.split(',').map(Number).filter(n => !isNaN(n)) : [];

  if (isNaN(idClienteNum) || isNaN(idMascotaNum) || isNaN(idEmpleadoNum) || !fecha.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
    throw new Error('Datos inválidos. Revisa los IDs y el formato de fecha (YYYY-MM-DDTHH:MM:SS)');
  }

  const result = await clientQueries.createAppointment({
    id_cliente: idClienteNum,
    id_mascota: idMascotaNum,
    id_empleado: idEmpleadoNum,
    fecha,
    servicios,
    comentarios,
  });
  return `crear;${result.id_cita};${result.estado}`;
}

async function handleModificar(fields) {
  if (fields.length < 3 || fields.length > 7) {
    throw new Error('Formato inválido: Se esperan 3 a 7 campos');
  }

  const [, id_cita, id_cliente, id_empleado, fecha, serviciosStr, comentarios] = fields;
  const idCitaNum = parseInt(id_cita);
  const idClienteNum = parseInt(id_cliente);
  const idEmpleadoNum = id_empleado ? parseInt(id_empleado) : null;
  const servicios = serviciosStr ? serviciosStr.split(',').map(Number).filter(n => !isNaN(n)) : null;

  if (isNaN(idCitaNum) || isNaN(idClienteNum) || (id_empleado && isNaN(idEmpleadoNum))) {
    throw new Error('Datos inválidos');
  }

  const result = await clientQueries.modifyAppointment({
    id_cita: idCitaNum,
    id_cliente: idClienteNum,
    id_empleado: idEmpleadoNum,
    fecha,
    servicios,
    comentarios,
  });
  return `modificar;${result.id_cita_modificada};${result.estado_nuevo}`;
}

async function handleCancelar(fields) {
  if (fields.length !== 4) {
    throw new Error('Formato inválido: Se esperan 4 campos');
  }

  const [, id_cita, id_cliente, motivo] = fields;
  const idCitaNum = parseInt(id_cita);
  const idClienteNum = parseInt(id_cliente);

  if (isNaN(idCitaNum) || isNaN(idClienteNum) || !motivo) {
    throw new Error('Datos inválidos');
  }

  const result = await clientQueries.cancelClientAppointment(idCitaNum, idClienteNum, motivo);
  return `cancelar;${result.id_cita_cancelada};${result.estado}`;
}

async function handleCancelarEmp(fields) {
  if (fields.length !== 4) {
    throw new Error('Formato inválido: Se esperan 4 campos');
  }

  const [, id_cita, id_empleado, motivo] = fields;
  const idCitaNum = parseInt(id_cita);
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idCitaNum) || isNaN(idEmpleadoNum) || !motivo) {
    throw new Error('Datos inválidos');
  }

  const result = await employeeQueries.cancelEmployeeAppointment(idCitaNum, idEmpleadoNum, motivo);
  return `cancelarEmp;${result.id_cita_cancelada};${result.estado}`;
}

async function handleListar(fields) {
  if (fields.length !== 2 && fields.length !== 3) {
    throw new Error('Formato inválido: Se esperan 2 o 3 campos');
  }

  const [, id_cliente, estado_filtro] = fields;
  const idClienteNum = parseInt(id_cliente);

  if (isNaN(idClienteNum)) {
    throw new Error('ID de cliente inválido');
  }

  const citas = await clientQueries.listClientAppointments(idClienteNum, estado_filtro || null);
  const citasStr = citas.map(cita => `${cita.id_cita},${cita.fecha_hora},${cita.estado}`).join(';');
  return `listar;${citasStr}`;
}
async function handleListarAgenda(fields) {
  if (fields.length !== 2) {
    throw new Error('Formato inválido: Se esperan 2 campos');
  }

  const [, id_empleado] = fields;
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idEmpleadoNum)) {
    throw new Error('Datos inválidos');
  }

  const citas = await employeeQueries.listEmployeeAgenda(idEmpleadoNum);
  const citasStr = citas.map(cita =>
      `${cita.id_cita},${cita.cliente},${cita.id_mascota},${cita.mascota},${cita.fecha_hora},${cita.estado},${(cita.comentario || '').replace(/;/g, ',')}`
  ).join(';');
  return `listarAgenda;${citasStr || 'Sin citas programadas'}`;
}

async function handleConfirmar(fields) {
  if (fields.length !== 3) {
    throw new Error('Formato inválido: Se esperan 3 campos');
  }

  const [, id_cita, id_empleado] = fields;
  const idCitaNum = parseInt(id_cita);
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idCitaNum) || isNaN(idEmpleadoNum)) {
    throw new Error('Datos inválidos');
  }

  const result = await employeeQueries.confirmAppointment(idCitaNum, idEmpleadoNum);
  return `confirmar;${result.id_cita_confirmada};${result.estado}`;
}

// Exportamos todas las funciones para que server.js las pueda usar.
module.exports = {
  handleHorarios,
  handleCrear,
  handleModificar,
  handleCancelar,
  handleCancelarEmp,
  handleListar,
  handleListarAgenda,
  handleConfirmar,
  handleVerDia, // Exportamos la nueva función
};