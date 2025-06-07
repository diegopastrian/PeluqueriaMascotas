const net = require('net');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const pool = require('./db'); // Asumo que este archivo ya está configurado para PostgreSQL

// Configuración del Bus de Servicios
const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

// Código del servicio
const SERVICE_CODE = 'CLIEN'; // Nombre del servicio S2 (Gestion de Clientes)
const SERVICE_NAME_CODE = 'AUTH'; // Nombre descriptivo para logs (autenticación)

// Clave secreta para JWT (¡IMPORTANTE: En producción, usa una variable de entorno segura!)
const SECRET_KEY = 'tu_clave_secreta_muy_segura'; // Asegúrate de que esta clave sea la misma que se usó para firmar el JWT

// Función para verificar JWT y obtener el ID del cliente
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return { success: true, id_cliente: decoded.id };
    } catch (err) {
        console.error(`[${SERVICE_NAME_CODE}] Error verificando token: ${err.message}`);
        return { success: false, message: 'Token invalido o expirado' };
    }
}

// Conexión al Bus
const serviceSocketToBus = new net.Socket();

// Función para enviar SINIT (Activación del Servicio al Bus)
function sendSinit(callback) {
    const sinitTransaction = buildTransaction('sinit', SERVICE_CODE);
    console.log(`[${SERVICE_NAME_CODE}] Enviando transacción de activación: ${sinitTransaction}`);
    serviceSocketToBus.write(sinitTransaction);

    // Escuchar la respuesta del bus solo para SINIT
    const onData = (data) => {
        const response = data.toString();
        console.log(`[${SERVICE_NAME_CODE}] Respuesta SINIT recibida: ${response}`);
        try {
            const parsed = parseResponse(response);
            if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
                console.log(`[${SERVICE_NAME_CODE}] Servicio ${SERVICE_CODE} activado correctamente`);
                serviceSocketToBus.removeListener('data', onData); // Remover este listener para evitar conflictos
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

// Conectar al Bus al iniciar
serviceSocketToBus.connect(BUS_PORT, BUS_HOST, () => {
    console.log(`[${SERVICE_NAME_CODE}] Conectado al Bus en ${BUS_HOST}:${BUS_PORT}`);
    sendSinit((error) => {
        if (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error durante la activación: ${error.message}`);
            serviceSocketToBus.destroy(); // Cerrar la conexión si falla la activación
            return;
        }
        console.log(`[${SERVICE_NAME_CODE}] Listo para procesar transacciones`);
    });
});

// Listener principal para todas las transacciones entrantes del Bus
serviceSocketToBus.on('data', (data) => {
    const rawData = data.toString();
    // El bus puede enviar múltiples mensajes concatenados, por lo que los dividimos
    // Regex para encontrar patrones de transacción: NNNNNSSSSS[OK|NK]?DATOS (al menos 10 chars para NNNNNSSSSS)
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];
    
    for (const message of messages) {
        if (message.length < 10) continue; // Ignorar mensajes incompletos o mal formados
        console.log(`[${SERVICE_NAME_CODE}] Recibido: ${message}`);

        let responseStatus = 'OK'; // Por defecto, si el procesamiento es exitoso, el status es OK
        let responseData = '';

        try {
            const parsed = parseResponse(message);

            // Ignorar respuestas SINIT, ya fueron manejadas por el listener temporal
            if (parsed.serviceName === 'sinit') {
                continue;
            }

            // Verificar si la transacción es para este servicio
            if (parsed.serviceName !== SERVICE_CODE) {
                responseStatus = 'NK';
                responseData = `Servicio incorrecto`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const fields = parsed.data.split(';'); // Dividir el payload de DATOS
            if (fields.length < 1) {
                responseStatus = 'NK';
                responseData = `Formato invalido: Se espera operación`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                serviceSocketToBus.write(errorResponse);
                continue;
            }

            const operation = fields[0]; // La primera parte del payload es la operación
            console.log(`[${SERVICE_NAME_CODE}] Procesando operación: ${operation} con datos: ${parsed.data}`);

            // --- OPERACIONES: Registrar Cliente (REGCL) ---
            if (operation === 'registrar') { // También conocido como REGCL en el informe inicial
                if (fields.length !== 6) { // registrar;nombre;apellido;correo;password;telefono
                    responseStatus = 'NK';
                    responseData = `registrar;Formato invalido: Se esperan 6 campos (registrar;nombre;apellido;correo;password;telefono)`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const [, nombre, apellido, correo, password_plain, telefono] = fields;

                if (!nombre || !apellido || !correo || !password_plain || !telefono) {
                    responseStatus = 'NK';
                    responseData = `registrar;Todos los campos son obligatorios`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(correo)) {
                    responseStatus = 'NK';
                    responseData = `registrar;Correo invalido`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                // Verificar si el correo ya existe
                pool.query('SELECT id_cliente FROM clientes WHERE email = $1', [correo], (err, result) => {
                    if (err) {
                        console.error(`[${SERVICE_NAME_CODE}] Error en consulta de correo: ${err.message}`);
                        responseStatus = 'NK';
                        responseData = `registrar;Error al verificar el correo`;
                        const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    if (result.rows.length > 0) {
                        responseStatus = 'NK';
                        responseData = `registrar;El correo ya esta registrado`;
                        const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                        serviceSocketToBus.write(errorResponse);
                        return;
                    }

                    // Hashear la contrasena
                    const saltRounds = 10;
                    bcrypt.hash(password_plain, saltRounds, (err, hashedPassword) => {
                        if (err) {
                            console.error(`[${SERVICE_NAME_CODE}] Error al hashear: ${err.message}`);
                            responseStatus = 'NK';
                            responseData = `registrar;Error al procesar la contrasena`;
                            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
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
                                    responseStatus = 'NK';
                                    responseData = `registrar;Error al registrar el cliente`;
                                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                                    serviceSocketToBus.write(errorResponse);
                                    return;
                                }

                                const { id_cliente, email } = result.rows[0];
                                console.log(`[${SERVICE_NAME_CODE}] Cliente creado: ID=${id_cliente}, Correo=${email}`);
                                responseStatus = 'OK';
                                responseData = `registrar;${id_cliente};${email}`;
                                const response = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                                serviceSocketToBus.write(response);
                            }
                        );
                    });
                });
            }

            // --- OPERACIONES: Autenticar Cliente (LOGCL) ---
            else if (operation === 'login') { // También conocido como LOGCL en el informe inicial
                if (fields.length !== 3) { // login;correo;password
                    responseStatus = 'NK';
                    responseData = `login;Formato invalido: Se esperan 3 campos (login;correo;password)`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                    serviceSocketToBus.write(errorResponse);
                    continue;
                }

                const [, correo, password_plain] = fields;

                if (!correo || !password_plain) {
                    responseStatus = 'NK';
                    responseData = `login;Correo y contrasena son obligatorios`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
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
                            responseStatus = 'NK';
                            responseData = `login;Error al autenticar`;
                            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        if (result.rows.length === 0) {
                            responseStatus = 'NK';
                            responseData = `login;Correo no encontrado`;
                            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        const user = result.rows[0];
                        bcrypt.compare(password_plain, user.password, (err, isValid) => {
                            if (err || !isValid) {
                                console.error(`[${SERVICE_NAME_CODE}] Error al comparar: ${err ? err.message : 'contrasena incorrecta'}`);
                                responseStatus = 'NK';
                                responseData = `login;Contrasena incorrecta`;
                                const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                                serviceSocketToBus.write(errorResponse);
                                return;
                            }

                            // Generar JWT
                            const token = jwt.sign(
                                { id: user.id_cliente, correo: correo },
                                SECRET_KEY,
                                { expiresIn: '1h' } // Token expira en 1 hora
                            );
                            responseStatus = 'OK';
                            responseData = `login;${token};${user.id_cliente};${user.nombre}`;
                            const response = buildTransaction(SERVICE_CODE, responseData, responseStatus); // Añadido responseStatus
                            serviceSocketToBus.write(response);
                        });
                    }
                );
            }

            // --- NUEVAS OPERACIONES: PREFG (Guardar/Actualizar Preferencia) ---
            else if (operation === 'PREFG') {
                if (fields.length !== 4) { // PREFG;token;tipo;id_referencia
                    responseStatus = 'NK';
                    responseData = `PREFG;Formato invalido: Se esperan 4 campos (PREFG;token;tipo;id_referencia)`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }

                const [, token, tipo, id_referencia_str] = fields;
                const id_referencia = parseInt(id_referencia_str);

                if (!token || !tipo || isNaN(id_referencia)) {
                    responseStatus = 'NK';
                    responseData = `PREFG;Datos incompletos o invalidos`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }

                const authResult = verifyToken(token);
                if (!authResult.success) {
                    responseStatus = 'NK';
                    responseData = `PREFG;${authResult.message}`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }
                const id_cliente = authResult.id_cliente;

                // Validar tipo (producto/servicio)
                if (!['producto', 'servicio'].includes(tipo)) {
                    responseStatus = 'NK';
                    responseData = `PREFG;Tipo de preferencia invalido. Debe ser 'producto' o 'servicio'.`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }

                // Upsert (Insertar o No Hacer Nada si ya existe) en la tabla preferencias
                // Requiere una UNIQUE constraint en (id_cliente, tipo, id_referencia) en la DB
                pool.query(
                    `INSERT INTO preferencias (id_cliente, tipo, id_referencia)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (id_cliente, tipo, id_referencia) DO NOTHING
                     RETURNING id_preferencia`, // Si se inserta, devuelve el ID
                    [id_cliente, tipo, id_referencia],
                    (err, result) => {
                        if (err) {
                            console.error(`[${SERVICE_NAME_CODE}] Error al guardar preferencia: ${err.message}`);
                            responseStatus = 'NK';
                            responseData = `PREFG;Error al guardar preferencia`;
                            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        let responseId;
                        if (result.rows.length > 0) { // La preferencia fue realmente insertada
                            responseId = result.rows[0].id_preferencia;
                            console.log(`[${SERVICE_NAME_CODE}] Preferencia insertada: ID=${responseId}`);
                            responseStatus = 'OK';
                            responseData = `PREFG;${responseId}`;
                            const successResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                            serviceSocketToBus.write(successResponse);
                        } else { // La preferencia ya existía (ON CONFLICT DO NOTHING se activó)
                            // En este caso, hacemos un SELECT para obtener el ID de la preferencia existente
                            pool.query(
                                `SELECT id_preferencia FROM preferencias WHERE id_cliente = $1 AND tipo = $2 AND id_referencia = $3`,
                                [id_cliente, tipo, id_referencia],
                                (err, existingResult) => {
                                    if (err) {
                                        console.error(`[${SERVICE_NAME_CODE}] Error al buscar preferencia existente: ${err.message}`);
                                        responseStatus = 'NK';
                                        responseData = `PREFG;Error al verificar preferencia existente`;
                                        const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                                        serviceSocketToBus.write(errorResponse);
                                        return;
                                    }
                                    if (existingResult.rows.length > 0) {
                                        responseId = existingResult.rows[0].id_preferencia;
                                        console.log(`[${SERVICE_NAME_CODE}] Preferencia ya existía: ID=${responseId}`);
                                        responseStatus = 'OK';
                                        responseData = `PREFG;${responseId}`;
                                        const successResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                                        serviceSocketToBus.write(successResponse);
                                    } else {
                                        // Este caso no debería ocurrir si la lógica de ON CONFLICT es correcta
                                        console.error(`[${SERVICE_NAME_CODE}] Error interno: Preferencia no insertada ni encontrada.`);
                                        responseStatus = 'NK';
                                        responseData = `PREFG;Error interno del servidor`;
                                        const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                                        serviceSocketToBus.write(errorResponse);
                                    }
                                }
                            );
                        }
                    }
                );
            }

            // --- NUEVAS OPERACIONES: PREFL (Listar Preferencias) ---
            else if (operation === 'PREFL') {
                if (fields.length !== 2) { // PREFL;token
                    responseStatus = 'NK';
                    responseData = `PREFL;Formato invalido: Se esperan 2 campos (PREFL;token)`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }

                const [, token] = fields;

                const authResult = verifyToken(token);
                if (!authResult.success) {
                    responseStatus = 'NK';
                    responseData = `PREFL;${authResult.message}`;
                    const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                    serviceSocketToBus.write(errorResponse);
                    return;
                }
                const id_cliente = authResult.id_cliente;

                pool.query(
                    'SELECT tipo, id_referencia FROM preferencias WHERE id_cliente = $1',
                    [id_cliente],
                    (err, result) => {
                        if (err) {
                            console.error(`[${SERVICE_NAME_CODE}] Error al listar preferencias: ${err.message}`);
                            responseStatus = 'NK';
                            responseData = `PREFL;Error al listar preferencias`;
                            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                            serviceSocketToBus.write(errorResponse);
                            return;
                        }

                        // Formatear la respuesta como "tipo1,id_ref1;tipo2,id_ref2;..."
                        // Si no hay preferencias, el join resultará en una cadena vacía, lo cual es correcto.
                        responseStatus = 'OK';
                        const preferencesData = result.rows.map(row => `${row.tipo},${row.id_referencia}`).join(';');
                        responseData = `PREFL;${preferencesData}`;
                        const successResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                        console.log(`[${SERVICE_NAME_CODE}] Enviando: ${successResponse}`);
                        serviceSocketToBus.write(successResponse);
                    }
                );
            }

            // --- Si la operación no es reconocida ---
            else {
                responseStatus = 'NK';
                responseData = `${operation};Operación desconocida`;
                const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
                serviceSocketToBus.write(errorResponse);
            }
        } catch (error) {
            console.error(`[${SERVICE_NAME_CODE}] Error general procesando mensaje: ${error.message}`);
            responseStatus = 'NK';
            responseData = `error;${error.message}`;
            const errorResponse = buildTransaction(SERVICE_CODE, responseData, responseStatus);
            serviceSocketToBus.write(errorResponse);
        }
    }
});

serviceSocketToBus.on('close', () => {
    console.log(`[${SERVICE_NAME_CODE}] Conexión cerrada con el Bus.`);
});

serviceSocketToBus.on('error', (err) => {
    console.error(`[${SERVICE_NAME_CODE}] Error de conexión con el Bus: ${err.message}`);
});

// Health check opcional
const express = require('express');
const healthApp = express();
const HEALTH_PORT = 3001; // Asegúrate de que este puerto esté libre y sea diferente al de otros servicios
healthApp.get('/health', (req, res) => {
    res.status(200).send(`${SERVICE_NAME_CODE} service is active and connected to bus.`);
});
healthApp.listen(HEALTH_PORT, () => {
    console.log(`[${SERVICE_NAME_CODE}] Health check disponible en http://localhost:${HEALTH_PORT}/health`);
});

console.log(`[${SERVICE_NAME_CODE}] Iniciando servicio...`);