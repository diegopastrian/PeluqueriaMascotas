const net = require('net');
const { buildTransaction, parseResponse } = require('../../bus_service_helpers/transactionHelper');
const config = require('./config.js');
// Importamos todas las funciones del handler
const {
  handleHorarios,
  handleCrear,
  handleModificar,
  handleCancelar,
  handleCancelarEmp,
  handleListar,
  handleListarAgenda,
  handleConfirmar,
  handleVerDia,
} = require('./handlers/citas');

const serviceSocketToBus = new net.Socket();
let buffer = '';

function sendSinit(callback) {
  const sinitTransaction = buildTransaction('sinit', config.service.code);
  serviceSocketToBus.write(sinitTransaction);

  const onData = (data) => {
    const response = data.toString();
    try {
      const parsed = parseResponse(response);
      if (parsed.serviceName === 'sinit' && parsed.status === 'OK') {
        console.log(`[${config.service.name}] Servicio listo para procesar transacciones.`);
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
  sendSinit((error) => {
    if (error) {
      console.error(`[${config.service.name}] Error durante la activación: ${error.message}`);
      serviceSocketToBus.destroy();
      return;
    }
  });
});

/**
 * Procesa el buffer de datos para extraer y manejar mensajes completos.
 * Esto es crucial para manejar paquetes TCP fragmentados.
 */
async function processServerBuffer() {
  while (true) {
    const startIndex = buffer.search(/\d{5}[A-Z]{5}/);

    if (startIndex === -1) {
      return;
    }

    if (startIndex > 0) {
      console.warn(`[${config.service.name}] Datos corruptos descartados del buffer: ${buffer.substring(0, startIndex)}`);
      buffer = buffer.substring(startIndex);
    }

    if (buffer.length < 5) return;

    const messageLength = parseInt(buffer.substring(0, 5), 10);
    const totalLength = 5 + messageLength;

    if (buffer.length < totalLength) {
      return;
    }

    const message = buffer.substring(0, totalLength);
    buffer = buffer.substring(totalLength);

    // --- INICIO DE LA LÓGICA DE PROCESAMIENTO CORREGIDA ---
    console.log(`[${config.service.name}] Procesando mensaje completo: ${message.substring(0, 150)}...`);
    try {
      const parsed = parseResponse(message);
      if (parsed.serviceName === 'sinit') continue;
      if (parsed.serviceName !== config.service.code) continue;

      const fields = parsed.data.split(';');
      const operation = fields[0];
      let responseData = '';

      // --- Usamos un switch simple y directo, que es más seguro ---
      switch (operation) {
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
        case 'cancelarEmp':
          responseData = await handleCancelarEmp(fields);
          break;
        case 'listarAgenda':
          responseData = await handleListarAgenda(fields);
          break;
        case 'confirmar':
          responseData = await handleConfirmar(fields);
          break;
        case 'verdia':
          responseData = await handleVerDia(fields);
          break;
          // ...
        default:
          responseData = `${operation};Operación desconocida`;
      }

      serviceSocketToBus.write(buildTransaction(config.service.code, responseData));
    } catch (error) {
      console.error(`[${config.service.name}] Error procesando mensaje: ${error.message}`);
      serviceSocketToBus.write(buildTransaction(config.service.code, `error;${error.message}`));
    }
    // --- FIN DE LA LÓGICA DE PROCESAMIENTO ---
  }
}

serviceSocketToBus.on('data', (data) => {
  buffer += data.toString();
  processServerBuffer();
});


serviceSocketToBus.on('close', () => {
  console.log(`[${config.service.name}] Conexión cerrada con el Bus.`);
});

serviceSocketToBus.on('error', (err) => {
  console.error(`[${config.service.name}] Error de conexión con el Bus: ${err.message}`);
});


