// services/s2_gestion_clientes/handlers/authHandler.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../../bus_service_helpers/db.js');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
const { SERVICE_CODE, SERVICE_NAME_CODE, SECRET_KEY } = require('../config');

/**
 * Maneja el registro de un nuevo cliente.
 * Operacion: registrar;nombre;apellido;correo;password;telefono
 * @param {string[]} fields - Los datos de la operacion, divididos por ';'.
 * @param {import('net').Socket} socket - El socket para enviar la respuesta al bus.
 */
function handleRegister(fields, socket) {
    if (fields.length !== 6) {
        const responseData = `registrar;Formato invalido: Se esperan 6 campos`;
        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
        socket.write(errorResponse);
        return;
    }

    const [, nombre, apellido, correo, password_plain, telefono] = fields;

    if (!nombre || !apellido || !correo || !password_plain || !telefono) {
        const responseData = `registrar;Todos los campos son obligatorios`;
        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
        socket.write(errorResponse);
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        const responseData = `registrar;Correo invalido`;
        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
        socket.write(errorResponse);
        return;
    }

    // Verificar si el correo ya existe
    pool.query('SELECT id_cliente FROM clientes WHERE email = $1', [correo], (err, result) => {
        if (err) {
            console.error(`[${SERVICE_NAME_CODE}] Error en DB al verificar correo: ${err.message}`);
            const responseData = `registrar;Error interno al verificar el correo`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
            socket.write(errorResponse);
            return;
        }

        if (result.rows.length > 0) {
            const responseData = `registrar;El correo ya esta registrado`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
            socket.write(errorResponse);
            return;
        }

        // Hashear la contraseña
        bcrypt.hash(password_plain, 10, (err, hashedPassword) => {
            if (err) {
                console.error(`[${SERVICE_NAME_CODE}] Error al hashear contrasena: ${err.message}`);
                const responseData = `registrar;Error interno al procesar la contrasena`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
                socket.write(errorResponse);
                return;
            }

            // Insertar el nuevo cliente en la base de datos
            pool.query(
                `INSERT INTO clientes (nombre, apellido, email, telefono, password, es_invitado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_cliente, email`,
                [nombre, apellido, correo, telefono, hashedPassword, false],
                (err, insertResult) => {
                    if (err) {
                        console.error(`[${SERVICE_NAME_CODE}] Error al insertar cliente: ${err.message}`);
                        const responseData = `registrar;Error interno al registrar el cliente`;
                        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
                        socket.write(errorResponse);
                        return;
                    }

                    const { id_cliente, email } = insertResult.rows[0];
                    console.log(`[${SERVICE_NAME_CODE}] Cliente creado: ID=${id_cliente}, Correo=${email}`);
                    const responseData = `registrar;${id_cliente};${email}`;
                    const response = buildTransaction(SERVICE_CODE, responseData, 'OK');
                    socket.write(response);
                }
            );
        });
    });
}

/**
 * Maneja la autenticacion de un cliente.
 * Operacion: login;correo;password
 * @param {string[]} fields - Los datos de la operacion, divididos por ';'.
 * @param {import('net').Socket} socket - El socket para enviar la respuesta al bus.
 */
function handleLogin(fields, socket) {
    if (fields.length !== 3) {
        const responseData = `login;Formato invalido: Se esperan 3 campos`;
        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
        socket.write(errorResponse);
        return;
    }

    const [, correo, password_plain] = fields;

    if (!correo || !password_plain) {
        const responseData = `login;Correo y contrasena son obligatorios`;
        const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
        socket.write(errorResponse);
        return;
    }

    // Buscar usuario por correo
    pool.query('SELECT id_cliente, nombre, password FROM clientes WHERE email = $1', [correo], (err, result) => {
        if (err) {
            console.error(`[${SERVICE_NAME_CODE}] Error en DB durante login: ${err.message}`);
            // --- ¡CAMBIO CLAVE PARA DEPURACIÓN! ---
            // Ahora la respuesta incluye el error real de la base de datos.
            const responseData = `login;Error interno: ${err.message}`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
            socket.write(errorResponse);
            return;
        }

        if (result.rows.length === 0) {
            const responseData = `login;Correo no encontrado`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
            socket.write(errorResponse);
            return;
        }

        const user = result.rows[0];
        // Comparar la contraseña proporcionada con el hash almacenado
        bcrypt.compare(password_plain, user.password, (err, isValid) => {
            if (err) {
                console.error(`[${SERVICE_NAME_CODE}] Error al comparar hash: ${err.message}`);
                const responseData = `login;Error interno al validar credenciales`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
                socket.write(errorResponse);
                return;
            }

            if (!isValid) {
                const responseData = `login;Contrasena incorrecta`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, 'NK');
                socket.write(errorResponse);
                return;
            }

            // Generar JWT si las credenciales son correctas
            const token = jwt.sign({ id: user.id_cliente, correo: correo }, SECRET_KEY, { expiresIn: '1h' });
            const responseData = `login;${token};${user.id_cliente};${user.nombre}`;
            const response = buildTransaction(SERVICE_CODE, responseData, 'OK');
            socket.write(response);
        });
    });
}

// Exportamos las funciones para que puedan ser usadas por server.js
module.exports = {
    handleRegister,
    handleLogin
};