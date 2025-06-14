const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT } = require('../config/busConfig.js');

const COMPR_SERVICE_CODE = 'COMPR';

async function generateComprobante(tipoComprobante, idReferenciaOrigen, idCliente) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      // Validar tipo de comprobante
      const tiposValidos = ['CITA', 'ORDEN'];
      if (!tiposValidos.includes(tipoComprobante)) {
        reject(new Error('Tipo de comprobante debe ser CITA o ORDEN'));
        return;
      }

      const request = buildTransaction(COMPR_SERVICE_CODE, `generar;${tipoComprobante};${idReferenciaOrigen};${idCliente}`);
      console.log(`[EMPLEADO] Enviando solicitud de generación de comprobante: ${request}`);
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

          if (parsed.serviceName === COMPR_SERVICE_CODE && operation === 'generar') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Comprobante generado y enviado exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al generar comprobante'));
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

    // Timeout para el servicio de comprobantes (ya que es fire-and-forget)
    setTimeout(() => {
      resolve({ message: 'Solicitud de comprobante enviada (proceso asíncrono)', data: 'COMPROBANTE_PROCESANDO' });
      clientSocket.end();
    }, 3000);
  });
}

module.exports = { generateComprobante };