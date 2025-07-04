const net = require('net');
const EventEmitter = require('events');
const { buildTransaction, parseResponse } = require('../../../bus_service_helpers/transactionHelper');

const BUS_HOST = 'localhost';
const BUS_PORT = 5000;

class BusService extends EventEmitter {
    constructor() {
        super();
        this.clientSocket = new net.Socket();
        this.isConnected = false;
        this.buffer = ''; // Buffer para acumular datos de chunks
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }
            this.clientSocket.connect(BUS_PORT, BUS_HOST, () => {
                this.isConnected = true;
                console.log('[Bus] Conectado exitosamente.');
                this.emit('connect');
                resolve();
            });

            this.clientSocket.on('error', (err) => {
                console.error(`[Bus] Error de conexion: ${err.message}`);
                this.emit('error', err);
                reject(err);
            });

            this.clientSocket.on('close', () => {
                this.isConnected = false;
                console.log('[Bus] Conexion cerrada.');
                this.emit('close');
            });
        });
    }

    send(serviceName, data) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                return reject(new Error('No conectado al bus'));
            }

            const timeoutId = setTimeout(() => {
                // Si el timeout se dispara, removemos el listener y rechazamos la promesa
                this.clientSocket.removeListener('data', onData);
                reject(new Error(`Timeout: El servicio ${serviceName} no respondió a tiempo.`));
            }, 10000); // Timeout de 8 segundos

            // Listener de datos TEMPORAL, específico para esta petición
            const onData = (chunk) => {
                this.buffer += chunk.toString();

                // Intentar procesar el buffer
                while (true) {
                    const startIndex = this.buffer.search(/\d{5}[A-Z\s]{5}/);
                    if (startIndex === -1) break; // No hay cabecera, salir del bucle

                    if (startIndex > 0) {
                        this.buffer = this.buffer.substring(startIndex);
                    }
                    if (this.buffer.length < 5) break;

                    const lengthStr = this.buffer.substring(0, 5);
                    if (!/^\d{5}$/.test(lengthStr)) {
                        this.buffer = this.buffer.substring(1); // Descartar caracter corrupto
                        continue;
                    }

                    const messageLength = parseInt(lengthStr, 10);
                    const totalLength = 5 + messageLength;

                    if (this.buffer.length < totalLength) break; // Mensaje incompleto

                    const message = this.buffer.substring(0, totalLength);
                    this.buffer = this.buffer.substring(totalLength);

                    try {
                        const parsed = parseResponse(message);

                        // FILTRO CLAVE: ¿Es esta la respuesta que estoy esperando?
                        if (parsed.serviceName.trim() === serviceName) {
                            clearTimeout(timeoutId); // Cancelar el timeout
                            this.clientSocket.removeListener('data', onData); // Limpiar este listener
                            resolve(parsed); // Resolver la promesa con la respuesta correcta
                            return; // Salir de la función onData
                        }
                        // Si no es la respuesta esperada, la ignoramos y el listener sigue activo
                    } catch (e) {
                        // Ignorar errores de parseo de mensajes no solicitados
                    }
                }
            };

            this.clientSocket.on('data', onData);

            const transaction = buildTransaction(serviceName, data);
            this.clientSocket.write(transaction, (err) => {
                if (err) {
                    clearTimeout(timeoutId);
                    this.clientSocket.removeListener('data', onData);
                    reject(err);
                }
            });
        });
    }

    disconnect() {
        this.clientSocket.destroy();
    }
}

module.exports = new BusService();
