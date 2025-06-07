// server.js
const net = require('net');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const pool = require('./db');

// Configuración del Bus de Servicios
const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

// Código del servicio
const SERVICE_CODE = 'CLIEN';
const SERVICE_NAME_CODE = 'AUTH'; // Nombre para logs

// Clave secreta para JWT (en producción, usa una variable de entorno)
const SECRET_KEY = 'tu_clave_secreta_muy_segura';

// Conexión al Bus
const serviceSocketToBus = new net.Socket();

// Función para enviar SINIT
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    console.log(`[${SERVICE_NAME_CODE}] Enviando transacción de activación: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);

    const onData = (data) => {
        const response = data.toString();
        console.log(`[${SERVICE_NAME_CODE}] Respuesta SINIT recibida: ${response}`);
        try {
            const parsed = parseResponse(response);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                console.log(`[${SERVICE_NAME_CODE}] Servicio ${SERVICE_CODE} activado correctamente`);
                serviceSocketToBus.removeListener('data', onData);
                callback(null);
            } else {
                console.error(`[${SERVICE_NAME_CODE}] Fallo en SINIT: ${response}`);
                serviceSocketToBus.removeListener('data', onData);
                callback(new Error(`Fallo en SINIT ${SERVICE_CODE}: ${response}`));
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error parseando SINIT: ${error.message}`);
            serviceSocketToBus.removeListener('data', onData);
            callback(error);
        }
    };

    serviceSocketToBus.on('data', onData);
}

serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[${SERVICE_NAME_CODE}] Conectado al Bus en ${BUS_HOST}:${BUS_PORT}`);
    sendSinit((error) => {
        if (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error durante la activación: ${error.message}`);
            serviceSocketToBus.destroy();
            return;
        }
        console.log(`[${SERVICE_NAME_CODE}] Listo para procesar transacciones`);
    });
});

serviceSocketToBus.on('data', (data) => {
    const rawData = data.toString();
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];
    for (const message of messages) {
        if (message.length < 10) continue;
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${message}`);

        try {
            const parsed = parseResponse(message);

            if (parsed.serviceName === 'sinit') {
                continue;
            }

            if (parsed.serviceName !== SERVICE_CODE) {
                console.log(`[${SERVICE_NAME_CODE}] Servicio desconocido: ${parsed.serviceName}`);
                const errorResponse = buildTransaction(SERVICE_CODE, `Servicio incorrecto`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const fields = parsed.data.split(';');
            console.log(`[${SERVICE_NAME_CODE}] Número de campos: ${fields.length}`);
            if (fields.length < 1) {
                const errorResponse = buildTransaction(SERVICE_CODE, `Formato invalido: Se espera operación`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const operation = fields[0];
            console.log(`[${SERVICE_NAME_CODE}] Procesando operación: ${operation} con datos: ${parsed.data}`);

            // --- Registrar Cliente ---
            if (operation === 'registrar') {
                if (fields.length !== 6) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Formato invalido: Se esperan 7 campos (registrar;nombre;apellido;correo;password;telefono)`);
                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const [service, nombre, apellido, correo, password_plain, telefono] = fields;

                if (!nombre || !apellido || !correo || !password_plain || !telefono) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Todos los campos son obligatorios`);
                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(correo)) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Correo invalido`);
                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                // Verificar si el correo ya existe
                pool.query('SELECT id_cliente FROM clientes WHERE email = $1', [correo], (err, result) => {
                    if (err) {
                        console.error(`[${SERVICE_NAME_CODE}] Error en consulta de correo: ${err.message}`);
                        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Error al verificar el correo`);
                        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    if (result.rows.length > 0) {
                        const errorResponse = buildTransaction(SERVICE_CODE, `registrar;El correo ya esta registrado`);
                        console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    // Hashear la contrasena
                    const saltRounds = 10;
                    bcrypt.hash(password_plain, saltRounds, (err, hashedPassword) => {
                        if (err) {
                            console.error(`[${SERVICE_NAME_CODE}] Error al hashear: ${err.message}`);
                            const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Error al procesar la contrasena`);
                            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        // Insertar en la base de datos
                        pool.query(
                            `INSERT INTO clientes (nombre, apellido, email, telefono, password, es_invitado) 
                             VALUES ($1, $2, $3, $4, $5, $6) 
                             RETURNING id_cliente, email`,
                            [nombre, apellido, correo, telefono, hashedPassword, false],
                            (err, result) => {
                                if (err) {
                                    console.error(`[${SERVICE_NAME_CODE}] Error al insertar: ${err.message}`);
                                    const errorResponse = buildTransaction(SERVICE_CODE, `registrar;Error al registrar el cliente`);
                                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                                    serviceSocketToBus.write(errorResponse);
                                    return;
                                }

                                const { id_cliente, email } = result.rows[0];
                                console.log(`[${SERVICE_NAME_CODE}] Cliente creado: ID=${id_cliente}, Correo=${email}`);

                                const responseData = `registrar;${id_cliente};${email}`;
                                const response = buildTransaction(SERVICE_CODE, responseData);
                                console.log(`[${SERVICE_NAME_CODE}] Enviando: ${response}`);
                                serviceSocketToBus.write(response);
                            }
                        );
                    });
                });
            }

            // --- Autenticar Cliente (Login) ---
            else if (operation === 'login') {
                if (fields.length !== 3) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `login;Formato invalido: Se esperan 3 campos (login;correo;password)`);
                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const [service, correo, password_plain] = fields;

                if (!correo || !password_plain) {
                    const errorResponse = buildTransaction(SERVICE_CODE, `login;Correo y contrasena son obligatorios`);
                    console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                // Buscar usuario por correo
                pool.query(
                    'SELECT id_cliente, nombre, password FROM clientes WHERE email = $1',
                    [correo],
                    (err, result) => {
                        if (err) {
                            console.error(`[${SERVICE_NAME_CODE}] Error en consulta de login: ${err.message}`);
                            const errorResponse = buildTransaction(SERVICE_CODE, `login;Error al autenticar`);
                            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        if (result.rows.length === 0) {
                            const errorResponse = buildTransaction(SERVICE_CODE, `login;Correo no encontrado`);
                            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        const user = result.rows[0];
                        bcrypt.compare(password_plain, user.password, (err, isValid) => {
                            if (err || !isValid) {
                                console.error(`[${SERVICE_NAME_CODE}] Error al comparar: ${err ? err.message : 'contrasena incorrecta'}`);
                                const errorResponse = buildTransaction(SERVICE_CODE, `login;contrasena incorrecta`);
                                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                                serviceSocketToBus.write(errorResponse);
                                return;
                            }

                            const token = jwt.sign(
                                { id: user.id_cliente, correo: correo },
                                SECRET_KEY,
                                { expiresIn: '1h' }
                            );

                            const responseData = `login;${token};${user.id_cliente};${user.nombre}`;
                            const response = buildTransaction(SERVICE_CODE, responseData);
                            console.log(`[${SERVICE_NAME_CODE}] Enviando: ${response}`);
                            serviceSocketToBus.write(response);
                        });
                    }
                );
            }

            else {
                const errorResponse = buildTransaction(SERVICE_CODE, `${operation};Operación desconocida`);
                console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
                serviceSocketToBus.write(errorResponse);
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error procesando: ${error.message}`);
            const errorResponse = buildTransaction(SERVICE_CODE, `error;${error.message}`);
            console.log(`[${SERVICE_NAME_CODE}] Enviando error: ${errorResponse}`);
            serviceSocketToBus.write(errorResponse);
        }
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${SERVICE_NAME_CODE}] Conexión cerrada`);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${SERVICE_NAME_CODE}] Error: ${err.message}`);
});

// Health check opcional
const express = require('express');
const healthApp = express();
const HEALTH_PORT = 3001;
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${SERVICE_NAME_CODE} service is active and connected to bus`);
});
healthApp.listen(HEALTH_PORT, () => {
    console.log(`[${SERVICE_NAME_CODE}] Health check en http://localhost:${HEALTH_PORT}/health`);
});

console.log(`[${SERVICE_NAME_CODE}] Iniciando servicio...`);


































const app = express();
app.use(express.json());








app.get('/clientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes');
        res.json(result.rows);
        console.log("peticion realizada")
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la base de datos');
    }
});

app.listen(3002, () => {
    console.log('S2 autenticación escuchando en puerto 3002');
});
