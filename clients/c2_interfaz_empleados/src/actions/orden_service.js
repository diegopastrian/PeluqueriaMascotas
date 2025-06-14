const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT } = require('../config/busConfig.js');

const ORDEN_SERVICE_CODE = 'ORDEN';

async function listOrders(clientId = null ) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();
console.log(clientId);
    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
let finalClientId = 'todas';
if (clientId !== undefined && clientId !== null && clientId !== '') {
    finalClientId = clientId;
}

const request = buildTransaction(ORDEN_SERVICE_CODE, `obtener_one_or_all;${finalClientId}`);   
console.log(`[EMPLEADO] Enviando solicitud de listar órdenes: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          //console.log(parsed);
          const fields = parsed.data.split(';');
          const operation = fields[0];
                       // console.log(fields);

          if (parsed.serviceName === ORDEN_SERVICE_CODE && operation === 'obtener_one_or_all') {
            if (parsed.status === 'OK' && !isNaN(fields[1]) ) {
              // Parsear las órdenes devueltas
              
              resolve({ message: 'Órdenes obtenidas exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al obtener órdenes'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function getOrderDetails(orderId) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(ORDEN_SERVICE_CODE, `obtener;detalle;${orderId}`);
      console.log(`[EMPLEADO] Enviando solicitud de detalles de orden: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];

          if (parsed.serviceName === ORDEN_SERVICE_CODE && operation === 'obtener') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Detalles de orden obtenidos', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al obtener detalles de la orden'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}

module.exports = { listOrders, getOrderDetails };