const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT } = require('../config/busConfig.js');

const HISTR_SERVICE_CODE = 'HISTR';

async function registerService(idMascota, idCitaOrigen, idsServiciosRealizados, fecha, comentarios = '') {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const serviciosStr = Array.isArray(idsServiciosRealizados) ? idsServiciosRealizados.join(',') : idsServiciosRealizados;
      const request = buildTransaction(HISTR_SERVICE_CODE, `registrar;${idMascota};${idCitaOrigen};${serviciosStr};${fecha};${comentarios}`);
      console.log(`[EMPLEADO] Enviando solicitud de registro de servicio: ${request}`);
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

          if (parsed.serviceName === HISTR_SERVICE_CODE && operation === 'registrar') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Servicio registrado en historial exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al registrar servicio en historial'));
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

async function getPetHistory(tokenSesionEmpleado, idMascota) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(HISTR_SERVICE_CODE, `obtener;${tokenSesionEmpleado};${idMascota}`);
      console.log(`[EMPLEADO] Enviando solicitud de historial de mascota: ${request}`);
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

          if (parsed.serviceName === HISTR_SERVICE_CODE && operation === 'obtener') {
            if (parsed.status === 'OK') {
              // Parsear el historial devuelto
              const historialData = fields.slice(1);
              const historial = historialData.map(entradaStr => {
                const [fecha, servicios, comentarios] = entradaStr.split(',');
                return { fecha, servicios, comentarios };
              });
              resolve({ message: 'Historial de mascota obtenido', data: historial });
            } else {
              reject(new Error(fields[1] || 'Error al obtener historial de mascota'));
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

module.exports = { registerService, getPetHistory };