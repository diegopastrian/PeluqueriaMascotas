// s2_gestion_clientes/handlers/authHandler.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta la ruta si es necesario
const { SERVICE_CODE, SERVICE_NAME_CODE, SECRET_KEY } = require('../config');

// Copiamos la lógica de 'registrar' del server.js original aquí.
function handleRegister(fields, socket) {
    // ... (La lógica de validación y de base de datos para registrar es EXACTAMENTE la misma que tenías)
    // ... la copio aquí para que veas que no cambia.
    if (fields.length !== 6) { /* ... enviar error ... */ return; }
    const [, nombre, apellido, correo, password_plain, telefono] = fields;
    if (!nombre || !apellido || !correo || !password_plain || !telefono) { /* ... enviar error ... */ return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) { /* ... enviar error ... */ return; }

    pool.query('SELECT id_cliente FROM clientes WHERE email = $1', [correo], (err, result) => {
        if (err || result.rows.length > 0) { /* ... enviar error de correo existente o de DB ... */ return; }

        bcrypt.hash(password_plain, 10, (err, hashedPassword) => {
            if (err) { /* ... enviar error de hash ... */ return; }

            pool.query(
                `INSERT INTO clientes (nombre, apellido, email, telefono, password, es_invitado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_cliente, email`,
                [nombre, apellido, correo, telefono, hashedPassword, false],
                (err, result) => {
                    if (err) { /* ... enviar error de inserción ... */ return; }
                    const { id_cliente, email } = result.rows[0];
                    console.log(`[${SERVICE_NAME_CODE}] Cliente creado: ID=${id_cliente}, Correo=${email}`);
                    const responseData = `registrar;${id_cliente};${email}`;
                    const response = buildTransaction(SERVICE_CODE, responseData, 'OK');
                    socket.write(response);
                }
            );
        });
    });
}

// Copiamos la lógica de 'login' del server.js original aquí.
function handleLogin(fields, socket) {
    // ... (La lógica de validación y de base de datos para login es EXACTAMENTE la misma que tenías)
    if (fields.length !== 3) { /* ... enviar error ... */ return; }
    const [, correo, password_plain] = fields;
    if (!correo || !password_plain) { /* ... enviar error ... */ return; }

    pool.query('SELECT id_cliente, nombre, password FROM clientes WHERE email = $1', [correo], (err, result) => {
        if (err || result.rows.length === 0) { /* ... enviar error de usuario no encontrado o de DB ... */ return; }

        const user = result.rows[0];
        bcrypt.compare(password_plain, user.password, (err, isValid) => {
            if (err || !isValid) { /* ... enviar error de contraseña incorrecta ... */ return; }

            const token = jwt.sign({ id: user.id_cliente, correo: correo }, SECRET_KEY, { expiresIn: '1h' });
            const responseData = `login;${token};${user.id_cliente};${user.nombre}`;
            const response = buildTransaction(SERVICE_CODE, responseData, 'OK');
            socket.write(response);
        });
    });
}

module.exports = {
    handleRegister,
    handleLogin
};