// s2_gestion_clientes/handlers/authHandler.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../../bus_service_helpers/db'); // no cambiear esta ruta, ahí esta la conexión a la base de datos
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta esta ruta si tu estructura es diferente
const { SERVICE_CODE, SERVICE_NAME_CODE, SECRET_KEY } = require('../config');

/**
 * Maneja el registro de un nuevo cliente.
 * Operacion: registrar;nombre;apellido;correo;password;telefono
 * @param {string[]} fields - Los datos de la operacion, divididos por ';'.
 * @param {net.Socket} socket - El socket para enviar la respuesta al bus.
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
 * @param {net.Socket} socket - El socket para enviar la respuesta al bus.
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
    pool.query(  `
  SELECT id_cliente, nombre, password, NULL AS rol, 'cliente' AS tipo
  FROM clientes
  WHERE email = $1

  UNION ALL

  SELECT id_empleado, nombre, password, rol, 'empleado' AS tipo
  FROM empleados
  WHERE email = $1

  LIMIT 1
  `, [correo], (err, result) => {
        if (err) {
            console.error(`[${SERVICE_NAME_CODE}] Error en DB durante login: ${err.message}`);
            const responseData = `login;Error interno al autenticar`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData);
            socket.write(errorResponse);
            return;
        }
      //  console.log("es es el valor de rowwwwwwwwwwwwsssss" + result.rows.length);
        if (result.rows.length === 0) {
            const responseData = `login;Correo no encontrado`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData);
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
            const token = jwt.sign({ id: user.id_cliente, correo: correo, role: user.rol }, SECRET_KEY, { expiresIn: '1h' });
            const responseData = `login;${token};${user.id_cliente};${user.nombre}`;
            const response = buildTransaction(SERVICE_CODE, responseData);
            console.log(response);
            socket.write(response);
        });
    });
}
async function handleRegister_employee(fields, socket) {
    if (fields.length !== 7) { // registrar;nombre;apellido;email;password;telefono;rol
        const errorResponse = buildTransaction(SERVICE_CODE, `registrar_empleado;Formato invalido: Se esperan 7 campos (registrar;nombre;apellido;email;password;telefono;rol)`);
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

        const responseData = `registrar_empleado;${id_empleado};${userEmail}`;
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
    

// Exportamos las funciones para que puedan ser usadas por server.js
module.exports = {
    handleRegister,
    handleLogin,
    handleRegister_employee,
    
};
