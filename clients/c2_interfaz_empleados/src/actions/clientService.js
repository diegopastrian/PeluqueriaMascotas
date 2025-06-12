const {pool} = require('../../../../bus_service_helpers/db.js');

async function listClients() {
  const query = `
    SELECT id_cliente, nombre, apellido, email
    FROM clientes
    ORDER BY id_cliente;
  `;
  const result = await pool.query(query);
  return result.rows.map(row => ({
    id_cliente: row.id_cliente,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
  }));
}

async function listClientPets(idCliente) {
  const query = `
    SELECT id_mascota, nombre, especie, raza
    FROM mascotas
    WHERE id_cliente = $1
    ORDER BY id_mascota;
  `;
  const result = await pool.query(query, [idCliente]);
  return result.rows.map(row => ({
    id_mascota: row.id_mascota,
    nombre: row.nombre,
    especie: row.especie,
    raza: row.raza || 'N/A',
  }));
}

module.exports = {
  listClients,
  listClientPets,
};