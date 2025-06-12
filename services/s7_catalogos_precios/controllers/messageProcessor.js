const { parseResponse, buildTransaction } = require('../../../bus_service_helpers/transactionHelper');
const operationRouter = require('./operationRouter');

class MessageProcessor {
    constructor() {
        this.config = null;
    }

    initialize(config) {
        this.config = config;
        operationRouter.initialize(config);
    }

    async processIncomingData(data, serviceSocket) {
        const rawData = data.toString();
        const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

        for (const message of messages) {
            if (message.length < 10) continue;

            try {
                await this.processSingleMessage(message, serviceSocket);
            } catch (error) {
                console.error(`[${this.config.SERVICE_NAME_CODE}] Error procesando mensaje:`, error);
                const errorResponse = buildTransaction(this.config.SERVICE_CODE, `error;${error.message}`);
                serviceSocket.write(errorResponse);
            }
        }
    }

    async processSingleMessage(message, serviceSocket) {
        const parsed = parseResponse(message);

        // Ignorar mensajes sinit
        if (parsed.serviceName === 'sinit') return;

        // Verificar que el servicio sea correcto
        if (parsed.serviceName !== this.config.SERVICE_CODE) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `Servicio incorrecto`);
            serviceSocket.write(errorResponse);
            return;
        }

        const fields = parsed.data.split(';');
        const operation = fields[0];

        if (!operation) {
            const errorResponse = buildTransaction(this.config.SERVICE_CODE, `error;Operación no especificada`);
            serviceSocket.write(errorResponse);
            return;
        }

        await operationRouter.routeOperation(operation, fields, serviceSocket);
    }
}

module.exports = new MessageProcessor();