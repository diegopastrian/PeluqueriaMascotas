const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const config = require('./config.js');
const { handleHorarios, handleCrear, handleModificar, handleCancelar, handleCancelarEmp, handleListar, handleListarAgenda, handleConfirmar } = require('./services/citas');
const express = require('express');

const serviceSocketToBus = new net.Socket();

function sendSinit(callback) {
  const sinitTransaction = buildTransaction('sinit', config.service.code);
  console.log(`[${config.service.name}] Enviando transacción de activación: ${sinitTransaction}`);
  serviceSocketToBus.write(sinitTransaction);

  const onData = (data) => {
    const response = data.toString();
    console.log(`[${config.service.name}] Respuesta SINIT recibida: ${response}`);
    try {
      const parsed = parseResponse(response);
      if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
        console.log(`[${config.service.name}] Servicio ${config.service.code} activado correctamente`);
        serviceSocketToBus.removeListener('data', onData);
        callback(null);
      } else {
        console.error(`[${config.service.name}] Fallo en SINIT: ${response}`);
        serviceSocketToBus.removeListener('data', onData);
        callback(new Error(`Fallo en SINIT ${config.service.code}: ${response}`));
      }
    } catch (error) {
      console.error(`[${config.service.name}] Error parseando SINIT: ${error.message}`);
      serviceSocketToBus.removeListener('data', onData);
      callback(error);
    }
  };

  serviceSocketToBus.on('data', onData);
}

serviceSocketToBus.connect(config.bus.port, config.bus.host, () => {
  console.log(`[${config.service.name}] Conectado al Bus en ${config.bus.host}:${config.bus.port}`);
  sendSinit((error) => {
    if (error) {
      console.error(`[${config.service.name}] Error durante la activación: ${error.message}`);
      serviceSocketToBus.destroy();
      return;
    }
    console.log(`[${config.service.name}] Listo para procesar transacciones`);
  });
});

serviceSocketToBus.on('data', async (data) => {
  const rawData = data.toString();
  const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

  for (const message of messages) {
    if (message.length < 10) continue;
    console.log(`[${config.service.name}] Recibido: ${message}`);

    let responseData = '';

    try {
      const parsed = parseResponse(message);

      if (parsed.serviceName === 'sinit') continue;

      if (parsed.serviceName !== config.service.code) {
        responseData = `Servicio incorrecto`;
        const errorResponse = buildTransaction(config.service.code, responseData);
        serviceSocketToBus.write(errorResponse);
        continue;
      }

      const fields = parsed.data.split(';');
      if (fields.length < 1) {
        responseData = `Formato inválido: Se espera operación`;
        const errorResponse = buildTransaction(config.service.code, responseData);
        serviceSocketToBus.write(errorResponse);
        continue;
      }

      const operation = fields[0];
      console.log(`[${config.service.name}] Procesando operación: ${operation} con datos: ${parsed.data}`);

      switch (operation) {
//todo lo encapsulado son operaciones pra clientes, lo demas es para empleados, para tenerlo en cuenta para c1
  //=============================================
        case 'horarios':
          responseData = await handleHorarios(fields);
          break;
        case 'crear':
          responseData = await handleCrear(fields);
          break;
        case 'modificar':
          responseData = await handleModificar(fields);
          break;
        case 'cancelar':
          responseData = await handleCancelar(fields);
          break;
        case 'listar':
          responseData = await handleListar(fields);
          break;
   //=======================================       
        case 'cancelarEmp':
          responseData = await handleCancelarEmp(fields);
          break;
        case 'listarAgenda':
          responseData = await handleListarAgenda(fields);
          break;
        case 'confirmar':
          responseData = await handleConfirmar(fields);
          break;
        default:
          responseData = `${operation};Operación desconocida`;
      }

      const response = buildTransaction(config.service.code, responseData);
      serviceSocketToBus.write(response);
    } catch (error) {
      console.error(`[${config.service.name}] Error general procesando mensaje: ${error.message}`);
      responseData = `error;${error.message}`;
      const errorResponse = buildTransaction(config.service.code, responseData);
      serviceSocketToBus.write(errorResponse);
    }
  }
});

serviceSocketToBus.on('close', () => {
  console.log(`[${config.service.name}] Conexión cerrada con el Bus.`);
});

serviceSocketToBus.on('error', (err) => {
  console.error(`[${config.service.name}] Error de conexión con el Bus: ${err.message}`);
});

const healthApp = express();
healthApp.get('/health', (req, res) => {
  res.status(200).send(`${config.service.name} service is active and connected to bus.`);
});
healthApp.listen(config.service.healthPort, () => {
});
