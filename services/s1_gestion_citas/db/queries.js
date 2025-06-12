const {pool} = require('../db.js');
const config = require('../config.js');

async function getAvailableSlots(date, idServicio) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(date);
  if (inputDate < today) {
    throw new Error('La fecha debe ser futura');
  }

  const formattedDate = inputDate.toISOString().split('T')[0];
  const startTime = `${formattedDate} ${config.schedule.startHour}`;
  const endTime = `${formattedDate} ${config.schedule.endHour}`;

  const query = `
    SELECT e.id_empleado, 
           COALESCE(EXTRACT(EPOCH FROM s.tiempo_estimado)/60, $3) AS duracion,
           slots.slot
    FROM empleados e
    CROSS JOIN (
      SELECT generate_series($1::timestamp, $2::timestamp, interval '${config.schedule.slotInterval} minutes') AS slot
    ) slots
    LEFT JOIN citas c ON c.id_empleado = e.id_empleado
      AND c.fecha = slots.slot
      AND c.estado != 'cancelada'
    LEFT JOIN servicios s ON s.id_servicio = $4
    WHERE e.rol = 'veterinario'
      AND c.id_cita IS NULL
    GROUP BY e.id_empleado, slots.slot, s.tiempo_estimado
    ORDER BY slots.slot, e.id_empleado;
  `;
  const values = [startTime, endTime, config.schedule.slotInterval, idServicio || null];
  const result = await pool.query(query, values);
  return result.rows.map(row => ({
    time: row.slot.toISOString(),
    duration: parseInt(row.duracion),
    id_empleado: row.id_empleado,
  }));
}

async function createAppointment({ id_cliente, id_mascota, id_empleado, fecha, servicios, comentarios }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar existencia de cliente, mascota, empleado
    const clienteCheck = await client.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [id_cliente]);
    if (clienteCheck.rows.length === 0) throw new Error('Cliente no encontrado');

    const mascotaCheck = await client.query('SELECT id_mascota FROM mascotas WHERE id_mascota = $1 AND id_cliente = $2', [id_mascota, id_cliente]);
    if (mascotaCheck.rows.length === 0) throw new Error('Mascota no encontrada o no pertenece al cliente');

    const empleadoCheck = await client.query('SELECT id_empleado FROM empleados WHERE id_empleado = $1', [id_empleado]);
    if (empleadoCheck.rows.length === 0) throw new Error('Empleado no encontrado');

    // Validar servicios
    if (servicios.length > 0) {
      const servicioCheck = await client.query('SELECT id_servicio FROM servicios WHERE id_servicio = ANY($1)', [servicios]);
      if (servicioCheck.rows.length !== servicios.length) throw new Error('Uno o más servicios no encontrados');
    }

    const citaQuery = `
      INSERT INTO citas (id_cliente, id_mascota, id_empleado, fecha, estado, comentario)
      VALUES ($1, $2, $3, $4, 'pendiente', $5)
      RETURNING id_cita, estado;
    `;
    const citaResult = await client.query(citaQuery, [id_cliente, id_mascota, id_empleado, fecha, comentarios || null]);
    const id_cita = citaResult.rows[0].id_cita;
    const estado = citaResult.rows[0].estado;

    if (servicios.length > 0) {
      const servicioQuery = `
        INSERT INTO cita_servicios (id_cita_servicio, id_servicio)
        VALUES ($1, $2);
      `;
      for (const id_servicio of servicios) {
        await client.query(servicioQuery, [id_cita, id_servicio]);
      }
    }

    await client.query('COMMIT');
    return { id_cita, estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function modifyAppointment({ id_cita, id_cliente, id_empleado, fecha, servicios, comentarios }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la cita exista y pertenezca al cliente
    const citaCheck = await client.query('SELECT id_cliente FROM citas WHERE id_cita = $1', [id_cita]);
    if (citaCheck.rows.length === 0) throw new Error('Cita no encontrada');
    if (citaCheck.rows[0].id_cliente !== id_cliente) throw new Error('Cita no pertenece al cliente');

    const updates = [];
    const values = [id_cita];
    let index = 2;

    if (id_empleado) {
      const empleadoCheck = await client.query('SELECT id_empleado FROM empleados WHERE id_empleado = $1', [id_empleado]);
      if (empleadoCheck.rows.length === 0) throw new Error('Empleado no encontrado');
      updates.push(`id_empleado = $${index}`);
      values.push(id_empleado);
      index++;
    }
    if (fecha) {
      updates.push(`fecha = $${index}`);
      values.push(fecha);
      index++;
    }
    if (comentarios !== undefined) {
      updates.push(`comentario = $${index}`);
      values.push(comentarios || null);
      index++;
    }
    updates.push(`estado = 'modificada'`);

    if (updates.length === 1) throw new Error('No se proporcionaron datos para modificar');

    const citaQuery = `
      UPDATE citas
      SET ${updates.join(', ')}
      WHERE id_cita = $1
      RETURNING id_cita, estado;
    `;
    const citaResult = await client.query(citaQuery, values);

    if (servicios && servicios.length > 0) {
      const servicioCheck = await client.query('SELECT id_servicio FROM servicios WHERE id_servicio = ANY($1)', [servicios]);
      if (servicioCheck.rows.length !== servicios.length) throw new Error('Uno o más servicios no encontrados');
      await client.query('DELETE FROM cita_servicios WHERE id_cita_servicio = $1', [id_cita]);
      const servicioQuery = `
        INSERT INTO cita_servicios (id_cita_servicio, id_servicio)
        VALUES ($1, $2);
      `;
      for (const id_servicio of servicios) {
        await client.query(servicioQuery, [id_cita, id_servicio]);
      }
    }

    await client.query('COMMIT');
    return { id_cita_modificada: citaResult.rows[0].id_cita, estado_nuevo: citaResult.rows[0].estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cancelClientAppointment(id_cita, id_cliente, motivo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const citaCheck = await client.query('SELECT id_cliente FROM citas WHERE id_cita = $1', [id_cita]);
    if (citaCheck.rows.length === 0) throw new Error('Cita no encontrada');
    if (citaCheck.rows[0].id_cliente !== id_cliente) throw new Error('Cita no pertenece al cliente');

    const query = `
      UPDATE citas
      SET estado = 'cancelada', comentario = COALESCE(comentario, '') || $2
      WHERE id_cita = $1
      RETURNING id_cita, estado;
    `;
    const result = await client.query(query, [id_cita, `\nMotivo de cancelación: ${motivo}`]);

    await client.query('COMMIT');
    return { id_cita_cancelada: result.rows[0].id_cita, estado: result.rows[0].estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listClientAppointments(id_cliente, estado_filtro) {
  const query = `
    SELECT id_cita, fecha, estado
    FROM citas
    WHERE id_cliente = $1
      ${estado_filtro ? 'AND estado = $2' : ''}
    ORDER BY fecha;
  `;
  const values = estado_filtro ? [id_cliente, estado_filtro] : [id_cliente];
  const result = await pool.query(query, values);
  return result.rows.map(row => ({
    id_cita: row.id_cita,
    fecha_hora: row.fecha.toISOString(),
    estado: row.estado,
  }));
}

module.exports = {
  getAvailableSlots,
  createAppointment,
  modifyAppointment,
  cancelClientAppointment,
  listClientAppointments
};