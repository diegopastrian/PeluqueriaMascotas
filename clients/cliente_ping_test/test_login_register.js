const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

const clientSocket = new net.Socket();

clientSocket.connect(BUS_PORT, BUS_HOST, () => {
    console.log('Cliente conectado al Bus');
    
    // Prueba de registro
    const service = 'CLIEN';
    const registerData = 'registrar;Juan;Perez;rian.perez@example.com;contrasena123;1234567890';
    const registerRequest = buildTransaction(service, registerData);
    console.log('Enviando solicitud de registro:', registerRequest);
    clientSocket.write(registerRequest);

    // Prueba de login
    setTimeout(() => {
        const loginData = 'login;rian.perez@example.com;contrasena1233';
        const loginRequest = buildTransaction(service, loginData);
        console.log('Enviando solicitud de login:', loginRequest);
        clientSocket.write(loginRequest);
    }, 1000);
/*
    // Prueba de login inválido
    setTimeout(() => {
        const invalidLoginData = 'login;rian.perez@example.com;contrasena_equivocada';
        const invalidLoginRequest = buildTransaction(service, invalidLoginData);
        console.log('Enviando solicitud de login inválida:', invalidLoginRequest);
        clientSocket.write(invalidLoginRequest);
    }, 2000);*/
});

clientSocket.on('data', (data) => {
    const rawData = data.toString();
    console.log(`[Cliente] Datos crudos recibidos: ${rawData}`);
    const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];
    for (const response of messages) {
        if (response.length < 10) continue;
        console.log('Respuesta del Bus:', response);
        try {
            const parsed = parseResponse(response);
            console.log('Respuesta parseada:', parsed);
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
