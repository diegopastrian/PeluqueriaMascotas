const bcrypt = require('bcrypt');
const pool = require('../../../bus_service_helpers/db'); // Apunta al db.js central
const jwt = require('jsonwebtoken');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
require('dotenv').config();

const SERVICE_CODE = 'AUTEM';
const SERVICE_NAME_CODE = 'AUTH_EMPL';
const JWT_SECRET = 'tu_clave_secreta_muy_segura';

async function registerUser(socket, fields) {
    if (fields.length !== 7) { // registrar;nombre;apellido;email;password;telefono;rol
        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Formato invalido: Se esperan 7 campos (registrar;nombre;apellido;email;password;telefono;rol)`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
        return;
    }

    const [, nombre, apellido, email, password, telefono, rol] = fields;

    if (!nombre || !apellido || !email || !password || !telefono || !rol) {
        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Todos los campos son obligatorios`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Email invalido`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
        return;
    }

    try {
        const resultExists = await pool.query(
            'SELECT id_empleado FROM empleados WHERE email = $1',
            [email]
        );
        if (resultExists.rows.length > 0) {
            const errorResponse = buildTransaction(SERVICE_CODE, `registrar;El email ya esta registrado`);
            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
            socket.write(errorResponse);
            return;
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO empleados (nombre, apellido, email, password, rol, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_empleado, email',
            [nombre, apellido, email, hashedPassword, rol, telefono]
        );

        const { id_empleado, email: userEmail } = result.rows[0];
        console.log(`[${SERVICE_NAME_CODE}] Empleado creado: ID=${id_empleado}, Email=${userEmail}`);

        const responseData = `registrar;${id_empleado};${userEmail}`;
        const response = buildTransaction(SERVICE_CODE, responseData);
        console.log(`[${SERVICE_NAME_CODE}] Enviando: ${response}`);
        socket.write(response);
    } catch (err) {
        console.error(`[${SERVICE_NAME_CODE}] Error en registro de empleado: ${err.message}`);
        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Error al registrar el empleado: ${err.message.replace(/[^a-zA-Z0-9 ;,.]/g, '')}`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
    }
}

async function loginUser(socket, fields) {
    if (fields.length !== 3) { // login;email;password
        const errorResponse = buildTransaction(SERVICE_CODE, `login;Formato invalido: Se esperan 3 campos (login;email;password)`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
        return;
    }

    const [, email, password] = fields;

    if (!email || !password) {
        const errorResponse = buildTransaction(SERVICE_CODE, `login;Email y contrasena son obligatorios`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
        return;
    }

    try {
        const result = await pool.query(
            'SELECT id_empleado, nombre, password, rol FROM empleados WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            const errorResponse = buildTransaction(SERVICE_CODE, `login;Email no encontrado`);
            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
            socket.write(errorResponse);
            return;
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            const errorResponse = buildTransaction(SERVICE_CODE, `login;contrasena incorrecta`);
            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
            socket.write(errorResponse);
            return;
        }
        console.log("ESTE ES MI ROLLLLL" + user.rol)
        const token = jwt.sign(
            { id: user.id_empleado, email: email, role: user.rol },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const responseData = `login;${token};${user.id_empleado};${user.nombre}`;
        const response = buildTransaction(SERVICE_CODE, responseData);
        console.log(`[${SERVICE_NAME_CODE}] Enviando: ${response}`);
        socket.write(response);
    } catch (err) {
        console.error(`[${SERVICE_NAME_CODE}] Error en login de empleado: ${err.message}`);
        const errorResponse = buildTransaction(SERVICE_CODE, `login;Error al autenticar: ${err.message.replace(/[^a-zA-Z0-9 ;,.]/g, '')}`);
        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
        socket.write(errorResponse);
    }
}

module.exports = { registerUser, loginUser };