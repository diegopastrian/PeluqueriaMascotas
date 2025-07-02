const { getAvailableSlots, createAppointment, modifyAppointment, cancelClientAppointment, listClientAppointments } = require('../db/queries.js');
const { cancelEmployeeAppointment ,  listEmployeeAgenda, confirmAppointment} = require('../db/queries_empelados.js');

async function handleHorarios(fields) {
  if (fields.length !== 2 && fields.length !== 3) {
    return `horarios;Formato inválido: Se esperan 2 o 3 campos (horarios;YYYY-MM-DD;[id_servicio])`;
  }

  const [, date, id_servicio] = fields;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return `horarios;Fecha inválida (formato YYYY-MM-DD requerido)`;
  }

  try {
    const slots = await getAvailableSlots(date, id_servicio ? parseInt(id_servicio) : null);
    const slotsStr = slots.map(slot => `${slot.time},${slot.duration},${slot.id_empleado}`).join(';');
    return `horarios;${slotsStr}`;
  } catch (err) {
    console.error(`Error al obtener horarios: ${err.message}`);
    return `horarios;Error al obtener horarios`;
  }
}

async function handleCrear(fields) {
  if (fields.length < 6 || fields.length > 7) {
    return `crear;Formato inválido: Se esperan 6 o 7 campos (crear;id_cliente;id_mascota;id_empleado;YYYY-MM-DDTHH:MM;id_servicio1,...;[comentarios])`;
  }

  const [, id_cliente, id_mascota, id_empleado, fecha, serviciosStr, comentarios] = fields;
  const idClienteNum = parseInt(id_cliente);
  const idMascotaNum = parseInt(id_mascota);
  const idEmpleadoNum = parseInt(id_empleado);
  const servicios = serviciosStr ? serviciosStr.split(',').map(Number).filter(n => !isNaN(n)) : [];

  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (isNaN(idClienteNum) || isNaN(idMascotaNum) || isNaN(idEmpleadoNum) || !dateTimeRegex.test(fecha)) {
    return `crear;Datos inválidos`;
  }

  try {
    const result = await createAppointment({
      id_cliente: idClienteNum,
      id_mascota: idMascotaNum,
      id_empleado: idEmpleadoNum,
      fecha,
      servicios,
      comentarios,
    });
    return `crear;${result.id_cita};${result.estado}`;
  } catch (err) {
    console.error(`Error al crear cita: ${err.message}`);
    return `crear;${err.message}`;
  }
}

async function handleModificar(fields) {
  if (fields.length < 3 || fields.length > 7) {
    return `modificar;Formato inválido: Se esperan 3 a 7 campos (modificar;id_cita;id_cliente;[id_empleado];[YYYY-MM-DDTHH:MM];[id_servicio1,...];[comentarios])`;
  }

  const [, id_cita, id_cliente, id_empleado, fecha, serviciosStr, comentarios] = fields;
  const idCitaNum = parseInt(id_cita);
  const idClienteNum = parseInt(id_cliente);
  const idEmpleadoNum = id_empleado ? parseInt(id_empleado) : null;
  const servicios = serviciosStr ? serviciosStr.split(',').map(Number).filter(n => !isNaN(n)) : null;

  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (isNaN(idCitaNum) || isNaN(idClienteNum) || (id_empleado && isNaN(idEmpleadoNum)) || (fecha && !dateTimeRegex.test(fecha))) {
    return `modificar;Datos inválidos`;
  }

  try {
    const result = await modifyAppointment({
      id_cita: idCitaNum,
      id_cliente: idClienteNum,
      id_empleado: idEmpleadoNum,
      fecha,
      servicios,
      comentarios,
    });
    return `modificar;${result.id_cita_modificada};${result.estado_nuevo}`;
  } catch (err) {
    console.error(`Error al modificar cita: ${err.message}`);
    return `modificar;${err.message}`;
  }
}

async function handleCancelar(fields) {
  if (fields.length !== 4) {
    return `cancelar;Formato inválido: Se esperan 4 campos (cancelar;id_cita;id_cliente;motivo_cancelacion)`;
  }

  const [, id_cita, id_cliente, motivo] = fields;
  const idCitaNum = parseInt(id_cita);
  const idClienteNum = parseInt(id_cliente);

  if (isNaN(idCitaNum) || isNaN(idClienteNum) || !motivo) {
    return `cancelar;Datos inválidos`;
  }

  try {
    const result = await cancelClientAppointment(idCitaNum, idClienteNum, motivo);
    return `cancelar;${result.id_cita_cancelada};${result.estado}`;
  } catch (err) {
    console.error(`Error al cancelar cita: ${err.message}`);
    return `cancelar;${err.message}`;
  }
}

async function handleCancelarEmp(fields) {
  if (fields.length !== 4) {
    return `cancelarEmp;Formato inválido: Se esperan 4 campos (cancelarEmp;id_cita;id_empleado;motivo_cancelacion)`;
  }

  const [, id_cita, id_empleado, motivo] = fields;
  const idCitaNum = parseInt(id_cita);
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idCitaNum) || isNaN(idEmpleadoNum) || !motivo) {
    return `cancelarEmp;Datos inválidos`;
  }

  try {
    const result = await cancelEmployeeAppointment(idCitaNum, idEmpleadoNum, motivo);
    return `cancelarEmp;${result.id_cita_cancelada};${result.estado}`;
  } catch (err) {
    console.error(`Error al cancelar cita (empleado): ${err.message}`);
    return `cancelarEmp;${err.message}`;
  }
}

async function handleListar(fields) {
  if (fields.length !== 2 && fields.length !== 3) {
    return `listar;Formato inválido: Se esperan 2 o 3 campos (listar;id_cliente;[estado_filtro])`;
  }

  const [, id_cliente, estado_filtro] = fields;
  const idClienteNum = parseInt(id_cliente);

  if (isNaN(idClienteNum)) {
    return `listar;ID de cliente inválido`;
  }

  try {
    const citas = await listClientAppointments(idClienteNum, estado_filtro || null);

    // ⚠️ Aquí revisas si el array está vacío
    if (citas.length === 0) {
      return `listar;Sin citas de este tipo :(`;
    }

    const citasStr = citas.map(cita => `${cita.id_cita},${cita.fecha_hora},${cita.estado}`).join(';');
    return `listar;${citasStr}`;
  } catch (err) {
    console.error(`Error al listar citas: ${err.message}`);
    return `listar;${err.message}`;
  }
}


async function handleListarAgenda(fields) {
  if (fields.length !== 2) {
    return `listarAgenda;Formato inválido: Se esperan 2 campos (listarAgenda;id_empleado)`;
  }

  const [, id_empleado] = fields;
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idEmpleadoNum)) {
    return `listarAgenda;Datos inválidos`;
  }

  try {
    const citas = await listEmployeeAgenda(idEmpleadoNum);
    const citasStr = citas.map(cita => 
      `${cita.id_cita},${cita.cliente},${cita.id_mascota},${cita.mascota},${cita.fecha_hora},${cita.estado},${cita.comentario.replace(/;/g, ',')}`
    ).join(';');
    return `listarAgenda;${citasStr || 'Sin citas programadas'}`;
  } catch (err) {
    console.error(`Error al listar agenda: ${err.message}`);
    return `listarAgenda;${err.message}`;
  }
}

async function handleConfirmar(fields) {
  if (fields.length !== 3) {
    return `confirmar;Formato inválido: Se esperan 3 campos (confirmar;id_cita;id_empleado)`;
  }

  const [, id_cita, id_empleado] = fields;
  const idCitaNum = parseInt(id_cita);
  const idEmpleadoNum = parseInt(id_empleado);

  if (isNaN(idCitaNum) || isNaN(idEmpleadoNum)) {
    return `confirmar;Datos inválidos`;
  }

  try {
    const result = await confirmAppointment(idCitaNum, idEmpleadoNum);
    return `confirmar;${result.id_cita_confirmada};${result.estado}`;
  } catch (err) {
    console.error(`Error al confirmar cita: ${err.message}`);
    return `confirmar;${err.message}`;
  }
}
module.exports = {
  handleHorarios,
  handleCrear,
  handleModificar,
  handleCancelar,
  handleCancelarEmp,
  handleListar,
  handleListarAgenda,
  handleConfirmar,
};