const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

const clientSocket = new net.Socket();

let authToken = ''; // Para almacenar el token JWT después de un login exitoso

clientSocket.connect(BUS_PORT, BUS_HOST, () => {
    console.log('Cliente conectado al Bus');
    
    // --- FASE 1: REGISTRO (COMENTADO AHORA) ---
    /*
    const serviceNameForRegister = 'CLIEN'; 
    const registerData = 'registrar;Prueba;Usuario;nuevo.test@example.com;miPassword123;9988776655'; 
    const registerRequest = buildTransaction(serviceNameForRegister, registerData);
    console.log('Enviando solicitud de registro:', registerRequest);
    clientSocket.write(registerRequest);
    */

    // --- FASE 2: LOGIN Y PRUEBA DE PREFERENCIAS (DESCOMENTADO AHORA) ---
    setTimeout(() => {
        const serviceNameForLogin = 'CLIEN';
        // ESTOS SON LOS DATOS DEL USUARIO QUE ACABAS DE REGISTRAR
        const loginData = 'login;nuevo.test@example.com;miPassword123'; 
        const loginRequest = buildTransaction(serviceNameForLogin, loginData);
        console.log('Enviando solicitud de login:', loginRequest);
        clientSocket.write(loginRequest);
    }, 500); // Pequeño retraso
});

clientSocket.on('data', (data) => {
    const rawData = data.toString();
    console.log(`\n[Cliente] Datos crudos recibidos: ${rawData}`);
    // Regex para encontrar patrones de transacción: NNNNNSSSSS[OK|NK]?DATOS
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

    for (const response of messages) {
        if (response.length < 10) continue; 
        console.log('Respuesta del Bus:', response);
        try {
            const parsed = parseResponse(response);
            console.log('Respuesta parseada:', parsed);

            // Manejo de la respuesta de REGISTRO (ya no debería ocurrir si está comentado)
            if (parsed.serviceName === 'CLIEN' && parsed.data.startsWith('registrar;')) {
                if (parsed.status === 'OK') {
                    console.log("--> REGISTRO EXITOSO! Usuario creado en la DB.");
                    console.log("    AHORA: Comenta la sección de REGISTRO y descomenta la sección de LOGIN en este script.");
                    console.log("    Asegúrate de que los datos de LOGIN coincidan con el usuario recién creado.");
                } else {
                    console.error("--> FALLO EL REGISTRO:", parsed.data);
                    console.error("    Si el correo ya existe, cambia el correo en el script e inténtalo de nuevo.");
                }
                clientSocket.destroy(); 
                return; 
            }

            // Manejo de la respuesta de LOGIN y PREFERENCIAS
            if (parsed.serviceName === 'CLIEN' && parsed.data.startsWith('login;')) {
                if (parsed.status === 'OK') {
                    const parts = parsed.data.split(';');
                    if (parts.length >= 3) { 
                        authToken = parts[1]; 
                        console.log(`Token JWT obtenido: ${authToken}`);

                        // A. Prueba PREFG (Guardar una preferencia de producto)
                        setTimeout(() => {
                            const serviceNameForPrefs = 'CLIEN'; 
                            const prefGData = `PREFG;${authToken};producto;101`; 
                            const prefGRequest = buildTransaction(serviceNameForPrefs, prefGData);
                            console.log('\nEnviando solicitud PREFG (producto 101):', prefGRequest);
                            clientSocket.write(prefGRequest);
                        }, 500); 

                        // B. Prueba PREFG (Guardar una preferencia de servicio)
                        setTimeout(() => {
                            const serviceNameForPrefs = 'CLIEN';
                            const prefGData2 = `PREFG;${authToken};servicio;201`; 
                            const prefGRequest2 = buildTransaction(serviceNameForPrefs, prefGData2);
                            console.log('\nEnviando solicitud PREFG (servicio 201):', prefGRequest2);
                            clientSocket.write(prefGRequest2);
                        }, 1000);

                        // C. Prueba PREFG (Intentar guardar la misma preferencia de producto)
                        setTimeout(() => {
                            const serviceNameForPrefs = 'CLIEN';
                            const prefGData3 = `PREFG;${authToken};producto;101`; 
                            const prefGRequest3 = buildTransaction(serviceNameForPrefs, prefGData3);
                            console.log('\nEnviando solicitud PREFG (producto 101 de nuevo):', prefGRequest3);
                            clientSocket.write(prefGRequest3);
                        }, 1500);

                        // D. Prueba PREFL (Listar preferencias)
                        setTimeout(() => {
                            const serviceNameForPrefs = 'CLIEN';
                            const prefLData = `PREFL;${authToken}`;
                            const prefLRequest = buildTransaction(serviceNameForPrefs, prefLData);
                            console.log('\nEnviando solicitud PREFL:', prefLRequest);
                            clientSocket.write(prefLRequest);
                        }, 2000);
                    } else {
                        console.error("--> FALLO EL LOGIN (formato de respuesta inesperado):", parsed.data);
                    }
                } else {
                    console.error("--> FALLO EL LOGIN:", parsed.data);
                }
            } else if (parsed.status === 'NK') {
                console.log(`Operación fallida: ${parsed.serviceName} - ${parsed.data}`);
            }
        } catch (error) {
            console.error('Error parseando respuesta:', error.message);
        }
    }
});

clientSocket.on('close', () => {
    console.log('Conexión con el Bus cerrada');
});

clientSocket.on('error', (err) => {
    console.error('Error de conexión con el Bus:', err.message);
});