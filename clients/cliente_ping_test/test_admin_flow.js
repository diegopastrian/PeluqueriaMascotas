// clients/cliente_ping_test/test_admin_flow.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const clientSocket = new net.Socket();

let state = 'START';
let adminToken = ''; // Token para operaciones de admin/empleado

clientSocket.connect(BUS_PORT, BUS_HOST, () => {
    console.log('[CLIENTE ADMIN] Conectado al Bus.');
    
    // 1. Registrar un empleado (si no existe) a través del servicio AUTEM
    const registerPayload = 'registrar;Admin;User;admin@peluqueria.com;adminpass;123456;administrador';
    const registerRequest = buildTransaction('AUTEM', registerPayload);
    console.log('\n1. REGISTRANDO EMPLEADO...');
    clientSocket.write(registerRequest);
    state = 'AWAITING_ADMIN_REGISTER';
});

clientSocket.on('data', (data) => {
    const rawResponse = data.toString();
    const parsed = parseResponse(rawResponse);
    console.log(`\n<- RECIBIDO: ${rawResponse}`);

    if (state === 'AWAITING_ADMIN_REGISTER') {
        console.log('2. LOGUEANDO EMPLEADO...');
        const loginPayload = 'login;admin@peluqueria.com;adminpass';
        const loginRequest = buildTransaction('AUTEM', loginPayload);
        clientSocket.write(loginRequest);
        state = 'AWAITING_ADMIN_LOGIN';
    } 
    else if (state === 'AWAITING_ADMIN_LOGIN') {
        if (parsed.status === 'OK' && parsed.data.startsWith('login;')) {
            adminToken = parsed.data.split(';')[1];
            console.log('\n3. PROBANDO S8 (INVENTARIO)...');
            console.log('   Login de admin exitoso. Token obtenido.');

            // 3.1 Probar INCO (Consultar Stock)
            const stockQueryPayload = `consultar;1`; // Consultar producto con ID 1
            const stockRequest = buildTransaction('INVEN', stockQueryPayload);
            clientSocket.write(stockRequest);
            state = 'AWAITING_INCO_RESPONSE';
        } else {
            console.error('Fallo el login de admin.');
            clientSocket.destroy();
        }
    }
    else if (state === 'AWAITING_INCO_RESPONSE') {
        console.log('   Respuesta de consulta de stock recibida.');

        // 3.2 Probar INAC (Ajustar Stock)
        const adjustPayload = `ajustar;${adminToken};1;-5;Venta manual`; // Restar 5 del stock del producto 1
        const adjustRequest = buildTransaction('INVEN', adjustPayload);
        clientSocket.write(adjustRequest);
        state = 'AWAITING_INAC_RESPONSE';
    }
    else if (state === 'AWAITING_INAC_RESPONSE') {
        console.log('   Respuesta de ajuste de stock recibida.');
        console.log('\n4. PROBANDO S3 (HISTORIAL)...');

        // 4.1 Probar HICO (Consultar Historial de una mascota)
        // Asumimos que la mascota con ID 1 existe
        const historialPayload = `obtener;${adminToken};1`;
        const historialRequest = buildTransaction('HISTR', historialPayload);
        clientSocket.write(historialRequest);
        state = 'AWAITING_HICO_RESPONSE';
    }
    else if (state === 'AWAITING_HICO_RESPONSE') {
        console.log('   Respuesta de consulta de historial recibida.');
        console.log('\n¡PRUEBAS DE S3 Y S8 COMPLETADAS!');
        clientSocket.destroy();
    }
});

clientSocket.on('close', () => console.log('Cliente admin desconectado.'));
clientSocket.on('error', (err) => console.error('Error en cliente admin:', err));