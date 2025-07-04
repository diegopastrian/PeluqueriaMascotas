const pool = require('../../../bus_service_helpers/db.js');
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

/**
 * Obtiene la disponibilidad de horarios para una semana completa a partir de una fecha dada,
 * considerando la duración del servicio y agrupando los veterinarios disponibles por slot.
 * @param {string} startDateStr - La fecha de inicio de la semana (formato YYYY-MM-DD).
 * @param {number} idServicio - El ID del servicio para calcular la duración.
 * @returns {Promise<object>} - Un objeto con la disponibilidad semanal.
 */
/**
 * Obtiene la disponibilidad de horarios para UN SOLO DÍA,
 * considerando la duración del servicio.
 * @param {string} dateStr - La fecha a consultar (formato YYYY-MM-DD).
 * @param {number} idServicio - El ID del servicio para calcular la duración.
 * @returns {Promise<object>} - Un objeto con los horarios y los veterinarios disponibles.
 */
async function getDailyAvailability(dateStr, idServicio) {
  // 1. Obtener la duración del servicio
  const serviceResult = await pool.query('SELECT tiempo_estimado FROM servicios WHERE id_servicio = $1', [idServicio]);
  if (serviceResult.rows.length === 0) {
    throw new Error('Servicio no encontrado');
  }
  const serviceDurationInterval = serviceResult.rows[0].tiempo_estimado;

  // 2. Consulta simplificada sin manipulación de zona horaria
  const query = `
    WITH
      PossibleSlots AS (
        SELECT generate_series(
                 -- Usamos timestamp simple, que tomará la zona horaria del servidor de la DB
                   ($1::date + $2::time)::timestamp,
                   ($1::date + $3::time - $4::interval)::timestamp,
                   '30 minutes'::interval
               ) AS slot_start
      ),
      BookedRanges AS (
        SELECT
          c.id_empleado,
          c.fecha AS start_time,
          (c.fecha + COALESCE(SUM(s.tiempo_estimado), '60 minutes'::interval)) AS end_time
        FROM citas c
               LEFT JOIN cita_servicios cs ON c.id_cita = cs.id_cita_servicio
               LEFT JOIN servicios s ON cs.id_servicio = s.id_servicio
        WHERE c.estado != 'cancelada' AND c.fecha::date = $1::date
        GROUP BY c.id_cita
      )
    SELECT
      -- Devolvemos la hora tal cual, sin conversión
      to_char(ps.slot_start, 'HH24:MI:SS') AS appointment_time,
      e.id_empleado,
      e.nombre AS vet_nombre,
      e.apellido AS vet_apellido
    FROM PossibleSlots ps
           CROSS JOIN empleados e
    WHERE
      e.rol = 'veterinario'
      AND NOT EXISTS (
      SELECT 1
      FROM BookedRanges br
      WHERE br.id_empleado = e.id_empleado
        AND ps.slot_start < br.end_time
        AND (ps.slot_start + $4::interval) > br.start_time
    )
    ORDER BY appointment_time, e.id_empleado;
  `;

  const values = [
    dateStr,
    config.schedule.startHour,
    config.schedule.endHour,
    serviceDurationInterval
  ];

  const result = await pool.query(query, values);

  // 3. Formatear la respuesta
  const availability = {};
  for (const row of result.rows) {
    const { appointment_time, id_empleado, vet_nombre, vet_apellido } = row;
    if (!availability[appointment_time]) {
      availability[appointment_time] = [];
    }
    availability[appointment_time].push({ id: id_empleado, nombre: `${vet_nombre} ${vet_apellido}` });
  }

  return availability;
}




module.exports = {
  getAvailableSlots,
  createAppointment,
  modifyAppointment,
  cancelClientAppointment,
  listClientAppointments,
  getDailyAvailability
};
