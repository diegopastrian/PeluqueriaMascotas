const net = require('net');
const { buildTransaction, parseResponse } = require('./../../bus_service_helpers/transactionHelper');

const BUS_PORT = 5000;
const BUS_HOST = 'localhost';

const socket = new net.Socket();

let token = null;
let idProductoAgregado = null;
let idServicioAgregado = null;

const loginMsg = buildTransaction('CLIEN', 'login;juan@gmail.com;Prueba123');

let estado = {
    loginOK: false,
    agregarProductoOK: false,
    modificarProductoOK: false,
    agregarServicioOK: false,
    modificarServicioOK: false
};

// Timeout para evitar que el test se cuelgue
let testTimeout = setTimeout(() => {
    console.log('\n❌ Test timeout - cerrando conexión');
    socket.end();
    process.exit(1);
}, 15000); // 15 segundos para dar tiempo a todas las operaciones

socket.connect(BUS_PORT, BUS_HOST, () => {
    console.log('[TEST] Conectado al Bus.');
    socket.write(loginMsg);
});

socket.on('data', (data) => {
    const rawData = data.toString();
    console.log(`[RAW] ${rawData}`); // Para debug

    const mensajes = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [];

    for (const msg of mensajes) {
        try {
            const parsed = parseResponse(msg);
            console.log(`[RESPUESTA] ${msg}`);

            // ========== LOGIN ==========
            if (parsed.serviceName === 'CLIEN' && parsed.data.startsWith('login')) {
                if (parsed.status === 'OK') {
                    estado.loginOK = true;
                    const partes = parsed.data.split(';');
                    token = partes[1];
                    console.log('[TEST] Login exitoso. Token recibido:', token);

                    // Agregar producto
                    const agregarProductoMsg = buildTransaction('CATPS', `CATAP;${token};Shampoo para gato;Suave y aromatico;8990;10;https://ejemplo.com/img.jpg`);
                    setTimeout(() => {
                        console.log('[TEST] Enviando mensaje de agregar producto...');
                        socket.write(agregarProductoMsg);
                    }, 500);
                } else {
                    console.error('[TEST] Falló login:', parsed.data);
                    clearTimeout(testTimeout);
                    socket.end();
                }
            }

            // ========== AGREGAR PRODUCTO ==========
            if (parsed.serviceName === 'CATPS' && parsed.data.startsWith('CATAP')) {
                if (parsed.status === 'OK') {
                    estado.agregarProductoOK = true;
                    console.log('[TEST] Producto agregado exitosamente.');

                    // Intentar extraer el ID del producto
                    const match = parsed.data.match(/ID (\d+)/);
                    if (match) {
                        idProductoAgregado = match[1];
                        console.log(`[TEST] ID del producto agregado: ${idProductoAgregado}`);
                    } else {
                        console.log('[TEST] No se pudo extraer ID del producto, usando fallback');
                        idProductoAgregado = '1';
                    }

                    // Modificar producto
                    const modificarProductoMsg = buildTransaction('CATPS', `CATUP;${token};${idProductoAgregado};Shampoo premium para gato;Con aloe vera y sin perfume;9990;8;https://ejemplo.com/nuevo.jpg`);
                    setTimeout(() => {
                        console.log('[TEST] Enviando mensaje de modificar producto...');
                        socket.write(modificarProductoMsg);
                    }, 500);
                } else {
                    console.error('[TEST] Falló agregar producto:', parsed.data);
                    clearTimeout(testTimeout);
                    socket.end();
                }
            }

            // ========== MODIFICAR PRODUCTO ==========
            if (parsed.serviceName === 'CATPS' && parsed.data.startsWith('CATUP')) {
                if (parsed.status === 'OK') {
                    estado.modificarProductoOK = true;
                    console.log('[TEST] Producto modificado exitosamente.');

                    // Agregar servicio
                    const agregarServicioMsg = buildTransaction('CATPS', `CATAS;${token};Consulta veterinaria;Examen general de salud;25000;45`);
                    setTimeout(() => {
                        console.log('[TEST] Enviando mensaje de agregar servicio...');
                        socket.write(agregarServicioMsg);
                    }, 500);
                } else {
                    console.error('[TEST] Falló modificar producto:', parsed.data);
                    clearTimeout(testTimeout);
                    socket.end();
                }
            }

            // ========== AGREGAR SERVICIO ==========
            if (parsed.serviceName === 'CATPS' && parsed.data.startsWith('CATAS')) {
                if (parsed.status === 'OK') {
                    estado.agregarServicioOK = true;
                    console.log('[TEST] Servicio agregado exitosamente.');

                    // Intentar extraer el ID del servicio
                    const match = parsed.data.match(/ID (\d+)/);
                    if (match) {
                        idServicioAgregado = match[1];
                        console.log(`[TEST] ID del servicio agregado: ${idServicioAgregado}`);
                    } else {
                        console.log('[TEST] No se pudo extraer ID del servicio, usando ID 1 como solicitado');
                        idServicioAgregado = '1';
                    }

                    // Modificar servicio con ID 1 (como solicitaste)
                    const modificarServicioMsg = buildTransaction('CATPS', `CATUS;${token};1;Consulta veterinaria especializada;Examen completo con diagnostico avanzado;35000;60`);
                    setTimeout(() => {
                        console.log('[TEST] Enviando mensaje de modificar servicio con ID 1...');
                        socket.write(modificarServicioMsg);
                    }, 500);
                } else {
                    console.error('[TEST] Falló agregar servicio:', parsed.data);
                    clearTimeout(testTimeout);
                    socket.end();
                }
            }

            // ========== MODIFICAR SERVICIO ==========
            if (parsed.serviceName === 'CATPS' && parsed.data.startsWith('CATUS')) {
                if (parsed.status === 'OK') {
                    estado.modificarServicioOK = true;
                    console.log('[TEST] Servicio modificado exitosamente.');
                } else {
                    console.error('[TEST] Falló modificar servicio:', parsed.data);
                }

                // Finalizar test
                clearTimeout(testTimeout);
                setTimeout(() => {
                    console.log('\n🎯 Resultado del test completo:');
                    console.log('==========================================');
                    console.log(`✔ Login: ${estado.loginOK ? '✅' : '❌'}`);
                    console.log(`✔ Agregar producto: ${estado.agregarProductoOK ? '✅' : '❌'}`);
                    console.log(`✔ Modificar producto: ${estado.modificarProductoOK ? '✅' : '❌'}`);
                    console.log(`✔ Agregar servicio: ${estado.agregarServicioOK ? '✅' : '❌'}`);
                    console.log(`✔ Modificar servicio: ${estado.modificarServicioOK ? '✅' : '❌'}`);
                    console.log('==========================================');

                    const todosOK = estado.loginOK && estado.agregarProductoOK && estado.modificarProductoOK && estado.agregarServicioOK && estado.modificarServicioOK;
                    console.log(`\n🏆 Test completo ${todosOK ? 'EXITOSO' : 'FALLIDO'}`);

                    if (todosOK) {
                        console.log('✨ Todas las operaciones funcionaron correctamente!');
                        console.log(`📦 Producto creado/modificado: ID ${idProductoAgregado || 'N/A'}`);
                        console.log(`🔧 Servicio creado: ID ${idServicioAgregado || 'N/A'}`);
                        console.log(`🔧 Servicio modificado: ID 1 (tiempo actualizado a 60 minutos)`);
                    }

                    socket.end();
                    process.exit(todosOK ? 0 : 1);
                }, 500);
            }

            // ========== MANEJO DE ERRORES ==========
            if (parsed.data.startsWith('error;')) {
                console.error('[TEST] Error del servidor:', parsed.data);
                clearTimeout(testTimeout);
                socket.end();
                process.exit(1);
            }

        } catch (err) {
            console.error('[ERROR] Fallo al procesar respuesta:', err.message);
            console.error('[ERROR] Mensaje problemático:', msg);
        }
    }
});

socket.on('close', () => {
    console.log('[TEST] Conexión cerrada.');
    clearTimeout(testTimeout);
});

socket.on('error', (err) => {
    console.error(`[ERROR] Fallo de conexión: ${err.message}`);
    clearTimeout(testTimeout);
    process.exit(1);
});

console.log('[TEST] Iniciando test completo de productos y servicios...');
console.log('[TEST] Secuencia: Login → Agregar Producto → Modificar Producto → Agregar Servicio → Modificar Servicio (ID 1)');