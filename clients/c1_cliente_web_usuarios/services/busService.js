// clients/c1_cliente_web_usuarios/services/busService.js

const net = require('net');
const EventEmitter = require('events');
const { buildTransaction, parseResponse } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta la ruta

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

class BusService extends EventEmitter {
    constructor() {
        super();
        this.clientSocket = new net.Socket();
        this.isConnected = false;

        this.clientSocket.on('data', (data) => {
            const rawData = data.toString();
            
            // Un simple parseo, emitimos el objeto parseado
            try {
                const parsed = parseResponse(rawData);
                this.emit('response', parsed);
            } catch (error) {
                this.emit('error', new Error(`Error parseando respuesta del bus: ${error.message}`));
            }
        });

        this.clientSocket.on('close', () => {
            this.isConnected = false;
            console.log('[Bus] Conexion cerrada.');
            this.emit('close');
        });

        this.clientSocket.on('error', (err) => {
            console.error(`[Bus] Error de conexion: ${err.message}`);
            this.emit('error', err);
        });
    }

    connect() {
        if (this.isConnected) return;
        this.clientSocket.connect(BUS_PORT, BUS_HOST, () => {
            this.isConnected = true;
            console.log('[Bus] Conectado exitosamente.');
            this.emit('connect');
        });
    }

    send(serviceName, data) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                console.error('[Bus] No se puede enviar, no hay conexion.');
                // Rechazamos la promesa si no hay conexion
                return reject(new Error('No conectado al bus'));
            }

            // Escuchamos la proxima respuesta UNA SOLA VEZ
            this.once('response', (res) => {
                resolve(res); // Resolvemos la promesa con la respuesta parseada
            });

            const transaction = buildTransaction(serviceName, data);
            console.log(`[Bus] >> Enviando: ${transaction}`);
            this.clientSocket.write(transaction);
        });
    }

    disconnect() {
        this.clientSocket.destroy();
    }
}

// Exportamos una unica instancia (Singleton) para toda la aplicacion
module.exports = new BusService();