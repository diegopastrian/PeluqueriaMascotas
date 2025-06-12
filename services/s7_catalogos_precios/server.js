const net = require('net');
const express = require('express');
const pool = require('../../bus_service_helpers/db');
const config = require('./config');
const sendSinit = require('../../bus_service_helpers/initHelper');

// Importar controladores
const productController = require('./controllers/productController');
const serviceController = require('./controllers/serviceController');
const messageProcessor = require('./controllers/messageProcessor');

const app = express();
const serviceSocketToBus = new net.Socket();

// Inicializar controladores
function initializeComponents() {
    productController.initialize(pool, config);
    serviceController.initialize(pool, config);
    messageProcessor.initialize(config);
}

// Función para conectar al bus
function connectToBus() {
    serviceSocketToBus.connect(config.BUS_PORT, config.BUS_HOST, () => {
        sendSinit(serviceSocketToBus, config, (err) => {
            if (err) {
                console.error(`[${config.SERVICE_NAME_CODE}] Error durante la activación: ${err.message}`);
                serviceSocketToBus.destroy();
                process.exit(1);
            } else {
                console.log(`[${config.SERVICE_NAME_CODE}] Servicio listo para procesar transacciones.`);
            }
        });
    });
}

// Configurar manejadores de eventos del socket
function setupSocketHandlers() {
    serviceSocketToBus.on('data', async (data) => {
        await messageProcessor.processIncomingData(data, serviceSocketToBus);
    });

    serviceSocketToBus.on('close', () => {
        console.log(`[${config.SERVICE_NAME_CODE}] Conexión cerrada`);
    });

    serviceSocketToBus.on('error', (err) => {
        console.error(`[${config.SERVICE_NAME_CODE}] Error: ${err.message}`);
    });
}

// Configurar health check
function setupHealthCheck() {
    const HEALTH_PORT = config.HEALTH_PORT || 3007;
    const healthApp = express();

    healthApp.get('/health', (req, res) => {
        res.status(200).send(`${config.SERVICE_NAME} is running`);
    });

    healthApp.get('/status', (req, res) => {
        const status = {
            service: config.SERVICE_CODE,
            serviceCode: config.SERVICE_CODE,
            status: 'running',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            busConnection: !serviceSocketToBus.destroyed && serviceSocketToBus.readyState === 'open'
        };
        res.json(status);
    });

    healthApp.listen(HEALTH_PORT, () => {
        console.log(`[${config.SERVICE_NAME_CODE}] Health check server running on port ${HEALTH_PORT}`);
    });
}

// Función para manejar el cierre graceful
function setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
        console.log(`[${config.SERVICE_NAME_CODE}] Received ${signal}. Shutting down gracefully...`);

        // Cerrar conexión al bus
        if (serviceSocketToBus && !serviceSocketToBus.destroyed) {
            serviceSocketToBus.end();
        }

        // Cerrar pool de base de datos
        if (pool && pool.end) {
            pool.end().then(() => {
                console.log(`[${config.SERVICE_NAME_CODE}] Database pool closed`);
                process.exit(0);
            }).catch((err) => {
                console.error(`[${config.SERVICE_NAME_CODE}] Error closing database pool:`, err);
                process.exit(1);
            });
        } else {
            process.exit(0);
        }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Función principal de inicialización
function startService() {
    try {
        console.log(`[${config.SERVICE_NAME_CODE}] Iniciando ${config.SERVICE_CODE}...`);

        // Inicializar componentes
        initializeComponents();
        console.log(`[${config.SERVICE_NAME_CODE}] Componentes inicializados`);

        // Configurar manejadores del socket
        setupSocketHandlers();
        console.log(`[${config.SERVICE_NAME_CODE}] Manejadores de socket configurados`);

        // Configurar health check
        setupHealthCheck();

        // Configurar shutdown graceful
        setupGracefulShutdown();

        // Conectar al bus
        console.log(`[${config.SERVICE_NAME_CODE}] Conectando al bus en ${config.BUS_HOST}:${config.BUS_PORT}...`);
        connectToBus();

    } catch (error) {
        console.error(`[${config.SERVICE_NAME_CODE}] Error al iniciar el servicio:`, error);
        process.exit(1);
    }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${config.SERVICE_NAME_CODE}] Unhandled Rejection at:`, promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error(`[${config.SERVICE_NAME_CODE}] Uncaught Exception:`, error);
    process.exit(1);
});

// Iniciar el servicio
startService();