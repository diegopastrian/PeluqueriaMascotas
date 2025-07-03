const pool = require('../../../bus_service_helpers/db.js');
const config = require('../config.js');

async function getAvailableSlots(date, idServicio) {
  // Sin cambios, ya corregido en la respuesta anterior
}

async function createAppointment({ id_cliente, id_mascota, id_empleado, fecha, servicios, comentarios }) {
  // Sin cambios
}

async function modifyAppointment({ id_cita, id_cliente, id_empleado, fecha, servicios, comentarios }) {
  // Sin cambios
}



async function cancelEmployeeAppointment(id_cita, id_empleado, motivo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const citaCheck = await client.query('SELECT id_empleado FROM citas WHERE id_cita = $1', [id_cita]);
    if (citaCheck.rows.length === 0) throw new Error('Cita no encontrada');
    if (citaCheck.rows[0].id_empleado !== id_empleado) throw new Error('Cita no asignada al empleado');

    const query = `
      UPDATE citas
      SET estado = 'cancelada', comentario = COALESCE(comentario, '') || $2
      WHERE id_cita = $1
      RETURNING id_cita, estado;
    `;
    const result = await client.query(query, [id_cita, `\nMotivo de cancelación (empleado): ${motivo}`]);

    await client.query('COMMIT');
    return { id_cita_cancelada: result.rows[0].id_cita, estado: result.rows[0].estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


async function listEmployeeAgenda(id_empleado) {
  const query = `
    SELECT c.id_cita, c.id_cliente, c.id_mascota, c.fecha, c.estado, c.comentario,
           cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido,
           m.nombre AS mascota_nombre
    FROM citas c
    LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
    LEFT JOIN mascotas m ON c.id_mascota = m.id_mascota
    WHERE c.id_empleado = $1
      AND c.estado = 'pendiente'
    ORDER BY c.fecha;
  `;
  const result = await pool.query(query, [id_empleado]);
  return result.rows.map(row => ({
    id_cita: row.id_cita,
    id_cliente: row.id_cliente,
    cliente: `${row.cliente_nombre} ${row.cliente_apellido}`,
    id_mascota: row.id_mascota,
    mascota: row.mascota_nombre,
    fecha_hora: row.fecha.toISOString(),
    estado: row.estado,
    comentario: row.comentario || '',
  }));
}

async function confirmAppointment(id_cita, id_empleado) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la cita exista y esté asignada al empleado
    const citaCheck = await client.query('SELECT id_empleado FROM citas WHERE id_cita = $1', [id_cita]);
    if (citaCheck.rows.length === 0) throw new Error('Cita no encontrada');
    if (citaCheck.rows[0].id_empleado !== id_empleado) throw new Error('Cita no asignada al empleado');

    const query = `
      UPDATE citas
      SET estado = 'confirmada'
      WHERE id_cita = $1
      RETURNING id_cita, estado;
    `;
    const result = await client.query(query, [id_cita]);

    await client.query('COMMIT');
    return { id_cita_confirmada: result.rows[0].id_cita, estado: result.rows[0].estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  cancelEmployeeAppointment,
  listEmployeeAgenda,
  confirmAppointment,
};
