// services/s2_gestion_clientes/handlers/petHandler.js

const pool = require('../../../bus_service_helpers/db.js');
const jwtHelper = require('../helpers/jwtHelper');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');

const SERVICE_NAME = 'CLIEN';

async function handleCreatePet(fields, socket) {
    try {
        const [, token, nombre, especie, raza, edad] = fields;

        if (!token || !nombre || !raza || !especie || !edad) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASCR;Faltan parametros', 'NK'));
        }

        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASCR;Token invalido', 'NK'));
        }

        const { id_cliente } = decoded;

        // Usamos RETURNING id_mascota para obtener el ID de la nueva mascota en PostgreSQL
        const result = await pool.query(
            'INSERT INTO Mascotas (id_cliente, nombre, especie, raza, edad) VALUES ($1, $2, $3, $4, $5) RETURNING id_mascota',
            [id_cliente, nombre, especie, raza, edad]
        );

        const newPetId = result.rows[0].id_mascota;
        const responseData = `MASCR;${newPetId}`;
        console.log(`Mascota creada: ID=${newPetId}, Cliente=${id_cliente}`);
        socket.write(buildTransaction(SERVICE_NAME, responseData, 'OK'));

    } catch (error) {
        console.error('Error en handleCreatePet:', error);
        socket.write(buildTransaction(SERVICE_NAME, 'error;MASCR;Error interno del servidor', 'NK'));
    }
}

// Operacion: MASLI;token
async function handleListPets(fields, socket) {
    try {
        const [, token] = fields;
        if (!token) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASLI;Token no proporcionado', 'NK'));
        }

        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASLI;Token invalido', 'NK'));
        }

        const { id_cliente } = decoded;
        const result = await pool.query(
            'SELECT id_mascota, nombre, especie, raza, edad FROM Mascotas WHERE id_cliente = $1',
            [id_cliente]
        );

        // Enviamos los resultados como un string JSON, tal como lo documentamos.
        const responseData = `MASLI;${JSON.stringify(result.rows)}`;
        console.log(`Mascotas encontradas para el cliente ID=${id_cliente}: ${result.rows.length}`);
        socket.write(buildTransaction(SERVICE_NAME, responseData, 'OK'));

    } catch (error) {
        console.error('Error en handleListPets:', error);
        socket.write(buildTransaction(SERVICE_NAME, 'error;MASLI;Error interno del servidor', 'NK'));
    }
}

async function handleUpdatePet(fields, socket) {
    try {
        const [, token, id_mascota, nombre, especie, raza, edad]  = fields;

        if (!token || !nombre || !raza || !especie || !edad) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASUP;Faltan parametros', 'NK'));
        }

        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASUP;Token invalido', 'NK'));
        }
        
        const { id_cliente } = decoded;

        // Actualizamos la mascota, asegurandonos de que pertenezca al cliente (por id_cliente)
        const result = await pool.query(
            'UPDATE Mascotas SET nombre = $1, especie = $2, raza = $3, edad = $4 WHERE id_mascota = $5 AND id_cliente = $6',
            [nombre, especie, raza, edad, id_mascota, id_cliente]
        );
        if (result.rowCount === 0) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASUP;Mascota no encontrada o sin permiso', 'NK'));
        }
        console.log(`Mascota actualizada: ID=${id_mascota}, Cliente=${id_cliente}`);
        socket.write(buildTransaction(SERVICE_NAME, 'MASUP;MASCOTA_ACTUALIZADA', 'OK'));

    } catch (error) {
        console.error('Error en handleUpdatePet:', error);
        socket.write(buildTransaction(SERVICE_NAME, 'error;MASUP;Error interno del servidor', 'NK'));
    }
}

// Operacion: MASDE;token;id_mascota
async function handleDeletePet(fields, socket) {
    try {
        const [, token, id_mascota] = fields;
        if (!token || !id_mascota) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASDE;Faltan parametros', 'NK'));
        }

        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASDE;Token invalido', 'NK'));
        }

        const { id_cliente } = decoded;

        // Eliminamos la mascota, asegurandonos de que pertenezca al cliente
        const result = await pool.query(
            'DELETE FROM Mascotas WHERE id_mascota = $1 AND id_cliente = $2',
            [id_mascota, id_cliente]
        );

        if (result.rowCount === 0) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASDE;Mascota no encontrada o sin permiso', 'NK'));
        }
        console.log(`Mascota eliminada: ID=${id_mascota}, Cliente=${id_cliente}`);
        socket.write(buildTransaction(SERVICE_NAME, 'MASDE;MASCOTA_ELIMINADA', 'OK'));
    } catch (error) {
        console.error('Error en handleDeletePet:', error);
        socket.write(buildTransaction(SERVICE_NAME, 'error;MASDE;Error interno del servidor', 'NK'));
    }
}

async function handleGetSinglePet(fields, socket) {
    try {
        const [, token, id_mascota] = fields;
        if (!token || !id_mascota) {
            return socket.write(buildTransaction(SERVICE_NAME,'error;MASGE;Faltan parametros','NK'));
        }

        const decoded = jwtHelper.verifyToken(token);
        if (!decoded) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASGE;Token invalido','NK'));
        }

        const { id_cliente } = decoded;

        // Buscamos la mascota por su ID, asegurandonos de que pertenezca al cliente logueado
        const result = await pool.query(
            'SELECT id_mascota, nombre, especie, raza, edad FROM Mascotas WHERE id_mascota = $1 AND id_cliente = $2',
            [id_mascota, id_cliente]
        );
        if (result.rows.length === 0) {
            return socket.write(buildTransaction(SERVICE_NAME, 'error;MASGE;Mascota no encontrada o sin permiso', 'NK'));
        }

        const petData = result.rows[0];
        const responseData = `MASGE;${JSON.stringify(petData)}`;
        console.log(`Mascota encontrada: ID=${id_mascota}, Cliente=${id_cliente}`);
        socket.write(buildTransaction(SERVICE_NAME, responseData, 'OK'));

    } catch (error) {
        console.error('Error en handleGetSinglePet:', error);
        socket.write(buildTransaction(SERVICE_NAME, 'error;MASGE;Error interno del servidor', 'NK'));
    }
}

module.exports = {
    handleCreatePet,
    handleListPets,
    handleUpdatePet,
    handleDeletePet,
    handleGetSinglePet
};