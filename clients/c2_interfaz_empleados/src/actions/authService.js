const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT, SERVICE_CODE } = require('../config/busConfig.js');

async function registerEmployee({ nombre, apellido, email, password, telefono, rol }) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(SERVICE_CODE, `registrar_empleado;${nombre};${apellido};${email};${password};${telefono};${rol}`);
      console.log(`[ADMIN] Enviando solicitud de registro: ${request}`);
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

          if (parsed.serviceName === SERVICE_CODE && operation === 'registrar_empleado') {
            if (parsed.status === 'OK') {
              resolve({ id: fields[1], email: fields[2], message: 'Registro exitoso' });
            } else {
              reject(new Error(fields[1] || 'Error en el registro'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexion: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function loginEmployee({ email, password }) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(SERVICE_CODE, `login;${email};${password}`);
      console.log(`[ADMIN] Enviando solicitud de login: ${request}`);
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

          if (parsed.serviceName === SERVICE_CODE && operation === 'login') {
            if (parsed.status === 'OK' && fields[1] != 'Correo no encontrado') {
              resolve({ token: fields[1], id: fields[2], nombre: fields[3], message: 'Login exitoso' });
            } else {
              reject(new Error(fields[1] || 'Error en el login'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexion: ${err.message}`));
      clientSocket.end();
    });
  });
}

module.exports = { registerEmployee, loginEmployee };