// test_orders.js
const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const clientSocket = new net.Socket();

let authToken = '';
let id_cliente = '';

// Conectar al Bus
clientSocket.connect(BUS_PORT, BUS_HOST, () => {
    console.log('Cliente de prueba de ÓRDENES conectado al Bus');
    
    // 1. Iniciar sesión para obtener un token
    // Usa el usuario que registraste previamente (ej. nuevo.test@example.com)
    const loginData = 'login;nuevo.test@example.com;miPassword123'; 
    const loginRequest = buildTransaction('CLIEN', loginData);
    console.log('1. Enviando solicitud de LOGIN...');
    clientSocket.write(loginRequest);
});

// Manejar respuestas del Bus
clientSocket.on('data', (data) => {
    const rawData = data.toString();
    console.log(`\n<- Recibido del Bus: ${rawData}`);
    const parsed = parseResponse(rawData);
    console.log('   Parseado:', parsed);
    
    // Si es la respuesta del login exitoso
    if (parsed.serviceName === 'CLIEN' && parsed.status === 'OK' && parsed.data.startsWith('login;')) {
        const parts = parsed.data.split(';');
        authToken = parts[1];
        id_cliente = parts[2];
        console.log(`2. Login exitoso. Token obtenido para cliente ID ${id_cliente}.`);

        // 2. Crear una orden ahora que tenemos el token
        // Formato: prod_id,cantidad,precio|prod_id,cantidad,precio
        // Asegúrate de que los productos con ID 1 y 2 existan en tu DB
        const items = '1,1,15000|2,2,7500'; 
        const total = (1 * 15000) + (2 * 7500);
        // Payload: crear;token;id_cliente;items;total
        const orderPayload = `crear;${authToken};${id_cliente};${items};${total}`;
        const orderRequest = buildTransaction('ORDEN', orderPayload);
        
        console.log('\n3. Enviando solicitud de CREAR ORDEN...');
        clientSocket.write(orderRequest);
    }

    // Si es la respuesta a la creación de la orden
    if (parsed.serviceName === 'ORDEN' && parsed.status === 'OK' && parsed.data.startsWith('ORCR;')) {
        console.log('4. ¡Respuesta de creación de orden recibida! Flujo transaccional iniciado.');
        console.log('   Revisa los logs de los servicios S5, S6 y S4 para ver la cadena de eventos.');
        clientSocket.destroy(); // Terminar el script de prueba
    }

    if (parsed.status === 'NK') {
        console.error('*** ERROR RECIBIDO ***', parsed.data);
        clientSocket.destroy();
    }
});

clientSocket.on('close', () => console.log('Conexión con el Bus cerrada.'));
clientSocket.on('error', (err) => console.error('Error de conexión:', err));